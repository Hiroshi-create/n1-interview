/**
 * 統一ログ管理システム
 * セキュアで環境に応じたログ出力を提供
 */

interface LogMeta {
  [key: string]: any;
}

// センシティブなデータキーのリスト
const SENSITIVE_KEYS = [
  'password',
  'token',
  'apiKey',
  'privateKey',
  'secret',
  'authorization',
  'auth',
  'key',
  'credential',
  'firebase'
];

/**
 * ログデータからセンシティブな情報を除去
 */
function sanitizeLogData(data: LogMeta): LogMeta {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
      lowerKey.includes(sensitiveKey)
    );
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key] as LogMeta);
    }
  });
  
  return sanitized;
}

/**
 * 統一ログシステム
 */
export const logger = {
  /**
   * 情報ログ（開発環境のみ）
   */
  info: (message: string, meta?: LogMeta) => {
    if (process.env.NODE_ENV === 'development') {
      const sanitizedMeta = meta ? sanitizeLogData(meta) : {};
      console.log(`[INFO] ${message}`, sanitizedMeta);
    }
  },

  /**
   * 警告ログ
   */
  warn: (message: string, meta?: LogMeta) => {
    const sanitizedMeta = meta ? sanitizeLogData(meta) : {};
    console.warn(`[WARN] ${message}`, sanitizedMeta);
  },

  /**
   * エラーログ（本番環境でも記録、ただしセンシティブ情報は除外）
   */
  error: (message: string, error?: Error, meta?: LogMeta) => {
    const sanitizedMeta = meta ? sanitizeLogData(meta) : {};
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      // スタックトレースは開発環境のみ
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    } : {};

    console.error(`[ERROR] ${message}`, {
      error: errorInfo,
      ...sanitizedMeta
    });
  },

  /**
   * デバッグログ（開発環境のみ）
   */
  debug: (message: string, meta?: LogMeta) => {
    if (process.env.NODE_ENV === 'development') {
      const sanitizedMeta = meta ? sanitizeLogData(meta) : {};
      console.debug(`[DEBUG] ${message}`, sanitizedMeta);
    }
  },

  /**
   * API アクセスログ
   */
  api: (method: string, path: string, statusCode: number, duration?: number, meta?: LogMeta) => {
    const sanitizedMeta = meta ? sanitizeLogData(meta) : {};
    const logLevel = statusCode >= 400 ? 'error' : 'info';
    
    const logMessage = `API ${method} ${path} - ${statusCode}${duration ? ` (${duration}ms)` : ''}`;
    
    if (logLevel === 'error') {
      console.error(`[API ERROR] ${logMessage}`, sanitizedMeta);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${logMessage}`, sanitizedMeta);
    }
  }
};

/**
 * API ルート用のログ装飾関数
 */
export function withApiLogging<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  routeName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      logger.debug(`API ${routeName} started`);
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      logger.api('POST', routeName, 200, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`API ${routeName} failed`, error as Error);
      logger.api('POST', routeName, 500, duration);
      throw error;
    }
  };
}