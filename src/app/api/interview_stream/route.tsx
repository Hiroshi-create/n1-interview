/**
 * ストリーミング対応インタビューAPI
 * リアルタイム通信とプログレッシブレスポンス
 */

import { NextRequest, NextResponse } from 'next/server';
import { InterviewStreamingResponse } from '@/lib/streaming-response';
import { DependencyExecutor } from '@/lib/async-optimizer';
import { SafeOpenAIClient } from '@/lib/external-api';
import { audioCache, lipSyncCache } from '@/lib/lru-cache';
import { logger } from '@/lib/logger';
import { validateAuthHeader, handleApiError } from '@/lib/api-utils';
import { ValidationError } from '@/lib/error-handler';
import { adminDb } from '@/lib/firebase-admin';

const openaiClient = new SafeOpenAIClient();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const stream = new InterviewStreamingResponse();
  let streamMode = true; // デフォルト値
  
  try {
    // 認証チェック
    const token = validateAuthHeader(request);
    if (!token) {
      throw new ValidationError('認証トークンが必要です');
    }
    
    const body = await request.json();
    const { message, themeId, interviewId } = body;
    streamMode = body.streamMode !== undefined ? body.streamMode : true;
    
    if (!themeId || !interviewId) {
      throw new ValidationError('テーマIDとインタビューIDが必要です');
    }
    
    logger.info('Streaming interview started', { themeId, interviewId, streamMode });
    
    // ストリーミングモードの場合
    if (streamMode) {
      // 非同期処理を開始
      processStreamingInterview(stream, message, themeId, interviewId).catch(error => {
        logger.error('Streaming interview error', error as Error);
        stream.sendError('処理中にエラーが発生しました', 'PROCESSING_ERROR');
        stream.close('error');
      });
      
      // すぐにストリーミングレスポンスを返す
      return stream.getResponse();
    }
    
    // 通常モード（後方互換性）
    const result = await processNormalInterview(message, themeId, interviewId);
    return NextResponse.json(result);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/interview_stream', 500, duration);
    
    if (streamMode) {
      stream.sendError('エラーが発生しました', 'INITIAL_ERROR');
      stream.close('error');
      return stream.getResponse();
    }
    
    return handleApiError(error, 'interview_stream');
  }
}

/**
 * ストリーミング処理
 */
