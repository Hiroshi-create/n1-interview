/**
 * ストリーミングレスポンス実装
 * リアルタイムデータ転送とプログレッシブレンダリング
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Server-Sent Events (SSE) レスポンスを作成
 */
export function createSSEResponse() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      logger.debug('SSE stream cancelled');
    }
  });
  
  const send = (data: any, event?: string, id?: string) => {
    let message = '';
    
    if (id) {
      message += `id: ${id}\n`;
    }
    
    if (event) {
      message += `event: ${event}\n`;
    }
    
    if (typeof data === 'object') {
      message += `data: ${JSON.stringify(data)}\n\n`;
    } else {
      message += `data: ${data}\n\n`;
    }
    
    try {
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      logger.error('SSE send error', error as Error);
    }
  };
  
  const close = () => {
    try {
      controller.close();
    } catch (error) {
      logger.error('SSE close error', error as Error);
    }
  };
  
  const response = new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginxバッファリング無効化
    }
  });
  
  return { response, send, close };
}

/**
 * ストリーミングJSONレスポンス
 */
export function createStreamingJSONResponse() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  let isFirst = true;
  
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      // JSON配列の開始
      controller.enqueue(encoder.encode('['));
    },
    cancel() {
      logger.debug('Streaming JSON cancelled');
    }
  });
  
  const send = (data: any) => {
    try {
      const prefix = isFirst ? '' : ',';
      const chunk = `${prefix}${JSON.stringify(data)}`;
      controller.enqueue(encoder.encode(chunk));
      isFirst = false;
    } catch (error) {
      logger.error('Streaming JSON send error', error as Error);
    }
  };
  
  const close = () => {
    try {
      // JSON配列の終了
      controller.enqueue(encoder.encode(']'));
      controller.close();
    } catch (error) {
      logger.error('Streaming JSON close error', error as Error);
    }
  };
  
  const response = new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    }
  });
  
  return { response, send, close };
}

/**
 * インタビューストリーミングレスポンス
 */
export class InterviewStreamingResponse {
  private encoder = new TextEncoder();
  private controller?: ReadableStreamDefaultController;
  private stream: ReadableStream;
  
  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
        this.sendEvent('start', { timestamp: Date.now() });
      },
      cancel: () => {
        logger.debug('Interview stream cancelled');
      }
    });
  }
  
  /**
   * イベントを送信
   */
  sendEvent(type: string, data: any) {
    if (!this.controller) {
      logger.error('Stream controller not initialized');
      return;
    }
    
    const event = {
      type,
      data,
      timestamp: Date.now()
    };
    
    const message = `data: ${JSON.stringify(event)}\n\n`;
    
    try {
      this.controller.enqueue(this.encoder.encode(message));
    } catch (error) {
      logger.error('Stream send error', error as Error);
    }
  }
  
  /**
   * 音声データをチャンク送信
   */
  async sendAudioChunk(chunk: Buffer, metadata?: any) {
    this.sendEvent('audio-chunk', {
      audio: chunk.toString('base64'),
      size: chunk.length,
      ...metadata
    });
  }
  
  /**
   * リップシンクデータを送信
   */
  sendLipSyncData(lipSync: any) {
    this.sendEvent('lipsync', lipSync);
  }
  
  /**
   * テキスト応答を送信
   */
  sendTextResponse(text: string, isFinal: boolean = false) {
    this.sendEvent('text', {
      content: text,
      isFinal
    });
  }
  
  /**
   * プログレス情報を送信
   */
  sendProgress(current: number, total: number, message?: string) {
    this.sendEvent('progress', {
      current,
      total,
      percentage: Math.round((current / total) * 100),
      message
    });
  }
  
  /**
   * エラーを送信
   */
  sendError(error: string, code?: string) {
    this.sendEvent('error', {
      message: error,
      code
    });
  }
  
  /**
   * ストリームを終了
   */
  close(reason?: string) {
    this.sendEvent('end', { reason });
    
    if (this.controller) {
      try {
        this.controller.close();
      } catch (error) {
        logger.error('Stream close error', error as Error);
      }
    }
  }
  
  /**
   * レスポンスを取得
   */
  getResponse(): NextResponse {
    return new NextResponse(this.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    });
  }
}

/**
 * チャンク処理ヘルパー
 */
export class ChunkProcessor<T> {
  private buffer: T[] = [];
  private readonly chunkSize: number;
  private readonly processor: (chunk: T[]) => Promise<void>;
  private processing = false;
  
  constructor(
    chunkSize: number,
    processor: (chunk: T[]) => Promise<void>
  ) {
    this.chunkSize = chunkSize;
    this.processor = processor;
  }
  
