import { NextRequest, NextResponse } from 'next/server'
import fetch from 'node-fetch'
import FormData from 'form-data'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { logger } from '../../../lib/logger'
import { handleApiError } from '../../../lib/api-utils'
import { ValidationError, withRetry, withTimeout, ExternalServiceError } from '../../../lib/error-handler'

function setCorsHeaders(response: NextResponse) {
  // CORS configuration with environment variable support
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://n1-interview-kanseibunseki-incs-projects.vercel.app'
  ];
  
  // In production, use strict origin checking
  const origin = process.env.NODE_ENV === 'production' 
    ? allowedOrigins[1] // Use production URL
    : allowedOrigins[0]; // Use localhost for development
    
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}, { status: 200 }))
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let tempFilePath = '';
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const themeId = formData.get('themeId') as string;
    
    if (!file) {
      throw new ValidationError('ファイルが見つかりません', { field: 'file' });
    }

    logger.debug('transcribe: ファイル受信', { 
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      themeId 
    });

    if (file.size === 0) {
      throw new ValidationError('ファイルが空です', { field: 'file', fileSize: 0 });
    }

    const buffer = await file.arrayBuffer()
    logger.debug('transcribe: ArrayBuffer取得完了');

    const header = Buffer.from(buffer.slice(0, 8)).toString('hex')
    logger.debug('transcribe: ファイルヘッダー解析完了');

    let fileExtension: string;
    let contentType: string;

    if (header.startsWith('1a45dfa3')) {
      fileExtension = 'webm';
      contentType = 'audio/webm';
      logger.debug('transcribe: WebMファイルとして処理します');
    } else if (header.startsWith('0000001c')) {
      fileExtension = 'mp4';
      contentType = 'audio/mp4';
      logger.debug('transcribe: M4Aファイルとして処理します');
    } else {
      throw new ValidationError('未対応のファイル形式です', { header });
    }

    tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.${fileExtension}`);
    logger.debug('transcribe: 一時ファイル作成開始');

    try {
      await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));
      logger.debug('transcribe: 一時ファイル作成完了');
    } catch (error) {
      logger.error('transcribe: 一時ファイル作成エラー', error as Error);
      return NextResponse.json({ error: '一時ファイルの作成に失敗しました' }, { status: 500 })
    }

    const whisperFormData = new FormData()
    whisperFormData.append('file', fs.createReadStream(tempFilePath), {
      filename: `audio.${fileExtension}`,
      contentType: contentType,
    })
    whisperFormData.append('model', 'whisper-1')
    logger.debug('transcribe: WhisperAPI用FormData作成完了');

    logger.debug('transcribe: Whisper APIにリクエスト送信開始');

    // Whisper API呼び出しにリトライ機構を適用
    const response = await withRetry(
      async () => {
        const promise = fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            ...whisperFormData.getHeaders(),
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: whisperFormData,
        });
        return withTimeout(promise, 60000, 'Whisper APIタイムアウト');
      },
      {
        maxAttempts: 2,
        initialDelay: 2000,
        onRetry: (attempt, error) => {
          logger.warn(`Whisper API retry attempt ${attempt}`, { error: error.message });
        }
      }
    )

    if (!response.ok) {
      const errorBody = await response.json()
      logger.error('transcribe: Whisper API エラー', undefined, { 
        status: response.status,
        error: errorBody 
      });
      throw new Error(`Whisper API returned ${response.status}`)
    }

    const data = await response.json()
    logger.debug('transcribe: Whisper API レスポンス受信完了');
    
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/transcribe', 200, duration);

    return NextResponse.json({
      ...(typeof data === "object" && data !== null ? data : {}),
      themeId
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/transcribe', 500, duration);
    return setCorsHeaders(handleApiError(error, 'transcribe'))
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
        logger.debug('transcribe: 一時ファイル削除完了');
      } catch (deleteError) {
        logger.error('transcribe: 一時ファイル削除エラー', deleteError as Error);
      }
    }
  }
}

export async function GET() {
  return setCorsHeaders(NextResponse.json({ message: 'このエンドポイントはPOSTリクエストのみを受け付けます' }, { status: 405 }))
}
