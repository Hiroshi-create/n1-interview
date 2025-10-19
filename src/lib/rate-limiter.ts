/**
 * レート制限実装
 * Vercel KVを使用した分散環境対応のレート制限
 */

import { kv } from '@vercel/kv';
import { logger } from './logger';
import { ApplicationError } from './error-handler';

/**
 * レート制限設定
 */
export interface RateLimitConfig {
  /** ウィンドウサイズ（ミリ秒） */
  windowMs: number;
  /** ウィンドウ内の最大リクエスト数 */
  maxRequests: number;
  /** エラーメッセージ */
  message?: string;
  /** スキップ条件 */
  skip?: (identifier: string) => boolean | Promise<boolean>;
  /** キー生成関数 */
  keyGenerator?: (identifier: string) => string;
}

/**
 * レート制限結果
 */
export interface RateLimitResult {
  /** リクエストが許可されたか */
  allowed: boolean;
  /** 現在のリクエスト数 */
  count: number;
  /** 残りのリクエスト数 */
  remaining: number;
  /** リセット時刻（Unix timestamp） */
  resetTime: number;
  /** リトライまでの時間（ミリ秒） */
  retryAfter?: number;
}

/**
 * デフォルト設定
 */
export const DEFAULT_RATE_LIMITS = {
  /** 一般API用 */
  standard: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 60, // 1分あたり60リクエスト
  },
  /** 厳格なAPI用（認証、支払いなど） */
  strict: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 10, // 1分あたり10リクエスト
  },
  /** 検索API用 */
  search: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 30, // 1分あたり30リクエスト
  },
  /** インタビューAPI用 */
  interview: {
    windowMs: 60 * 1000, // 1分
    maxRequests: 100, // 1分あたり100リクエスト（リアルタイム通信のため多め）
  },
  /** レポート生成API用 */
  report: {
    windowMs: 5 * 60 * 1000, // 5分
    maxRequests: 5, // 5分あたり5リクエスト（重い処理のため）
  }
};

/**
 * メモリベースのフォールバック用ストア
 */
class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 定期的に期限切れエントリをクリーンアップ
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 60 * 1000); // 1分ごと

    // Node.jsプロセス終了時にクリーンアップ
    if (typeof process !== 'undefined') {
      process.on('exit', () => clearInterval(this.cleanupInterval));
    }
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const data = this.store.get(key);
    if (!data) return null;
    
    // 期限切れチェック
    if (data.resetTime < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return data;
  }

  async set(key: string, value: { count: number; resetTime: number }): Promise<void> {
    this.store.set(key, value);
  }

  async incr(key: string): Promise<number> {
    const data = this.store.get(key);
    if (data) {
      data.count++;
      return data.count;
    }
    return 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const data = this.store.get(key);
    if (data) {
      data.resetTime = Date.now() + (seconds * 1000);
    }
  }
}

