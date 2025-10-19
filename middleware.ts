/**
 * Next.js Middleware
 * APIルートにレート制限を適用
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/src/middleware/rate-limit';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // APIルートの場合のみレート制限を適用
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await applyRateLimit(request, pathname);
    
    if (rateLimitResponse) {
      // レート制限に引っかかった場合
      return rateLimitResponse;
    }
  }
  
  // その他のミドルウェア処理
  // CORS、認証など
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // APIルートに適用
    '/api/:path*',
    // 必要に応じて他のパスも追加
  ]
};