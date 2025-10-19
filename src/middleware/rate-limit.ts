/**
 * レート制限ミドルウェア
 * Next.js App Router用のレート制限実装
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, RateLimiter, createRateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

/**
 * APIルートごとのレート制限設定
 */
const ROUTE_LIMITS: Record<string, RateLimiter> = {
  // 認証関連
  '/api/auth/client_login': rateLimiters.strict,
  '/api/auth/user_register': rateLimiters.strict,
  '/api/auth/user_login': rateLimiters.strict,
  
  // 検索
  '/api/search_themes': rateLimiters.search,
  
  // インタビュー関連
  '/api/interview_server': rateLimiters.interview,
  '/api/interview_stream': rateLimiters.interview,
  '/api/transcribe': rateLimiters.interview,
  
  // レポート生成（重い処理）
  '/api/report/individualReport': rateLimiters.report,
  '/api/report/summaryReport': rateLimiters.report,
  
  // テーマ作成
  '/api/create_theme': createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5分
    maxRequests: 10 // 5分あたり10件まで
  }),
  
  // インタビュー作成
  '/api/create_interview': createRateLimiter({
    windowMs: 60 * 1000, // 1分
    maxRequests: 20 // 1分あたり20件まで
  }),
  
  // Stripe Webhook（特別扱い）
  '/api/stripe_hooks': createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100, // Stripeからの正当なWebhookのため緩め
    skip: async (identifier) => {
      // Stripe IPアドレスからのリクエストはスキップ
      // 注: 実際のStripe IPレンジを使用すること
      const stripeIPs = [
        '3.18.12.63',
        '3.130.192.231',
        // ... 他のStripe IP
      ];
      return stripeIPs.includes(identifier);
    }
  }),
  
  // デフォルト
  'default': rateLimiters.standard
};

/**
 * ユーザー識別子を取得
 */
function getIdentifier(request: NextRequest): string {
  // 優先順位：
  // 1. 認証済みユーザーID（ヘッダーから）
  // 2. X-Forwarded-For（プロキシ経由のIP）
  // 3. X-Real-IP
  // 4. リクエストIP
  
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    // JWTトークンからユーザーIDを抽出（簡易版）
    // 実際にはトークンをデコードして取得
    const userId = extractUserIdFromToken(authHeader);
    if (userId) {
      return `user:${userId}`;
    }
  }
  
  // IPアドレスベース
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * トークンからユーザーIDを抽出（簡易実装）
 */
function extractUserIdFromToken(authHeader: string): string | null {
  try {
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    // JWTの簡易パース（実際にはライブラリを使用）
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    return decoded.uid || decoded.sub || null;
  } catch {
    return null;
  }
}

/**
 * レート制限を適用
 */
export async function applyRateLimit(
  request: NextRequest,
  pathname: string
): Promise<NextResponse | null> {
  try {
    // APIルート以外はスキップ
    if (!pathname.startsWith('/api/')) {
      return null;
    }
    
    // 健康チェックエンドポイントはスキップ
    if (pathname === '/api/health' || pathname === '/api/ping') {
      return null;
    }
    
    // 開発環境では警告のみ（ブロックしない）
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // ルートに対応するレート制限を取得
    const rateLimiter = ROUTE_LIMITS[pathname] || ROUTE_LIMITS['default'];
    
    // 識別子を取得
    const identifier = getIdentifier(request);
    
    // レート制限をチェック
    const result = await rateLimiter.check(identifier);
    
    // ヘッダーを準備
    const headers = new Headers({
      'X-RateLimit-Limit': result.count.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    });
    
    if (!result.allowed) {
      // レート制限に引っかかった
      logger.warn('Rate limit exceeded', {
        pathname,
        identifier,
        count: result.count,
        limit: rateLimiter['config'].maxRequests
      });
      
      if (isDevelopment) {
        // 開発環境では警告のみ
        logger.warn('Rate limit would be applied in production');
        return null;
      }
      
      // レート制限エラーレスポンス
      headers.set('Retry-After', Math.ceil((result.retryAfter || 0) / 1000).toString());
      
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'レート制限に達しました。しばらくしてから再度お試しください。',
          retryAfter: result.retryAfter,
          resetTime: result.resetTime
        }),
        {
          status: 429,
          headers
        }
      );
    }
    
    // レート制限情報をリクエストヘッダーに追加（後続処理で利用可能）
    request.headers.set('X-RateLimit-Identifier', identifier);
    request.headers.set('X-RateLimit-Count', result.count.toString());
    request.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    
    return null; // 制限なし、リクエストを続行
    
  } catch (error) {
    // エラー時は安全側に倒す（制限をかけない）
    logger.error('Rate limit middleware error', error as Error, { pathname });
    return null;
  }
}

/**
 * Next.js Middleware設定用エクスポート
 */
export const config = {
  matcher: [
    // APIルートのみに適用
    '/api/:path*',
    // 静的ファイルとNext.js内部ルートは除外
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};