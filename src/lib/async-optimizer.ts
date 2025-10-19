/**
 * 非同期処理最適化ユーティリティ
 * 依存関係を保持しながら並列処理を実現
 */

import { logger } from './logger';

/**
 * タスクの依存関係を定義
 */
interface TaskDependency {
  id: string;
  dependencies: string[];
  task: () => Promise<any>;
  result?: any;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  error?: Error;
}

/**
 * 並列実行オプション
 */
interface ParallelOptions {
  maxConcurrency?: number;
  timeout?: number;
  retryOnFailure?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * 依存関係を考慮したタスク実行
 */
export class DependencyExecutor {
  private tasks: Map<string, TaskDependency> = new Map();
  private executing: Set<string> = new Set();
  
  /**
   * タスクを追加
   */
  addTask(id: string, task: () => Promise<any>, dependencies: string[] = []): void {
    if (this.tasks.has(id)) {
      throw new Error(`Task with id "${id}" already exists`);
    }
    
    this.tasks.set(id, {
      id,
      dependencies,
      task,
      status: 'pending'
    });
  }
  
  /**
   * すべてのタスクを実行
   */
  async execute(options: ParallelOptions = {}): Promise<Map<string, any>> {
    const { 
      maxConcurrency = 5, 
      timeout = 30000, 
      retryOnFailure = false,
      onProgress 
    } = options;
    
    const results = new Map<string, any>();
    const totalTasks = this.tasks.size;
    let completedTasks = 0;
    
    // タスクの実行順序を解決
    const executionOrder = this.resolveExecutionOrder();
    
    logger.debug('Dependency execution started', { 
      totalTasks, 
      maxConcurrency,
      executionOrder 
    });
    
    // 並列実行可能なタスクのバッチを作成
    const batches = this.createBatches(executionOrder);
    
    // バッチごとに実行
    for (const batch of batches) {
      const batchPromises = batch.map(async (taskId) => {
        const task = this.tasks.get(taskId)!;
        task.status = 'running';
        
        try {
          // タイムアウト付きで実行
          const promise = task.task();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Task ${taskId} timed out`)), timeout);
          });
          
          task.result = await Promise.race([promise, timeoutPromise]);
          task.status = 'completed';
          results.set(taskId, task.result);
          completedTasks++;
          
          if (onProgress) {
            onProgress(completedTasks, totalTasks);
          }
          
          logger.debug(`Task completed: ${taskId}`);
        } catch (error) {
          task.status = 'failed';
          task.error = error as Error;
          
          if (retryOnFailure) {
            logger.warn(`Task failed, retrying: ${taskId}`, { error });
            try {
              task.result = await task.task();
              task.status = 'completed';
              results.set(taskId, task.result);
              completedTasks++;
            } catch (retryError) {
              logger.error(`Task retry failed: ${taskId}`, retryError as Error);
              throw retryError;
            }
          } else {
            throw error;
          }
        }
      });
      
      // バッチ内のタスクを並列実行
      await Promise.all(batchPromises);
    }
    
    logger.info('Dependency execution completed', { 
      completedTasks, 
      totalTasks 
    });
    
    return results;
  }
  
  /**
   * 実行順序を解決（トポロジカルソート）
   */
  private resolveExecutionOrder(): string[] {
    const visited = new Set<string>();
    const stack: string[] = [];
    
    const visit = (taskId: string) => {
      if (visited.has(taskId)) {
        return;
      }
      
      visited.add(taskId);
      const task = this.tasks.get(taskId);
      
      if (task) {
        for (const dep of task.dependencies) {
          if (!visited.has(dep)) {
            visit(dep);
          }
        }
        stack.push(taskId);
      }
    };
    
    for (const taskId of this.tasks.keys()) {
      visit(taskId);
    }
    
    return stack;
  }
  
  /**
   * 並列実行可能なバッチを作成
   */
  private createBatches(executionOrder: string[]): string[][] {
    const batches: string[][] = [];
    const completed = new Set<string>();
    const remaining = [...executionOrder];
    
    while (remaining.length > 0) {
      const batch: string[] = [];
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const taskId = remaining[i];
        const task = this.tasks.get(taskId)!;
        
        // 依存関係がすべて完了している場合
        if (task.dependencies.every(dep => completed.has(dep))) {
          batch.push(taskId);
          remaining.splice(i, 1);
        }
      }
      
      if (batch.length > 0) {
        batches.push(batch);
        batch.forEach(taskId => completed.add(taskId));
      } else if (remaining.length > 0) {
        // 循環依存の検出
        throw new Error('Circular dependency detected');
      }
    }
    
    return batches;
  }
}

/**
 * 並列処理ヘルパー関数
 */
export async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  maxConcurrency: number = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const promise = mapper(items[i], i).then(result => {
      results[i] = result;
    });
    
    executing.push(promise);
    
    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
      // 完了したPromiseを削除
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }
  
  await Promise.all(executing);
  return results;
}

/**
 * バッチ処理ヘルパー
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 処理パイプライン
 */
export class ProcessingPipeline<T> {
  private stages: Array<(input: T) => Promise<T>> = [];
  
  /**
   * パイプラインステージを追加
   */
  addStage(processor: (input: T) => Promise<T>): this {
    this.stages.push(processor);
    return this;
  }
  
  /**
   * パイプラインを実行
   */
  async execute(input: T): Promise<T> {
    let result = input;
    
    for (const stage of this.stages) {
      result = await stage(result);
    }
    
    return result;
  }
  
  /**
   * 並列パイプライン実行
   */
  async executeParallel(inputs: T[], maxConcurrency: number = 5): Promise<T[]> {
    return parallelMap(inputs, (input) => this.execute(input), maxConcurrency);
  }
}

/**
 * インタビュー処理の最適化例
 */
export class OptimizedInterviewProcessor {
  /**
   * メッセージ処理の並列化（依存関係を保持）
   */
  async processInterviewMessages(
    messages: any[],
    options: {
      generateAudio: boolean;
      generateLipSync: boolean;
      analyzeEmotion: boolean;
    }
  ): Promise<any[]> {
    const executor = new DependencyExecutor();
    const results: any[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageId = `message-${i}`;
      
      // テキスト処理（依存なし）
      executor.addTask(
        `${messageId}-text`,
        async () => this.processText(message.text),
        []
      );
      
      if (options.generateAudio) {
        // 音声生成（テキスト処理に依存）
        executor.addTask(
          `${messageId}-audio`,
          async () => this.generateAudio(message.text),
          [`${messageId}-text`]
        );
        
        if (options.generateLipSync) {
          // リップシンク生成（音声生成に依存）
          executor.addTask(
            `${messageId}-lipsync`,
            async () => this.generateLipSync(message.text),
            [`${messageId}-audio`]
          );
        }
      }
      
      if (options.analyzeEmotion) {
        // 感情分析（テキスト処理に依存）
        executor.addTask(
          `${messageId}-emotion`,
          async () => this.analyzeEmotion(message.text),
          [`${messageId}-text`]
        );
      }
    }
    
    // すべてのタスクを並列実行（依存関係を考慮）
    const executionResults = await executor.execute({
      maxConcurrency: 3,
      timeout: 30000,
      onProgress: (completed, total) => {
        logger.debug(`Processing progress: ${completed}/${total}`);
      }
    });
    
    // 結果を整理
    for (let i = 0; i < messages.length; i++) {
      const messageId = `message-${i}`;
      results.push({
        text: executionResults.get(`${messageId}-text`),
        audio: executionResults.get(`${messageId}-audio`),
        lipsync: executionResults.get(`${messageId}-lipsync`),
        emotion: executionResults.get(`${messageId}-emotion`)
      });
    }
    
    return results;
  }
  
  private async processText(text: string): Promise<string> {
    // テキスト処理のシミュレーション
    await new Promise(resolve => setTimeout(resolve, 100));
    return text.toUpperCase();
  }
  
  private async generateAudio(text: string): Promise<Buffer> {
    // 音声生成のシミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    return Buffer.from(text);
  }
  
  private async generateLipSync(text: string): Promise<any> {
    // リップシンク生成のシミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    return { mouthCues: [], blinkCues: [], emotionCues: [] };
  }
  
  private async analyzeEmotion(text: string): Promise<string> {
    // 感情分析のシミュレーション
    await new Promise(resolve => setTimeout(resolve, 200));
    return 'neutral';
  }
}

/**
 * メモリ効率的な大量データ処理
 */
export async function* streamProcessor<T, R>(
  items: AsyncIterable<T> | Iterable<T>,
  processor: (item: T) => Promise<R>,
  bufferSize: number = 10
): AsyncGenerator<R> {
  const buffer: Promise<R>[] = [];
  
  for await (const item of items) {
    buffer.push(processor(item));
    
    if (buffer.length >= bufferSize) {
      yield await buffer.shift()!;
    }
  }
  
  // 残りのバッファを処理
  while (buffer.length > 0) {
    yield await buffer.shift()!;
  }
}