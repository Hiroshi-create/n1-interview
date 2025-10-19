/**
 * 外部API呼び出し用のラッパー
 * リトライ機構とサーキットブレーカーを含む
 */

import OpenAI from 'openai';
import { SpeechClient } from '@google-cloud/speech';
import { 
  withRetry, 
  withTimeout, 
  CircuitBreaker, 
  ExternalServiceError,
  ApplicationError 
} from './error-handler';
import { logger } from './logger';

// OpenAI用のサーキットブレーカー
const openAICircuitBreaker = new CircuitBreaker(5, 60000, 30000);

// Google Cloud Speech用のサーキットブレーカー
const gcpSpeechCircuitBreaker = new CircuitBreaker(5, 60000, 30000);

/**
 * OpenAI API クライアントの安全なラッパー
 */
export class SafeOpenAIClient {
  private client: OpenAI;
  
  constructor() {
    // セキュリティ改善: サーバーサイド専用のAPIキーのみ使用
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('OPENAI_API_KEY is not configured');
      throw new ApplicationError(500, 'OpenAI API key is not configured', 'OPENAI_NOT_CONFIGURED');
    }
    this.client = new OpenAI({
      apiKey: apiKey,
    });
  }
  
  /**
   * Chat Completion APIの呼び出し（リトライ機構付き）
   */
  async createChatCompletion(
    params: OpenAI.ChatCompletionCreateParams,
    options?: { timeout?: number; maxRetries?: number }
  ): Promise<OpenAI.ChatCompletion> {
    const { timeout = 30000, maxRetries = 3 } = options || {};
    
    return openAICircuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const promise = this.client.chat.completions.create(params);
          return withTimeout(promise, timeout, 'OpenAI chat completion timed out');
        },
        {
          maxAttempts: maxRetries,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            logger.warn(`OpenAI API retry attempt ${attempt}`, { 
              error: error.message,
              model: params.model 
            });
          }
        }
      );
    }).catch(error => {
      // OpenAI特有のエラーをApplicationErrorに変換
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new ApplicationError(429, 'OpenAI rate limit exceeded', 'OPENAI_RATE_LIMIT', undefined, true, true);
        }
        if (error.message.includes('quota')) {
          throw new ApplicationError(402, 'OpenAI quota exceeded', 'OPENAI_QUOTA_EXCEEDED', undefined, true, false);
        }
        if (error.message.includes('invalid_api_key')) {
          throw new ApplicationError(401, 'Invalid OpenAI API key', 'OPENAI_INVALID_KEY', undefined, true, false);
        }
      }
      throw new ExternalServiceError('OpenAI', error);
    });
  }
  
  /**
   * Audio Transcription APIの呼び出し（リトライ機構付き）
   */
  async createTranscription(
    file: File,
    model: string = 'whisper-1',
    options?: { timeout?: number; maxRetries?: number }
  ): Promise<OpenAI.Audio.Transcription> {
    const { timeout = 60000, maxRetries = 2 } = options || {};
    
    return openAICircuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const promise = this.client.audio.transcriptions.create({
            file,
            model,
          });
          return withTimeout(promise, timeout, 'OpenAI transcription timed out');
        },
        {
          maxAttempts: maxRetries,
          initialDelay: 2000,
          maxDelay: 15000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            logger.warn(`OpenAI Transcription retry attempt ${attempt}`, { 
              error: error.message,
              fileSize: file.size 
            });
          }
        }
      );
    }).catch(error => {
      throw new ExternalServiceError('OpenAI Transcription', error);
    });
  }
  
  /**
   * Text-to-Speech APIの呼び出し（リトライ機構付き）
   */
  async createSpeech(
    params: OpenAI.Audio.SpeechCreateParams,
    options?: { timeout?: number; maxRetries?: number }
  ): Promise<Response> {
    const { timeout = 30000, maxRetries = 3 } = options || {};
    
    return openAICircuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const promise = this.client.audio.speech.create(params);
          return withTimeout(promise, timeout, 'OpenAI TTS timed out');
        },
        {
          maxAttempts: maxRetries,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            logger.warn(`OpenAI TTS retry attempt ${attempt}`, { 
              error: error.message,
              voice: params.voice 
            });
          }
        }
      );
    }).catch(error => {
      throw new ExternalServiceError('OpenAI TTS', error);
    });
  }
  
  /**
   * サーキットブレーカーの状態を取得
   */
  getCircuitBreakerState() {
    return openAICircuitBreaker.getState();
  }
}

