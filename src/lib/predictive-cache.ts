/**
 * 予測的キャッシュシステム
 * 頻繁に使用される応答を事前に準備
 */

import { logger } from './logger';
import { audioCache, lipSyncCache } from './lru-cache';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * 共通応答パターン
 */
const COMMON_RESPONSES = {
  greetings: [
    'インタビューを始めます。まずはあなたの基本的なプロフィールについて教えてください。',
    'こんにちは。本日はインタビューにご協力いただき、ありがとうございます。',
    'それでは、インタビューを開始させていただきます。'
  ],
  transitions: [
    '次の質問に移らせていただきます。',
    'ありがとうございます。それでは次の質問です。',
    'なるほど、興味深いご意見ですね。続けてお聞きしますが、'
  ],
  clarifications: [
    'もう少し詳しく教えていただけますか？',
    '具体的にはどのような点でしょうか？',
    'その理由を教えていただけますか？'
  ],
  acknowledgments: [
    'ご回答ありがとうございます。',
    'なるほど、よく分かりました。',
    '貴重なご意見をありがとうございます。'
  ],
  endings: [
    'インタビューにご協力いただき、ありがとうございました。',
    '本日は貴重なお時間をいただき、ありがとうございました。',
    'これでインタビューを終了させていただきます。ありがとうございました。'
  ]
};

/**
 * 予測的キャッシュマネージャー
 */
export class PredictiveCacheManager {
  private preloadedResponses = new Map<string, {
    audio: Buffer;
    lipSync: any;
  }>();
  
  private isPreloading = false;
  private preloadQueue: string[] = [];

