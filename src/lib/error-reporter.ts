/**
 * エラー報告サービス
 * エラー情報を収集して外部サービスに送信（将来的な実装）
 */

import { logger } from './logger';

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  errorType: 'runtime' | 'network' | 'validation' | 'permission' | 'unknown';
  context?: Record<string, any>;
}

/**
 * エラーの種類を判定
 */
function getErrorType(error: Error): ErrorReport['errorType'] {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  if (name.includes('network') || message.includes('fetch')) {
    return 'network';
  }
  if (name.includes('validation') || message.includes('invalid')) {
    return 'validation';
  }
  if (name.includes('permission') || message.includes('denied')) {
    return 'permission';
  }
  if (name.includes('runtime') || name.includes('type')) {
    return 'runtime';
  }
  return 'unknown';
}

/**
 * エラー情報をサニタイズ
 */
function sanitizeErrorData(data: any): any {
  const sensitivePatterns = [
    /api[_-]?key/gi,
    /password/gi,
    /token/gi,
    /secret/gi,
    /credential/gi,
  ];

  if (typeof data === 'string') {
    let sanitized = data;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    return sanitized;
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeErrorData(data[key]);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * エラーレポートを作成
 */
export function createErrorReport(
  error: Error,
  context?: Record<string, any>,
  componentStack?: string
): ErrorReport {
  return {
    message: sanitizeErrorData(error.message),
    stack: error.stack ? sanitizeErrorData(error.stack) : undefined,
    componentStack: componentStack ? sanitizeErrorData(componentStack) : undefined,
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    timestamp: new Date().toISOString(),
    errorType: getErrorType(error),
    context: context ? sanitizeErrorData(context) : undefined,
  };
}

/**
 * エラーを報告
 */
export async function reportError(
  error: Error,
  context?: Record<string, any>,
  componentStack?: string
): Promise<void> {
  const report = createErrorReport(error, context, componentStack);

  // 開発環境ではコンソールに出力
  if (process.env.NODE_ENV === 'development') {
    logger.error('Error Report', error, report);
    return;
  }

  // 本番環境では外部サービスに送信
  if (process.env.NODE_ENV === 'production') {
    try {
      // TODO: 実際のエラートラッキングサービスに送信
      // await sendToErrorTrackingService(report);
      
      // 現在は最小限のログ出力のみ
      logger.error('Production Error', error, {
        type: report.errorType,
        url: report.url,
      });
    } catch (reportError) {
      // エラー報告自体が失敗した場合は無視
      logger.error('Failed to report error', reportError as Error);
    }
  }
}

/**
 * グローバルエラーハンドラーをセットアップ
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // 未処理のエラーをキャッチ
  window.addEventListener('error', (event) => {
    const error = new Error(event.message);
    error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
    reportError(error, {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // 未処理のPromiseリジェクションをキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    reportError(error, {
      type: 'unhandled_rejection',
      promise: event.promise,
    });
  });
}

/**
 * ネットワークエラーの特別処理
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public url?: string,
    public method?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * バリデーションエラーの特別処理
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 権限エラーの特別処理
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public permission?: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}