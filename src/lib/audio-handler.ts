/**
 * 音声認識エラーハンドリングとリトライ機能
 */

import { logger } from './logger';
import { fetchWithTimeout, API_TIMEOUTS } from './api-timeout';

export interface AudioRecordingOptions {
  maxDuration?: number; // 最大録音時間（ミリ秒）
  minDuration?: number; // 最小録音時間（ミリ秒）
  sampleRate?: number;
  channels?: number;
  onProgress?: (duration: number) => void;
  onError?: (error: AudioError) => void;
}

export class AudioError extends Error {
  constructor(
    message: string,
    public code: AudioErrorCode,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AudioError';
  }
}

export enum AudioErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  RECORDING_FAILED = 'RECORDING_FAILED',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_AUDIO = 'INVALID_AUDIO',
  UNKNOWN = 'UNKNOWN'
}

/**
 * マイクのアクセス許可を取得
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    // ストリームを停止（許可の確認のみ）
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error: any) {
    const audioError = handleMediaError(error);
    logger.error('Microphone permission error', audioError);
    throw audioError;
  }
}

/**
 * MediaDevicesのエラーをAudioErrorに変換
 */
function handleMediaError(error: any): AudioError {
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    return new AudioError(
      'マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。',
      AudioErrorCode.PERMISSION_DENIED,
      false
    );
  }
  
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    return new AudioError(
      'マイクが見つかりません。デバイスが接続されているか確認してください。',
      AudioErrorCode.DEVICE_NOT_FOUND,
      false
    );
  }
  
  if (error.name === 'NotSupportedError' || error.name === 'NotReadableError') {
    return new AudioError(
      'このブラウザまたはデバイスはマイク録音をサポートしていません。',
      AudioErrorCode.NOT_SUPPORTED,
      false
    );
  }
  
  return new AudioError(
    `予期しないエラーが発生しました: ${error.message}`,
    AudioErrorCode.UNKNOWN,
    true
  );
}

/**
 * 音声録音クラス
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private recordingTimer: NodeJS.Timeout | null = null;
  private isRecording: boolean = false;

  constructor(private options: AudioRecordingOptions = {}) {}

  /**
   * 録音を開始
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new AudioError('既に録音中です', AudioErrorCode.RECORDING_FAILED, false);
    }

    try {
      // マイクのストリームを取得
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate || 16000,
          channelCount: this.options.channels || 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // MediaRecorderを初期化
      const mimeType = this.getOptimalMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      
      this.chunks = [];
      
      // データ取得のイベントハンドラ
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      // エラーハンドラ
      this.mediaRecorder.onerror = (event: any) => {
        this.handleRecordingError(new Error(event.error?.message || 'Recording failed'));
      };

      // 録音開始
      this.mediaRecorder.start(1000); // 1秒ごとにデータを取得
      this.recordingStartTime = Date.now();
      this.isRecording = true;

      // 最大録音時間のタイマー
      if (this.options.maxDuration) {
        this.recordingTimer = setTimeout(() => {
          this.stopRecording();
        }, this.options.maxDuration);
      }

      // 進捗の通知
      if (this.options.onProgress) {
        const progressInterval = setInterval(() => {
          if (this.isRecording) {
            const duration = Date.now() - this.recordingStartTime;
            this.options.onProgress!(duration);
          } else {
            clearInterval(progressInterval);
          }
        }, 100);
      }

    } catch (error) {
      const audioError = handleMediaError(error);
      this.options.onError?.(audioError);
      throw audioError;
    }
  }

  /**
   * 録音を停止
   */
  async stopRecording(): Promise<Blob> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new AudioError('録音が開始されていません', AudioErrorCode.RECORDING_FAILED, false);
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new AudioError('MediaRecorderが初期化されていません', AudioErrorCode.RECORDING_FAILED, false));
        return;
      }

      const duration = Date.now() - this.recordingStartTime;
      
      // 最小録音時間のチェック
      if (this.options.minDuration && duration < this.options.minDuration) {
        reject(new AudioError(
          `録音時間が短すぎます（最小${this.options.minDuration / 1000}秒）`,
          AudioErrorCode.INVALID_AUDIO,
          false
        ));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getOptimalMimeType();
        const audioBlob = new Blob(this.chunks, { type: mimeType });
        
        // クリーンアップ
        this.cleanup();
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;

      // タイマーのクリア
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }
    });
  }

  /**
   * 最適なMIMEタイプを取得
   */
  private getOptimalMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // フォールバック
  }

  /**
   * 録音エラーを処理
   */
  private handleRecordingError(error: Error): void {
    const audioError = new AudioError(
      `録音中にエラーが発生しました: ${error.message}`,
      AudioErrorCode.RECORDING_FAILED,
      true
    );
    
    logger.error('Recording error', audioError);
    this.options.onError?.(audioError);
    this.cleanup();
  }

  /**
   * リソースをクリーンアップ
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
    
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * 録音中かどうか
   */
  get recording(): boolean {
    return this.isRecording;
  }
}

/**
 * 音声をWhisper APIに送信して文字起こし
 */
export async function transcribeAudio(
  audioBlob: Blob,
  themeId?: string,
  retries: number = 3
): Promise<string> {
  const formData = new FormData();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  
  formData.append('file', audioBlob, `audio.${isIOS ? 'mp4' : 'webm'}`);
  if (themeId) {
    formData.append('themeId', themeId);
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout('/api/transcribe', {
        method: 'POST',
        body: formData,
        timeout: API_TIMEOUTS.LONG, // 30秒のタイムアウト
        onTimeout: () => {
          logger.warn('Audio transcription timeout', { attempt, themeId });
        },
        onRetry: (retryAttempt) => {
          logger.info('Retrying audio transcription', { attempt: retryAttempt, themeId });
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.text) {
        throw new Error('No transcribed text in response');
      }

      return data.text;
    } catch (error: any) {
      logger.error(`Transcription attempt ${attempt} failed`, error);
      
      if (attempt === retries) {
        throw new AudioError(
          `音声の文字起こしに失敗しました: ${error.message}`,
          error.name === 'TimeoutError' ? AudioErrorCode.TIMEOUT : AudioErrorCode.TRANSCRIPTION_FAILED,
          false
        );
      }
      
      // 指数バックオフで待機
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  throw new AudioError(
    '音声の文字起こしに失敗しました',
    AudioErrorCode.TRANSCRIPTION_FAILED,
    false
  );
}