/**
 * 高度なエラーハンドリングシステム
 * リトライ機構、サーキットブレーカー、タイムアウト管理を提供
 */

import { logger } from './logger';

/**
 * カスタムエラークラスの拡張
 */
export class ApplicationError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any,
    public isOperational: boolean = true,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApplicationError';
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details, true, false);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(401, message, 'AUTH_ERROR', details, true, false);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Access denied', details?: any) {
    super(403, message, 'AUTHORIZATION_ERROR', details, true, false);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, details?: any) {
    super(404, `${resource} not found`, 'NOT_FOUND', details, true, false);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(409, message, 'CONFLICT', details, true, false);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(429, message, 'RATE_LIMIT', details, true, true);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, originalError?: any) {
    super(503, `External service error: ${service}`, 'EXTERNAL_SERVICE_ERROR', originalError, true, true);
    this.name = 'ExternalServiceError';
  }
}

/**
 * リトライ設定
 */
interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['EXTERNAL_SERVICE_ERROR', 'RATE_LIMIT', 'TIMEOUT'],
};

/**
 * 指数バックオフによるリトライ機構
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // リトライ可能なエラーかチェック
      const isRetryable = error instanceof ApplicationError && error.isRetryable;
      const isRetryableCode = opts.retryableErrors?.some(code => 
        (error as any).code === code || (error as any).message?.includes(code)
      );
      
      if (!isRetryable && !isRetryableCode) {
        throw error;
      }
      
      if (attempt < opts.maxAttempts) {
        const delay = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
          opts.maxDelay
        );
        
        logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts}`, {
          error: lastError.message,
          delay,
          function: fn.name || 'anonymous'
        });
        
        if (opts.onRetry) {
          opts.onRetry(attempt, lastError);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * サーキットブレーカーパターン
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1分
    private readonly resetTimeout: number = 30000 // 30秒
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // サーキットが開いている場合
    if (this.state === 'OPEN') {
      const now = new Date();
      const timeSinceLastFailure = this.lastFailureTime 
        ? now.getTime() - this.lastFailureTime.getTime()
        : 0;
      
      if (timeSinceLastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker: HALF_OPEN state');
      } else {
        throw new ExternalServiceError('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      
      // 成功した場合
      if (this.state === 'HALF_OPEN') {
        this.reset();
        logger.info('Circuit breaker: Reset to CLOSED');
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      
      if (this.failureCount >= this.threshold) {
        this.trip();
      }
      
      throw error;
    }
  }
  
  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();
  }
  
  private trip() {
    this.state = 'OPEN';
    logger.error('Circuit breaker: Tripped to OPEN', undefined, {
      failureCount: this.failureCount,
      threshold: this.threshold
    });
  }
  
  private reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = undefined;
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * タイムアウト処理
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new ApplicationError(
        408,
        errorMessage || `Operation timed out after ${timeoutMs}ms`,
        'TIMEOUT',
        undefined,
        true,
        true
      ));
    }, timeoutMs);
    
    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * バッチエラーハンドリング
 */
export async function handleBatch<T>(
  items: T[],
  handler: (item: T) => Promise<void>,
  options: {
    concurrency?: number;
    stopOnError?: boolean;
    onError?: (error: Error, item: T) => void;
  } = {}
): Promise<{ successful: T[]; failed: Array<{ item: T; error: Error }> }> {
  const { concurrency = 5, stopOnError = false, onError } = options;
  const successful: T[] = [];
  const failed: Array<{ item: T; error: Error }> = [];
  
  // バッチ処理用のキューを作成
  const queue = [...items];
  const processing = new Set<Promise<void>>();
  
  while (queue.length > 0 || processing.size > 0) {
    // 並行処理数の制限
    while (processing.size < concurrency && queue.length > 0) {
      const item = queue.shift()!;
      
      const promise = handler(item)
        .then(() => {
          successful.push(item);
        })
        .catch((error: Error) => {
          failed.push({ item, error });
          
          if (onError) {
            onError(error, item);
          }
          
          if (stopOnError) {
            throw error;
          }
        })
        .finally(() => {
          processing.delete(promise);
        });
      
      processing.add(promise);
    }
    
    // 処理中のPromiseを待つ
    if (processing.size > 0) {
      await Promise.race(processing);
    }
  }
  
  return { successful, failed };
}

/**
 * エラー集約
 */
export class AggregateError extends ApplicationError {
  constructor(
    public errors: Error[],
    message?: string
  ) {
    super(
      500,
      message || `Multiple errors occurred (${errors.length} errors)`,
      'AGGREGATE_ERROR',
      errors.map(e => ({ message: e.message, stack: e.stack })),
      true,
      false
    );
    this.name = 'AggregateError';
  }
}

/**
 * グローバルエラーハンドラー（Next.js API Routes用）
 */
export function createErrorHandler(context: string) {
  return (error: unknown) => {
    // ApplicationErrorの場合
    if (error instanceof ApplicationError) {
      logger.error(`${context}: ${error.message}`, error, {
        code: error.code,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        details: error.details
      });
      
      return {
        error: error.message,
        code: error.code,
        details: error.isOperational ? error.details : undefined,
        statusCode: error.statusCode
      };
    }
    
    // その他のエラー
    const err = error as Error;
    logger.error(`${context}: Unexpected error`, err);
    
    return {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    };
  };
}