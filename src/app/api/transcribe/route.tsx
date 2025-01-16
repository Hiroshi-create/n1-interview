import { NextRequest, NextResponse } from 'next/server'
import fetch from 'node-fetch'
import FormData from 'form-data'
import fs from 'fs'
import os from 'os'
import path from 'path'

function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', 'https://n1-interview-kanseibunseki-incs-projects.vercel.app')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS() {
  return setCorsHeaders(NextResponse.json({}, { status: 200 }))
}

export async function POST(request: NextRequest) {
  let tempFilePath = '';
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const themeId = formData.get('themeId') as string;
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
    }

    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size, 'bytes');

    if (file.size === 0) {
      console.log('ファイルサイズが0です');
      return NextResponse.json({ error: 'ファイルが空です' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    console.log('ArrayBuffer取得完了');

    const header = Buffer.from(buffer.slice(0, 8)).toString('hex')
    console.log('ファイルヘッダー:', header);

    let fileExtension: string;
    let contentType: string;

    if (header.startsWith('1a45dfa3')) {
      fileExtension = 'webm';
      contentType = 'audio/webm';
      console.log('WebMファイルとして処理します');
    } else if (header.startsWith('0000001c')) {
      fileExtension = 'm4a';
      contentType = 'audio/mp4';
      console.log('M4Aファイルとして処理します');
    } else {
      console.log('未対応のファイル形式です');
      return NextResponse.json({ error: '未対応のファイル形式です' }, { status: 400 })
    }

    tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.${fileExtension}`);
    console.log('一時ファイルパス:', tempFilePath);

    try {
      await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));
      console.log('一時ファイル作成完了');
    } catch (error) {
      console.error('一時ファイル作成エラー:', error);
      return NextResponse.json({ error: '一時ファイルの作成に失敗しました' }, { status: 500 })
    }

    const whisperFormData = new FormData()
    whisperFormData.append('file', fs.createReadStream(tempFilePath), {
      filename: `audio.${fileExtension}`,
      contentType: contentType,
    })
    whisperFormData.append('model', 'whisper-1')
    console.log('WhisperAPI用FormData作成完了');

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
    return setCorsHeaders(NextResponse.json({ error: 'Whisper APIの呼び出しに失敗しました' }, { status: 500 }))
  } finally {
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
  return setCorsHeaders(NextResponse.json({ message: 'このエンドポイントはPOSTリクエストのみを受け付けます' }, { status: 405 }))
}






















// import { NextRequest, NextResponse } from 'next/server'
// import fetch from 'node-fetch'
// import FormData from 'form-data'
// import fs from 'fs'
// import os from 'os'
// import path from 'path'

// // CORS用のヘッダーを設定する関数
// function setCorsHeaders(response: NextResponse) {
//   response.headers.set('Access-Control-Allow-Origin', 'https://n1-interview-kanseibunseki-incs-projects.vercel.app')
//   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
//   response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
//   return response
// }

// // OPTIONSリクエストに対応するハンドラー
// export async function OPTIONS() {
//   return setCorsHeaders(NextResponse.json({}, { status: 200 }))
// }

// export async function POST(request: NextRequest) {
//   let tempFilePath = '';
//   try {
//     const formData = await request.formData()
//     const file = formData.get('file') as File
//     const themeId = formData.get('themeId') as string;
//     if (!file) {
//       return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
//     }

//     // ファイルの詳細をログに出力
//     console.log('File name:', file.name);
//     console.log('File type:', file.type);
//     console.log('File size:', file.size, 'bytes');

//     if (file.size === 0) {
//       console.log('ファイルサイズが0です');
//       return NextResponse.json({ error: 'ファイルが空です' }, { status: 400 })
//     }

//     console.log('ファイルサイズチェック完了');

//     const buffer = await file.arrayBuffer()
//     console.log('ArrayBuffer取得完了');

//     const header = Buffer.from(buffer.slice(0, 4)).toString('hex')
//     console.log('ファイルヘッダー:', header);

//     if (header !== '1a45dfa3') {  // WebMファイルのマジックナンバー
//       console.log('無効なWebMファイルです');
//       return NextResponse.json({ error: '無効なWebMファイルです' }, { status: 400 })
//     }

//     console.log('WebMファイル形式チェック完了');

//     // 一時ファイルを作成
//     tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
//     console.log('一時ファイルパス:', tempFilePath);

//     try {
//       await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));
//       console.log('一時ファイル作成完了');
//     } catch (error) {
//       console.error('一時ファイル作成エラー:', error);
//       return NextResponse.json({ error: '一時ファイルの作成に失敗しました' }, { status: 500 })
//     }

//     const whisperFormData = new FormData()
//     whisperFormData.append('file', fs.createReadStream(tempFilePath), {
//       filename: 'audio.webm',
//       contentType: 'audio/webm',
//     })
//     whisperFormData.append('model', 'whisper-1')
//     console.log('WhisperAPI用FormData作成完了');

//     // Whisper APIに送信するリクエストの詳細をログに出力
//     console.log('Sending request to Whisper API');
//     console.log('Request headers:', whisperFormData.getHeaders());
//     console.log('API Key:', process.env.NEXT_PUBLIC_OPENAI_KEY ? 'Set' : 'Not set');

//     // // ファイルの詳細をログに出力
//     // console.log('File name:', file.name);
//     // console.log('File type:', file.type);
//     // console.log('File size:', file.size, 'bytes');

//     // if (file.size === 0) {
//     //   return NextResponse.json({ error: 'ファイルが空です' }, { status: 400 })
//     // }

//     // const buffer = await file.arrayBuffer()
//     // const header = Buffer.from(buffer.slice(0, 4)).toString('hex')
//     // if (header !== '1a45dfa3') {  // WebMファイルのマジックナンバー
//     //   return NextResponse.json({ error: '無効なWebMファイルです' }, { status: 400 })
//     // }

//     // // 一時ファイルを作成
//     // tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.webm`);
//     // await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));

//     // const whisperFormData = new FormData()
//     // whisperFormData.append('file', fs.createReadStream(tempFilePath), {
//     //   filename: 'audio.webm',
//     //   contentType: 'audio/webm',
//     // })
//     // whisperFormData.append('model', 'whisper-1')

//     // // Whisper APIに送信するリクエストの詳細をログに出力
//     // console.log('Sending request to Whisper API');
//     // console.log('Request headers:', whisperFormData.getHeaders());
//     // console.log('API Key:', process.env.NEXT_PUBLIC_OPENAI_KEY ? 'Set' : 'Not set');

//     const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
//       method: 'POST',
//       headers: {
//         ...whisperFormData.getHeaders(),
//         'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
//       },
//       body: whisperFormData,
//     })

//     if (!response.ok) {
//       const errorBody = await response.json()
//       console.error('Whisper API Error:', response.status, JSON.stringify(errorBody, null, 2))
//       throw new Error(`Whisper API returned ${response.status}: ${JSON.stringify(errorBody)}`)
//     }

//     const data = await response.json()
//     console.log('Whisper API response:', data)
//     return NextResponse.json({ ...data, themeId });
//   } catch (error) {
//     console.error('Error:', error)
//     return setCorsHeaders(NextResponse.json({ error: 'Whisper APIの呼び出しに失敗しました' }, { status: 500 }))//
//   } finally {
//     // 一時ファイルを削除
//     if (tempFilePath && fs.existsSync(tempFilePath)) {
//       try {
//         await fs.promises.unlink(tempFilePath);
//         console.log('Temporary file deleted:', tempFilePath);
//       } catch (deleteError) {
//         console.error('Error deleting temporary file:', deleteError);
//       }
//     }
//   }
// }

// export async function GET() {
//   return setCorsHeaders(NextResponse.json({ message: 'このエンドポイントはPOSTリクエストのみを受け付けます' }, { status: 405 }))//
// }