async function processStreamingInterview(
  stream: InterviewStreamingResponse,
  message: string,
  themeId: string,
  interviewId: string
) {
  const executor = new DependencyExecutor();
  
  try {
    // 進捗通知
    stream.sendProgress(1, 5, 'AIが応答を生成中...');
    
    // タスク1: OpenAI応答生成
    executor.addTask('generate-response', async () => {
      const response = await openaiClient.createChatCompletion({
        messages: [
          { role: 'system', content: 'あなたは優秀なインタビュアーです。' },
          { role: 'user', content: message }
        ],
        model: 'gpt-4',
        stream: true  // ストリーミング応答
      });
      
      let fullText = '';
      // @ts-ignore - ストリーミング応答の処理
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullText += content;
        
        // リアルタイムでテキストを送信
        if (content) {
          stream.sendTextResponse(content, false);
        }
      }
      
      return fullText;
    });
    
    // タスク2: 音声生成（応答生成に依存）
    executor.addTask('generate-audio', async () => {
      stream.sendProgress(2, 5, '音声を生成中...');
      
      // @ts-ignore - accessing private property for dependency resolution
      const responseText = await (executor as any).tasks.get('generate-response')?.result;
      if (!responseText) return null;
      
      // キャッシュチェック
      const cacheKey = `audio:${themeId}:${responseText.substring(0, 50)}`;
      const cached = audioCache.get(cacheKey);
      
      if (cached) {
        logger.debug('Audio cache hit', { cacheKey });
        return cached;
      }
      
      // 音声生成
      const audioResponse = await openaiClient.createSpeech({
        model: 'tts-1',
        voice: 'nova',
        input: responseText
      });
      
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      
      // キャッシュに保存
      audioCache.set(cacheKey, audioBuffer);
      
      // チャンクごとに送信
      const chunkSize = 64 * 1024; // 64KB
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.slice(i, i + chunkSize);
        await stream.sendAudioChunk(chunk, {
          offset: i,
          total: audioBuffer.length
        });
        
        // UIの更新時間を与える
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      return audioBuffer;
    }, ['generate-response']);
    
    // タスク3: リップシンク生成（音声生成に依存）
    executor.addTask('generate-lipsync', async () => {
      stream.sendProgress(3, 5, 'リップシンクを生成中...');
      
      // @ts-ignore - accessing private property for dependency resolution
      const responseText = await (executor as any).tasks.get('generate-response')?.result;
      if (!responseText) return null;
      
      // キャッシュチェック
      const cacheKey = `lipsync:${themeId}:${responseText.substring(0, 50)}`;
      const cached = lipSyncCache.get(cacheKey);
      
      if (cached) {
        logger.debug('LipSync cache hit', { cacheKey });
        stream.sendLipSyncData(cached);
        return cached;
      }
      
      // リップシンク生成（実際の実装は省略）
      const lipSyncData = {
        mouthCues: [],
        blinkCues: [],
        emotionCues: []
      };
      
      // キャッシュに保存
      lipSyncCache.set(cacheKey, lipSyncData);
      
      stream.sendLipSyncData(lipSyncData);
      return lipSyncData;
    }, ['generate-audio']);
    
    // タスク4: Firestoreに保存
    executor.addTask('save-to-firestore', async () => {
      stream.sendProgress(4, 5, 'データを保存中...');
      
      // @ts-ignore - accessing private property for dependency resolution
      const responseText = await (executor as any).tasks.get('generate-response')?.result;
      // @ts-ignore - accessing private property for dependency resolution
      const audioBuffer = await (executor as any).tasks.get('generate-audio')?.result;
      // @ts-ignore - accessing private property for dependency resolution
      const lipSyncData = await (executor as any).tasks.get('generate-lipsync')?.result;
      
      if (!responseText) return;
      
      const messageData = {
        text: responseText,
        audio: audioBuffer ? audioBuffer.toString('base64') : null,
        lipsync: lipSyncData,
        timestamp: new Date(),
        sender: 'bot',
        type: 'interview'
      };
      
      const interviewRef = adminDb.doc(`interviews/${interviewId}`);
      await interviewRef.collection('messages').add(messageData);
      
      return messageData;
    }, ['generate-response', 'generate-audio', 'generate-lipsync']);
    
    // すべてのタスクを実行
    await executor.execute({
      maxConcurrency: 3,
      timeout: 60000,
      onProgress: (completed, total) => {
        stream.sendProgress(completed, total, '処理中...');
      }
    });
    
    stream.sendProgress(5, 5, '完了');
    stream.close('completed');
    
  } catch (error) {
    logger.error('Streaming interview processing error', error as Error);
    stream.sendError('処理エラー', 'PROCESSING_ERROR');
    stream.close('error');
    throw error;
  }
}

/**
 * 通常処理（後方互換性）
 */
async function processNormalInterview(
  message: string,
  themeId: string,
  interviewId: string
): Promise<any> {
  // 既存の処理ロジック
  const response = await openaiClient.createChatCompletion({
    messages: [
      { role: 'system', content: 'あなたは優秀なインタビュアーです。' },
      { role: 'user', content: message }
    ],
    model: 'gpt-4'
  });
  
  const responseText = response.choices[0].message.content;
  
  return {
    message: responseText,
    success: true
  };
}

/**
 * Server-Sent Events用のGETエンドポイント
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const interviewId = searchParams.get('interviewId');
  
  if (!interviewId) {
    return NextResponse.json({ error: 'Interview ID required' }, { status: 400 });
  }
  
  // SSEレスポンスを作成
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Firestoreのリアルタイムリスナー設定
      const interviewRef = adminDb.doc(`interviews/${interviewId}`);
      const messagesRef = interviewRef.collection('messages');
      
      const unsubscribe = messagesRef
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const data = change.doc.data();
                const event = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(event));
              }
            });
          },
          (error) => {
            logger.error('Firestore listener error', error);
            controller.close();
          }
        );
      
      // クリーンアップ
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}