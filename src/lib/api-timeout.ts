/**
 * APIタイムアウト処理ユーティリティ
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onTimeout?: () => void;
  onRetry?: (attempt: number) => void;
}

/**
 * タイムアウト付きfetch関数
 * @param url - リクエストURL
 * @param options - リクエストオプション（タイムアウト設定含む）
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 30000, // デフォルト30秒
    retries = 0,
    retryDelay = 1000,
    onTimeout,
    onRetry,
    ...fetchOptions
  } = options;

  const executeRequest = async (attempt: number = 0): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      onTimeout?.();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // AbortErrorの場合はタイムアウト
      if (error.name === 'AbortError') {
        if (attempt < retries) {
          onRetry?.(attempt + 1);
          // 指数バックオフ
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeRequest(attempt + 1);
        }
        throw new TimeoutError(`Request timeout after ${timeout}ms`, url, timeout);
      }

      // ネットワークエラーなどの場合もリトライ
      if (attempt < retries && isRetryableError(error)) {
        onRetry?.(attempt + 1);
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeRequest(attempt + 1);
      }

      throw error;
    }
  };

  return executeRequest();
}

/**
 * タイムアウトエラークラス
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly timeout: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * リトライ可能なエラーかどうかを判定
 */
function isRetryableError(error: any): boolean {
  // ネットワークエラーや一時的なエラーの場合はリトライ可能
  return (
    error.name === 'NetworkError' ||
    error.name === 'TypeError' || // fetchの失敗
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  );
}

/**
 * APIリクエストのタイムアウト設定プリセット
 */
export const API_TIMEOUTS = {
  SHORT: 5000,   // 5秒 - 簡単な操作
  MEDIUM: 15000, // 15秒 - 通常の操作
  LONG: 30000,   // 30秒 - 重い処理
  EXTRA_LONG: 60000 // 60秒 - 非常に重い処理
} as const;

/**
 * Promise.raceを使用したタイムアウト処理
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(
          timeoutMessage || `Operation timed out after ${timeoutMs}ms`,
          '',
          timeoutMs
        )),
        timeoutMs
      )
    )
  ]);
}

/**
 * 複数のAPIリクエストを並列実行（タイムアウト付き）
 */
export async function fetchAllWithTimeout(
  requests: Array<{
    url: string;
    options?: FetchWithTimeoutOptions;
  }>,
  globalTimeout?: number
): Promise<Response[]> {
  const promises = requests.map(({ url, options }) =>
    fetchWithTimeout(url, options)
  );

  if (globalTimeout) {
    return withTimeout(Promise.all(promises), globalTimeout);
  }

  return Promise.all(promises);
}

/**
 * APIエンドポイントのヘルスチェック
 */
export async function checkApiHealth(
  url: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'HEAD',
      timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}