  /**
   * 初期化時に共通応答をプリロード
   */
  async initialize(): Promise<void> {
    if (this.isPreloading) {
      return;
    }

    this.isPreloading = true;
    logger.info('予測的キャッシュの初期化開始');

    try {
      // 最も使用頻度の高い応答をプリロード
      const highPriorityResponses = [
        ...COMMON_RESPONSES.greetings.slice(0, 1),
        ...COMMON_RESPONSES.acknowledgments.slice(0, 2),
        ...COMMON_RESPONSES.endings.slice(0, 1)
      ];

      await this.preloadResponses(highPriorityResponses);
      
      logger.info('予測的キャッシュの初期化完了', {
        preloadedCount: this.preloadedResponses.size
      });
    } catch (error) {
      logger.error('予測的キャッシュの初期化エラー', error as Error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * 応答をプリロード
   */
  private async preloadResponses(texts: string[]): Promise<void> {
    const promises = texts.map(async (text) => {
      try {
        // 既にキャッシュされている場合はスキップ
        if (audioCache.get(text)) {
          return;
        }

        // 音声生成
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: text,
        });

        const audioBuffer = Buffer.from(await mp3.arrayBuffer());
        
        // キャッシュに保存
        audioCache.set(text, audioBuffer);
        
        // TODO: リップシンクデータも生成
        // const lipSyncData = await generateLipSync(audioBuffer);
        // lipSyncCache.set(text, lipSyncData);

        this.preloadedResponses.set(text, {
          audio: audioBuffer,
          lipSync: {} // プレースホルダー
        });

        logger.debug('応答をプリロード', { text: text.substring(0, 30) });
      } catch (error) {
        logger.error('プリロードエラー', error as Error, { text });
      }
    });

    await Promise.all(promises);
  }

  /**
   * キャッシュから応答を取得
   */
  async getResponse(text: string): Promise<{
    audio?: Buffer;
    lipSync?: any;
    cached: boolean;
  }> {
    // 完全一致のキャッシュを確認
    const cached = this.preloadedResponses.get(text);
    if (cached) {
      logger.debug('プリロードキャッシュヒット', { text: text.substring(0, 30) });
      return {
        audio: cached.audio,
        lipSync: cached.lipSync,
        cached: true
      };
    }

    // 通常のキャッシュを確認
    const audio = audioCache.get(text);
    const lipSync = lipSyncCache.get(text);
    
    if (audio) {
      logger.debug('通常キャッシュヒット', { text: text.substring(0, 30) });
      return {
        audio,
        lipSync,
        cached: true
      };
    }

    return { cached: false };
  }

  /**
   * 次の可能性のある応答を予測してプリロード
   */
  async predictAndPreload(context: string, currentPhase: string): Promise<void> {
    // バックグラウンドで実行
    setImmediate(async () => {
      try {
        const predictions = this.predictNextResponses(context, currentPhase);
        
        // 優先度の高いものから順にキューに追加
        this.preloadQueue.push(...predictions);
        
        // キューを処理
        await this.processPreloadQueue();
      } catch (error) {
        logger.error('予測プリロードエラー', error as Error);
      }
    });
  }

  /**
   * 次の応答を予測
   */
  private predictNextResponses(context: string, phase: string): string[] {
    const predictions: string[] = [];

    // フェーズに基づいて予測
    switch (phase) {
      case 'interview_prompt':
        predictions.push(
          ...COMMON_RESPONSES.clarifications,
          ...COMMON_RESPONSES.transitions.slice(0, 2)
        );
        break;
      
      case 'thank_you':
        predictions.push(...COMMON_RESPONSES.endings);
        break;
      
      default:
        predictions.push(
          ...COMMON_RESPONSES.acknowledgments.slice(0, 1),
          ...COMMON_RESPONSES.transitions.slice(0, 1)
        );
    }

    return predictions;
  }

  /**
   * プリロードキューを処理
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    try {
      // 最大3件まで同時にプリロード
      const batch = this.preloadQueue.splice(0, 3);
      await this.preloadResponses(batch);
    } finally {
      this.isPreloading = false;
      
      // まだキューに残りがある場合は継続
      if (this.preloadQueue.length > 0) {
        setTimeout(() => this.processPreloadQueue(), 1000);
      }
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    preloadedCount: number;
    queueLength: number;
    hitRate: number;
  } {
    return {
      preloadedCount: this.preloadedResponses.size,
      queueLength: this.preloadQueue.length,
      hitRate: 0 // TODO: ヒット率の計算実装
    };
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.preloadedResponses.clear();
    this.preloadQueue = [];
  }
}

/**
 * セッションベースのキャッシュ
 */
export class SessionCache {
  private sessions = new Map<string, {
    responses: Map<string, any>;
    lastAccess: number;
    theme: string;
  }>();

  private readonly maxSessions = 100;
  private readonly sessionTTL = 60 * 60 * 1000; // 1時間

  /**
   * セッションを作成または更新
   */
  createSession(sessionId: string, theme: string): void {
    this.cleanupOldSessions();

    this.sessions.set(sessionId, {
      responses: new Map(),
      lastAccess: Date.now(),
      theme
    });

    logger.debug('セッション作成', { sessionId, theme });
  }

  /**
   * セッション応答を保存
   */
  saveResponse(
    sessionId: string,
    key: string,
    response: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.responses.set(key, response);
    session.lastAccess = Date.now();
  }

  /**
   * セッション応答を取得
   */
  getResponse(sessionId: string, key: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.lastAccess = Date.now();
    return session.responses.get(key);
  }

  /**
   * 古いセッションをクリーンアップ
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.sessions.forEach((session, id) => {
      if (now - session.lastAccess > this.sessionTTL) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => {
      this.sessions.delete(id);
      logger.debug('セッション削除', { sessionId: id });
    });

    // 最大数を超えた場合は古いものから削除
    if (this.sessions.size >= this.maxSessions) {
      const sorted = Array.from(this.sessions.entries())
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
      
      const toRemove = sorted.slice(0, sorted.length - this.maxSessions + 1);
      toRemove.forEach(([id]) => this.sessions.delete(id));
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    sessionCount: number;
    totalResponses: number;
  } {
    let totalResponses = 0;
    this.sessions.forEach(session => {
      totalResponses += session.responses.size;
    });

    return {
      sessionCount: this.sessions.size,
      totalResponses
    };
  }
}

// シングルトンインスタンス
export const predictiveCache = new PredictiveCacheManager();
export const sessionCache = new SessionCache();