/**
 * Google Cloud Speech クライアントの安全なラッパー
 */
export class SafeGCPSpeechClient {
  private client: SpeechClient;
  
  constructor() {
    const credentials = {
      client_email: process.env.GCP_CLIENT_EMAIL,
      private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GCP_PROJECT_ID,
    };
    
    this.client = new SpeechClient({
      credentials,
      projectId: process.env.GCP_PROJECT_ID,
    });
  }
  
  /**
   * Speech-to-Text APIの呼び出し（リトライ機構付き）
   */
  async recognize(
    config: any,
    audio: any,
    options?: { timeout?: number; maxRetries?: number }
  ): Promise<any> {
    const { timeout = 30000, maxRetries = 3 } = options || {};
    
    return gcpSpeechCircuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const promise = this.client.recognize({ config, audio });
          return withTimeout(promise, timeout, 'Google Speech API timed out');
        },
        {
          maxAttempts: maxRetries,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            logger.warn(`Google Speech API retry attempt ${attempt}`, { 
              error: error.message,
              language: config.languageCode 
            });
          }
        }
      );
    }).catch(error => {
      // GCP特有のエラーをApplicationErrorに変換
      if (error instanceof Error) {
        if (error.message.includes('RESOURCE_EXHAUSTED')) {
          throw new ApplicationError(429, 'Google Speech API rate limit exceeded', 'GCP_RATE_LIMIT', undefined, true, true);
        }
        if (error.message.includes('UNAUTHENTICATED')) {
          throw new ApplicationError(401, 'Google Speech API authentication failed', 'GCP_AUTH_FAILED', undefined, true, false);
        }
      }
      throw new ExternalServiceError('Google Speech API', error);
    });
  }
  
  /**
   * Streaming Speech-to-Text APIの呼び出し
   */
  streamingRecognize(config: any, options?: { timeout?: number }) {
    const { timeout = 60000 } = options || {};
    
    return gcpSpeechCircuitBreaker.execute(async () => {
      const stream = this.client.streamingRecognize({ config });
      
      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        stream.destroy(new Error('Streaming recognition timed out'));
      }, timeout);
      
      stream.on('end', () => clearTimeout(timeoutId));
      stream.on('error', () => clearTimeout(timeoutId));
      
      return stream;
    }).catch(error => {
      throw new ExternalServiceError('Google Speech Streaming API', error);
    });
  }
  
  /**
   * サーキットブレーカーの状態を取得
   */
  getCircuitBreakerState() {
    return gcpSpeechCircuitBreaker.getState();
  }
}

/**
 * Stripe API用の安全なラッパー
 */
export class SafeStripeClient {
  private circuitBreaker = new CircuitBreaker(5, 60000, 30000);
  
  /**
   * Stripe API呼び出しのラッパー
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: { timeout?: number; maxRetries?: number }
  ): Promise<T> {
    const { timeout = 30000, maxRetries = 3 } = options || {};
    
    return this.circuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const promise = operation();
          return withTimeout(promise, timeout, `Stripe ${operationName} timed out`);
        },
        {
          maxAttempts: maxRetries,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            logger.warn(`Stripe API retry attempt ${attempt}`, { 
              error: error.message,
              operation: operationName 
            });
          }
        }
      );
    }).catch(error => {
      // Stripe特有のエラーをApplicationErrorに変換
      if (error instanceof Error) {
        if (error.message.includes('rate_limit')) {
          throw new ApplicationError(429, 'Stripe rate limit exceeded', 'STRIPE_RATE_LIMIT', undefined, true, true);
        }
        if (error.message.includes('authentication')) {
          throw new ApplicationError(401, 'Stripe authentication failed', 'STRIPE_AUTH_FAILED', undefined, true, false);
        }
      }
      throw new ExternalServiceError(`Stripe ${operationName}`, error);
    });
  }
}

/**
 * 外部APIのヘルスチェック
 */
export async function checkExternalAPIsHealth(): Promise<{
  openai: { healthy: boolean; state: any };
  gcp: { healthy: boolean; state: any };
}> {
  const openAIClient = new SafeOpenAIClient();
  const gcpClient = new SafeGCPSpeechClient();
  
  const openAIState = openAIClient.getCircuitBreakerState();
  const gcpState = gcpClient.getCircuitBreakerState();
  
  return {
    openai: {
      healthy: openAIState.state !== 'OPEN',
      state: openAIState
    },
    gcp: {
      healthy: gcpState.state !== 'OPEN',
      state: gcpState
    }
  };
}