/**
 * 並列処理最適化モジュール
 * AI応答時間を削減するための並列実行機能
 */

import { logger } from './logger';

interface ParallelTask<T> {
  name: string;
  execute: () => Promise<T>;
  priority?: number;
  timeout?: number;
}

interface ParallelResult<T> {
  name: string;
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
}

/**
 * 並列処理エグゼキューター
 * 複数のタスクを効率的に並列実行
 */
export class ParallelProcessor {
  private readonly maxConcurrency: number;
  private readonly defaultTimeout: number;

  constructor(maxConcurrency = 5, defaultTimeout = 30000) {
    this.maxConcurrency = maxConcurrency;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * 複数のタスクを並列実行
   */
  async executeParallel<T>(
    tasks: ParallelTask<T>[]
  ): Promise<ParallelResult<T>[]> {
    const startTime = Date.now();
    
    // 優先度でソート
    const sortedTasks = [...tasks].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );

    const results: ParallelResult<T>[] = [];
    const executing: Promise<void>[] = [];

    for (const task of sortedTasks) {
      const promise = this.executeTask(task).then(result => {
        results.push(result);
      });

      executing.push(promise);

      // 同時実行数の制限
      if (executing.length >= this.maxConcurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => 
            p === promise || 
            (p as any).isFulfilled === true
          ), 
          1
        );
      }
    }

    // 残りのタスクを待機
    await Promise.all(executing);

    const totalDuration = Date.now() - startTime;
    logger.debug('並列処理完了', {
      taskCount: tasks.length,
      totalDuration,
      averageDuration: totalDuration / tasks.length
    });

    return results;
  }

  /**
   * 単一タスクの実行（タイムアウト付き）
   */
  private async executeTask<T>(
    task: ParallelTask<T>
  ): Promise<ParallelResult<T>> {
    const startTime = Date.now();
    const timeout = task.timeout || this.defaultTimeout;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), timeout);
      });

      const data = await Promise.race([
        task.execute(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      
      return {
        name: task.name,
        success: true,
        data,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`並列タスク失敗: ${task.name}`, error as Error);
      
      return {
        name: task.name,
        success: false,
        error: error as Error,
        duration
      };
    }
  }
}

/**
 * インタビュー応答の並列処理最適化
 */
export interface InterviewParallelTasks {
  audioGeneration: () => Promise<Buffer>;
  lipSyncGeneration: () => Promise<any>;
  emotionAnalysis?: () => Promise<any>;
  nextQuestionPrep?: () => Promise<string>;
}

export class InterviewParallelProcessor {
  private processor: ParallelProcessor;

  constructor() {
    this.processor = new ParallelProcessor(4, 20000);
  }

  /**
   * インタビュー応答の並列生成
   */
  async processInterviewResponse(
    tasks: InterviewParallelTasks
  ): Promise<{
    audio?: Buffer;
    lipSync?: any;
    emotion?: any;
    nextQuestion?: string;
  }> {
    const parallelTasks: ParallelTask<any>[] = [
      {
        name: 'audio',
        execute: tasks.audioGeneration,
        priority: 10
      },
      {
        name: 'lipSync',
        execute: tasks.lipSyncGeneration,
        priority: 9
      }
    ];

    if (tasks.emotionAnalysis) {
      parallelTasks.push({
        name: 'emotion',
        execute: tasks.emotionAnalysis,
        priority: 5
      });
    }

    if (tasks.nextQuestionPrep) {
      parallelTasks.push({
        name: 'nextQuestion',
        execute: tasks.nextQuestionPrep,
        priority: 3
      });
    }

    const results = await this.processor.executeParallel(parallelTasks);

    // 結果をマッピング
    const response: any = {};
    for (const result of results) {
      if (result.success) {
        response[result.name] = result.data;
      }
    }

    return response;
  }
}

/**
 * バッチ処理最適化
 */
export class BatchProcessor<T, R> {
  private queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private batchSize: number,
    private batchDelay: number,
    private processBatch: (items: T[]) => Promise<R[]>
  ) {}

  /**
   * アイテムをバッチキューに追加
   */
  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.scheduleBatch();
    });
  }

  /**
   * バッチ処理のスケジューリング
   */
  private scheduleBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    if (this.queue.length >= this.batchSize) {
      this.processPendingBatch();
    } else {
      this.timer = setTimeout(() => {
        this.processPendingBatch();
      }, this.batchDelay);
    }
  }

  /**
   * 保留中のバッチを処理
   */
  private async processPendingBatch() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const items = batch.map(b => b.item);
      const results = await this.processBatch(items);

      batch.forEach((b, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(b => {
        b.reject(error as Error);
      });
    } finally {
      this.processing = false;
      
      if (this.queue.length > 0) {
        this.scheduleBatch();
      }
    }
  }
}

/**
 * プリフェッチマネージャー
 * 予測的なリソース読み込み
 */
export class PrefetchManager {
  private prefetchQueue: Map<string, Promise<any>> = new Map();
  private prefetchResults: Map<string, any> = new Map();

  /**
   * リソースをプリフェッチ
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<void> {
    if (this.prefetchQueue.has(key) || this.prefetchResults.has(key)) {
      return;
    }

    const promise = fetcher()
      .then(result => {
        this.prefetchResults.set(key, result);
        this.prefetchQueue.delete(key);
        return result;
      })
      .catch(error => {
        logger.error(`プリフェッチ失敗: ${key}`, error);
        this.prefetchQueue.delete(key);
        throw error;
      });

    this.prefetchQueue.set(key, promise);
  }

  /**
   * プリフェッチされたリソースを取得
   */
  async get<T>(key: string): Promise<T | undefined> {
    // 既に結果がある場合
    if (this.prefetchResults.has(key)) {
      const result = this.prefetchResults.get(key);
      this.prefetchResults.delete(key);
      return result;
    }

    // プリフェッチ中の場合
    if (this.prefetchQueue.has(key)) {
      try {
        const result = await this.prefetchQueue.get(key);
        this.prefetchResults.delete(key);
        return result;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * プリフェッチをクリア
   */
  clear() {
    this.prefetchQueue.clear();
    this.prefetchResults.clear();
  }
}