/**
 * レート制限クラス
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private memoryStore: MemoryStore;
  private useKV: boolean = false;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      keyGenerator: (identifier) => `rate_limit:${identifier}`,
      ...config
    };
    
    this.memoryStore = new MemoryStore();
    
    // Vercel KVが利用可能かチェック
    this.checkKVAvailability();
  }

  /**
   * Vercel KVの利用可能性をチェック
   */
  private async checkKVAvailability(): Promise<void> {
    try {
      if (process.env.KV_URL && process.env.KV_REST_API_TOKEN) {
        // KVへの接続テスト
        await kv.ping();
        this.useKV = true;
        logger.debug('RateLimiter: Vercel KV is available');
      } else {
        logger.warn('RateLimiter: Vercel KV not configured, using memory store');
      }
    } catch (error) {
      logger.warn('RateLimiter: Cannot connect to Vercel KV, using memory store', { 
        error: (error as Error).message 
      });
      this.useKV = false;
    }
  }

  /**
   * レート制限をチェック
   */
  async check(identifier: string): Promise<RateLimitResult> {
    // スキップ条件のチェック
    if (this.config.skip) {
      const shouldSkip = await this.config.skip(identifier);
      if (shouldSkip) {
        return {
          allowed: true,
          count: 0,
          remaining: this.config.maxRequests,
          resetTime: Date.now() + this.config.windowMs
        };
      }
    }

    const key = this.config.keyGenerator!(identifier);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    try {
      if (this.useKV) {
        return await this.checkWithKV(key, now, resetTime);
      } else {
        return await this.checkWithMemory(key, now, resetTime);
      }
    } catch (error) {
      // エラー時は安全側に倒す（制限をかけない）
      logger.error('RateLimiter: Error checking rate limit', error as Error, { key });
      return {
        allowed: true,
        count: 0,
        remaining: this.config.maxRequests,
        resetTime
      };
    }
  }

  /**
   * Vercel KVを使用したレート制限チェック
   */
  private async checkWithKV(key: string, now: number, resetTime: number): Promise<RateLimitResult> {
    // スライディングウィンドウ方式で実装
    const windowStart = now - this.config.windowMs;
    
    // トランザクション的な処理
    const multi = kv.multi();
    
    // 古いエントリを削除
    multi.zremrangebyscore(key, '-inf', windowStart);
    
    // 現在のタイムスタンプを追加
    multi.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    
    // ウィンドウ内のカウントを取得
    multi.zcard(key);
    
    // TTLを設定
    multi.expire(key, Math.ceil(this.config.windowMs / 1000));
    
    const results = await multi.exec();
    const count = results[2] as number;
    
    const allowed = count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - count);
    
    return {
      allowed,
      count,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : this.config.windowMs
    };
  }

  /**
   * メモリストアを使用したレート制限チェック
   */
  private async checkWithMemory(key: string, now: number, resetTime: number): Promise<RateLimitResult> {
    let data = await this.memoryStore.get(key);
    
    if (!data || data.resetTime < now) {
      // 新しいウィンドウを開始
      data = { count: 1, resetTime };
      await this.memoryStore.set(key, data);
    } else {
      // 既存のウィンドウでカウントを増加
      data.count++;
      await this.memoryStore.set(key, data);
    }
    
    const allowed = data.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - data.count);
    
    return {
      allowed,
      count: data.count,
      remaining,
      resetTime: data.resetTime,
      retryAfter: allowed ? undefined : data.resetTime - now
    };
  }

  /**
   * レート制限エラーを生成
   */
  createError(result: RateLimitResult): ApplicationError {
    const retryAfterSeconds = Math.ceil((result.retryAfter || 0) / 1000);
    
    return new ApplicationError(
      429,
      this.config.message!,
      'RATE_LIMIT_EXCEEDED',
      {
        limit: this.config.maxRequests,
        remaining: result.remaining,
        resetTime: result.resetTime,
        retryAfter: retryAfterSeconds
      }
    );
  }

  /**
   * Express/Next.js用のミドルウェアを生成
   */
  middleware() {
    return async (req: any, res: any, next?: any) => {
      // IPアドレスまたはユーザーIDを識別子として使用
      const identifier = req.headers['x-forwarded-for'] || 
                       req.connection?.remoteAddress || 
                       req.ip ||
                       'unknown';
      
      const result = await this.check(identifier);
      
      // レート制限情報をヘッダーに追加
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);
      
      if (!result.allowed) {
        res.setHeader('Retry-After', Math.ceil((result.retryAfter || 0) / 1000));
        
        if (res.status && res.json) {
          // Next.js Response
          return res.status(429).json({
            error: this.config.message,
            retryAfter: result.retryAfter
          });
        } else if (next) {
          // Express middleware
          const error = this.createError(result);
          return next(error);
        }
      }
      
      if (next) {
        next();
      }
    };
  }
}

/**
 * プリセット済みレート制限インスタンス
 */
export const rateLimiters = {
  standard: new RateLimiter(DEFAULT_RATE_LIMITS.standard),
  strict: new RateLimiter(DEFAULT_RATE_LIMITS.strict),
  search: new RateLimiter(DEFAULT_RATE_LIMITS.search),
  interview: new RateLimiter(DEFAULT_RATE_LIMITS.interview),
  report: new RateLimiter(DEFAULT_RATE_LIMITS.report)
};

/**
 * カスタムレート制限を作成
 */
export function createRateLimiter(config: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter({
    ...DEFAULT_RATE_LIMITS.standard,
    ...config
  });
}