  /**
   * アイテムを追加
   */
  async add(item: T): Promise<void> {
    this.buffer.push(item);
    
    if (this.buffer.length >= this.chunkSize && !this.processing) {
      await this.flush();
    }
  }
  
  /**
   * バッファをフラッシュ
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.processing) {
      return;
    }
    
    this.processing = true;
    const chunk = this.buffer.splice(0, this.chunkSize);
    
    try {
      await this.processor(chunk);
    } catch (error) {
      logger.error('Chunk processing error', error as Error);
      // エラー時はチャンクを戻す
      this.buffer.unshift(...chunk);
      throw error;
    } finally {
      this.processing = false;
    }
    
    // 残りのバッファがある場合は続けて処理
    if (this.buffer.length >= this.chunkSize) {
      await this.flush();
    }
  }
  
  /**
   * 残りすべてを処理
   */
  async finalize(): Promise<void> {
    while (this.buffer.length > 0) {
      const chunk = this.buffer.splice(0, Math.min(this.chunkSize, this.buffer.length));
      await this.processor(chunk);
    }
  }
}

/**
 * プログレッシブレスポンスビルダー
 */
export class ProgressiveResponseBuilder {
  private parts: any[] = [];
  private metadata: any = {};
  
  /**
   * パートを追加
   */
  addPart(key: string, value: any, priority: number = 0) {
    this.parts.push({ key, value, priority });
    this.parts.sort((a, b) => b.priority - a.priority);
    return this;
  }
  
  /**
   * メタデータを設定
   */
  setMetadata(key: string, value: any) {
    this.metadata[key] = value;
    return this;
  }
  
  /**
   * ストリーミングレスポンスを生成
   */
  async* generateStream(): AsyncGenerator<any> {
    // 高優先度のパートから順に生成
    for (const part of this.parts) {
      yield {
        type: 'partial',
        key: part.key,
        value: part.value,
        metadata: this.metadata
      };
      
      // UIの更新時間を与える
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // 完了通知
    yield {
      type: 'complete',
      metadata: this.metadata
    };
  }
  
  /**
   * 一括レスポンスを生成
   */
  build(): any {
    const result: any = {};
    
    for (const part of this.parts) {
      result[part.key] = part.value;
    }
    
    return {
      ...result,
      _metadata: this.metadata
    };
  }
}

/**
 * SSEストリーマークラス（互換性のため追加）
 */
export class SSEStreamer {
  private encoder = new TextEncoder();
  private controller?: ReadableStreamDefaultController;
  private stream: ReadableStream;
  
  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        logger.debug('SSE stream cancelled');
      }
    });
  }
  
  send(data: any, event?: string) {
    if (!this.controller) return;
    
    let message = '';
    if (event) message += `event: ${event}\n`;
    message += `data: ${typeof data === 'object' ? JSON.stringify(data) : data}\n\n`;
    
    try {
      this.controller.enqueue(this.encoder.encode(message));
    } catch (error) {
      logger.error('SSE send error', error as Error);
    }
  }

  /**
   * Server-Sent Eventsフォーマットでメッセージを生成
   */
  formatSSE(data: any, event?: string, id?: string): string {
    let message = '';
    
    if (id) {
      message += `id: ${id}\n`;
    }
    
    if (event) {
      message += `event: ${event}\n`;
    }
    
    if (typeof data === 'object') {
      message += `data: ${JSON.stringify(data)}\n\n`;
    } else {
      message += `data: ${data}\n\n`;
    }
    
    return message;
  }
  
  close() {
    if (this.controller) {
      try {
        this.controller.close();
      } catch (error) {
        logger.error('SSE close error', error as Error);
      }
    }
  }
  
  getResponse(): NextResponse {
    return new NextResponse(this.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    });
  }
}

/**
 * リアルタイムメッセージストリーム
 */
export class MessageStream {
  private messages: any[] = [];
  private subscribers: Set<(message: any) => void> = new Set();
  
  /**
   * メッセージを追加
   */
  push(message: any) {
    this.messages.push(message);
    this.notifySubscribers(message);
  }
  
  /**
   * サブスクライバーを追加
   */
  subscribe(callback: (message: any) => void) {
    this.subscribers.add(callback);
    
    // 既存のメッセージを送信
    this.messages.forEach(msg => callback(msg));
    
    // アンサブスクライブ関数を返す
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  /**
   * サブスクライバーに通知
   */
  private notifySubscribers(message: any) {
    this.subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        logger.error('Subscriber notification error', error as Error);
      }
    });
  }
  
  /**
   * ストリームをクリア
   */
  clear() {
    this.messages = [];
  }
}