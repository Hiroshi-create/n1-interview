import { NextRequest, NextResponse } from 'next/server'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { Readable } from 'stream'
import fs from 'fs'
import os from 'os'
import path from 'path'

export async function POST(request: NextRequest) {
  let tempFilePath = '';
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const themeId = formData.get('themeId') as string;
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
    }

    // ファイルの詳細をログに出力
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size, 'bytes');

    if (file.size === 0) {
      return NextResponse.json({ error: 'ファイルが空です' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const header = Buffer.from(buffer.slice(0, 4)).toString('hex')
    if (header !== '1a45dfa3') {  // WebMファイルのマジックナンバー
      return NextResponse.json({ error: '無効なWebMファイルです' }, { status: 400 })
    }

    // 一時ファイルを作成
    tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
    await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));

    const whisperFormData = new FormData()
    whisperFormData.append('file', fs.createReadStream(tempFilePath), {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    })
    whisperFormData.append('model', 'whisper-1')

    // Whisper APIに送信するリクエストの詳細をログに出力
    console.log('Sending request to Whisper API');
    console.log('Request headers:', whisperFormData.getHeaders());
    console.log('API Key:', process.env.NEXT_PUBLIC_OPENAI_KEY ? 'Set' : 'Not set');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        ...whisperFormData.getHeaders(),
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
      },
      body: whisperFormData,
    })

    if (!response.ok) {
      const errorBody = await response.json()
      console.error('Whisper API Error:', response.status, JSON.stringify(errorBody, null, 2))
      throw new Error(`Whisper API returned ${response.status}: ${JSON.stringify(errorBody)}`)
    }

    const data = await response.json()
    console.log('Whisper API response:', data)
    return NextResponse.json({ ...data, themeId });
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Whisper APIの呼び出しに失敗しました' }, { status: 500 })
  } finally {
    // 一時ファイルを削除
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await fs.promises.unlink(tempFilePath);
        console.log('Temporary file deleted:', tempFilePath);
      } catch (deleteError) {
        console.error('Error deleting temporary file:', deleteError);
      }
    }
  }
}

export async function GET() {
  return NextResponse.json({ message: 'このエンドポイントはPOSTリクエストのみを受け付けます' }, { status: 405 })
}
