/**
 * Console.log オーバーライドユーティリティ
 * 本番環境でconsole.logを無効化し、開発環境でのみ有効化
 */

import { logger } from './logger';

// オリジナルのconsoleメソッドを保存
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
  info: console.info,
};

/**
 * console.logを環境に応じてオーバーライド
 */
export function overrideConsole() {
  if (typeof window === 'undefined') {
    // サーバーサイドでは実行しない
    return;
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // 本番環境では console.log を完全に無効化
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    
    // warn と error は logger 経由で制御
    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      logger.warn(message);
    };
    
    console.error = (...args: any[]) => {
      const message = args[0] || 'Unknown error';
      const error = args[1] instanceof Error ? args[1] : undefined;
      logger.error(String(message), error);
    };
  } else if (isDevelopment) {
    // 開発環境では追加情報を付与
    console.log = (...args: any[]) => {
      const stack = new Error().stack;
      const caller = stack?.split('\n')[2]?.trim() || 'unknown';
      originalConsole.log(`[DEV]`, ...args, `\n📍 ${caller}`);
    };
  }
}

/**
 * コンソールを元の状態に戻す
 */
export function restoreConsole() {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
}

/**
 * 条件付きログ出力
 */
export const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    originalConsole.log('[DEV]', ...args);
  }
};

/**
 * パフォーマンス測定用ログ（開発環境のみ）
 */
export const perfLog = {
  start: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-start`);
    }
  },
  end: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-end`);
      try {
        performance.measure(label, `${label}-start`, `${label}-end`);
        const measure = performance.getEntriesByName(label)[0];
        if (measure) {
          originalConsole.log(`⏱️ [PERF] ${label}: ${measure.duration.toFixed(2)}ms`);
        }
      } catch (e) {
        // 測定に失敗した場合は無視
      }
    }
  }
};

/**
 * グループ化されたログ（開発環境のみ）
 */
export const groupLog = {
  start: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      originalConsole.group(`📦 ${label}`);
    }
  },
  end: () => {
    if (process.env.NODE_ENV === 'development') {
      originalConsole.groupEnd();
    }
  }
};