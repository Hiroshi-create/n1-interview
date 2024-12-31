// import { exec } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { addDoc, collection, doc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../../firebase';
// import { v2 as cloudinary } from 'cloudinary';
import { protos, SpeechClient } from '@google-cloud/speech';
type ISpeechRecognitionResult = protos.google.cloud.speech.v1.ISpeechRecognitionResult;
type IWordInfo = protos.google.cloud.speech.v1.IWordInfo;
// import axios from 'axios';
// import https from 'https';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
});

interface LipSync {
  mouthCues: Array<{ start: number; end: number; value: string; }>;
}

interface Message {
  text: string;
  audio: string;
  lipsync: LipSync;
  facialExpression: string;
  animation: string;
}

// const execCommand = (command: string): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     exec(command, (error, stdout) => {
//       if (error) reject(error);
//       resolve(stdout);
//     });
//   });
// };


// // FFmpeg APIを使用する場合
// const lipSyncMessage = async (message: number): Promise<LipSync> => {
//   const time = new Date().getTime();
//   console.log(`Starting conversion for message ${message}`);
//   try {
//     const audioFilePath = path.join('/tmp', `message_${message}.mp3`);
//     const wavFilePath = path.join('/tmp', `message_${message}.wav`);
//     const jsonFilePath = path.join('/tmp', `message_${message}.json`);

//     // mp3ファイルを読み込む
//     const mp3File = await fs.readFile(audioFilePath);

//     // FFmpeg APIを使用してmp3をwavに変換
//     const response = await axios.post('https://api.ffmpeg-api.com/ffmpeg/run', 
//       {
//         'input.mp3': mp3File,
//         'command': JSON.stringify({
//           inputs: [{ options: [], file: 'input.mp3' }],
//           outputs: [{ options: [], file: 'output.wav' }]
//         })
//       },
//       {
//         headers: {
//           'Authorization': `Bearer ${process.env.FFMPEG_API_KEY}`,
//           'Content-Type': 'multipart/form-data'
//         },
//         responseType: 'arraybuffer'
//       }
//     );

//     // 変換されたwavファイルを保存
//     await fs.writeFile(wavFilePath, Buffer.from(response.data));

//     console.log(`Conversion done in ${new Date().getTime() - time}ms`);

//     // 以降の処理（リップシンク生成など）は変更なし
//     await execCommand(`./bin/rhubarb -f json -o ${jsonFilePath} ${wavFilePath} -r phonetic`);
//     console.log(`Lip sync done in ${new Date().getTime() - time}ms`);

//     const jsonData = await fs.readFile(jsonFilePath, 'utf8');
//     return JSON.parse(jsonData);
//   } catch (error) {
//     console.error(`Error in lipSyncMessage: ${error}`);
//     throw error;
//   }
// };



// // Dockerを使用したFFmpegの利用
// // Keep-Alive接続を無効化

// const axiosInstance = axios.create({
//   httpsAgent: new https.Agent({  
//     rejectUnauthorized: false
//   })
// });

// const lipSyncMessage = async (message: number): Promise<LipSync> => {
//   const time = new Date().getTime();
//   console.log(`Starting conversion for message ${message}`);
//   try {
//     const audioFilePath = path.join('/tmp', `message_${message}.mp3`);
//     const wavFilePath = path.join('/tmp', `message_${message}.wav`);
//     const jsonFilePath = path.join('/tmp', `message_${message}.json`);

//     await fs.mkdir('/tmp', { recursive: true });

//     const mp3File = await fs.readFile(audioFilePath);

//     const formData = new FormData();
//     formData.append('file', new Blob([mp3File]), 'input.mp3');
    
//     const apiUrl = process.env.NODE_ENV === 'development'
//     ? process.env.FFMPEG_API_URL_DEV
//     : process.env.FFMPEG_API_URL_PROD;
//     const maxRetries = 3;
//     let retries = 0;
    
//     while (retries < maxRetries) {
//       try {
//         // axiosInstanceを使用してリクエストを送信
//         const response = await axiosInstance.post(`${apiUrl}/convert`, formData, {
//           params: { output: 'wav' },
//           headers: { 'Content-Type': 'multipart/form-data' },
//           responseType: 'arraybuffer',
//           timeout: 60000 // タイムアウトを60秒に延長
//         });

//         await fs.writeFile(wavFilePath, Buffer.from(response.data));
//         console.log(`Conversion done in ${new Date().getTime() - time}ms`);
//         break;
//       } catch (error) {
//         retries++;
//         console.error(`Attempt ${retries} failed: ${error}`);
//         if (retries === maxRetries) throw error;
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//     }

//     await execCommand(`./bin/rhubarb -f json -o ${jsonFilePath} ${wavFilePath} -r phonetic`);
//     console.log(`Lip sync done in ${new Date().getTime() - time}ms`);

//     const jsonData = await fs.readFile(jsonFilePath, 'utf8');
//     return JSON.parse(jsonData);
//   } catch (error) {
//     console.error(`Error in lipSyncMessage: ${error}`);
//     if (axios.isAxiosError(error)) {
//       console.error(`Request failed: ${error.message}`);
//       console.error(`Response status: ${error.response?.status}`);
//       console.error(`Response data: ${JSON.stringify(error.response?.data)}`);
//     }
//     throw error;
//   }
// };





// Google Cloud Speech-to-Text API を使用したリップシンクデータ生成
interface LipSync {
  mouthCues: {
    start: number;
    end: number;
    value: string;
  }[];
}

interface LipSync {
  mouthCues: {
    start: number;
    end: number;
    value: string;
  }[];
}

const generateLipSyncFromTranscription = (results: ISpeechRecognitionResult[]): LipSync => {
  const lipSyncData: LipSync = { mouthCues: [] };

  results.forEach((result: ISpeechRecognitionResult) => {
    if (result.alternatives && result.alternatives[0] && result.alternatives[0].words) {
      result.alternatives[0].words.forEach((word: IWordInfo) => {
        const start = word.startTime?.seconds !== undefined
          ? Number(word.startTime.seconds) + (word.startTime.nanos || 0) / 1e9
          : 0;
        const end = word.endTime?.seconds !== undefined
          ? Number(word.endTime.seconds) + (word.endTime.nanos || 0) / 1e9
          : 0;

        const mouthShape = getMouthShape(word.word || '');

        lipSyncData.mouthCues.push({
          start,
          end,
          value: mouthShape
        });
      });
    }
  });

  return lipSyncData;
};

// 簡易的な音素から口の形への変換関数
const getMouthShape = (word: string): string => {
  const firstChar = word.charAt(0).toLowerCase();
  if ('aiueo'.includes(firstChar)) return 'A';
  if ('kstnhmyrw'.includes(firstChar)) return 'B';
  if ('bgdj'.includes(firstChar)) return 'C';
  return 'X'; // デフォルトの口の形
};

const lipSyncMessage = async (message: number): Promise<LipSync> => {
  const time = new Date().getTime();
  console.log(`メッセージ ${message} の変換を開始します`);
  try {
    const audioFilePath = path.join('/tmp', `message_${message}.mp3`);
    const client = new SpeechClient({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.GCP_CLIENT_EMAIL,
      },
    });

    // 認証情報の検証
    if (!process.env.GCP_PROJECT_ID || !process.env.GCP_PRIVATE_KEY || !process.env.GCP_CLIENT_EMAIL) {
      throw new Error('Google Cloud 認証情報が不足しています。環境変数を確認してください。');
    }

    const audio: protos.google.cloud.speech.v1.IRecognitionAudio = {
      content: await fs.readFile(audioFilePath),
    };
    const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
      encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3,
      sampleRateHertz: 16000,
      languageCode: 'ja-JP',
      enableWordTimeOffsets: true,
    };
    const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
      audio: audio,
      config: config,
    };

    const [response] = await client.recognize(request);
    console.log(`文字起こし完了: ${new Date().getTime() - time}ms`);

    if (!response.results || response.results.length === 0) {
      throw new Error('音声認識結果が空です');
    }

    const lipSyncData = generateLipSyncFromTranscription(response.results);
    console.log(`リップシンク完了: ${new Date().getTime() - time}ms`);

    return lipSyncData;
  } catch (error) {
    console.error(`lipSyncMessageでエラーが発生しました: ${error}`);
    throw error;
  }
};




// // Cloudinaryの設定
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

// const lipSyncMessage = async (message: number): Promise<LipSync> => {
//   const time = new Date().getTime();
//   console.log(`メッセージ ${message} の変換を開始します`);
//   try {
//     const audioFilePath = path.join('/tmp', `message_${message}.mp3`);
//     const wavFilePath = path.join('/tmp', `message_${message}.wav`);
//     const jsonFilePath = path.join('/tmp', `message_${message}.json`);

//     // ディレクトリの存在を確認し、なければ作成
//     await fs.mkdir('/tmp', { recursive: true });

//     // cloudinaryを使用してmp3をwavに変換
//     const result = await cloudinary.uploader.upload(audioFilePath, {
//       resource_type: 'video',
//       format: 'wav'
//     });

//     // 変換されたwavファイルをダウンロード
//     const response = await fetch(result.secure_url);
//     const arrayBuffer = await response.arrayBuffer();
//     await fs.writeFile(wavFilePath, Buffer.from(arrayBuffer));

//     console.log(`変換完了: ${new Date().getTime() - time}ms`);

//     await execCommand(`./bin/rhubarb -f json -o ${jsonFilePath} ${wavFilePath} -r phonetic`);
//     console.log(`リップシンク完了: ${new Date().getTime() - time}ms`);
//     const jsonData = await fs.readFile(jsonFilePath, 'utf8');
//     return JSON.parse(jsonData);
//   } catch (error) {
//     console.error(`lipSyncMessageでエラーが発生しました: ${error}`);
//     throw error;
//   }
// };



// const lipSyncMessage = async (message: number): Promise<LipSync> => {
//   const time = new Date().getTime();
//   console.log(`Starting conversion for message ${message}`);
//   try {
//     const audioFilePath = path.join('/tmp', `message_${message}.mp3`);
//     const wavFilePath = path.join('/tmp', `message_${message}.wav`);
//     const jsonFilePath = path.join('/tmp', `message_${message}.json`);

//     // ディレクトリの存在を確認し、なければ作成
//     await fs.mkdir('/tmp', { recursive: true });

//     await execCommand(`ffmpeg -y -i ${audioFilePath} ${wavFilePath}`);
//     console.log(`Conversion done in ${new Date().getTime() - time}ms`);
//     await execCommand(`./bin/rhubarb -f json -o ${jsonFilePath} ${wavFilePath} -r phonetic`);
//     console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
//     const jsonData = await fs.readFile(jsonFilePath, 'utf8');
//     return JSON.parse(jsonData);
//   } catch (error) {
//     console.error(`Error in lipSyncMessage: ${error}`);
//     throw error;
//   }
// };

const generateAudio = async (text: string, fileName: string): Promise<Buffer> => {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioFilePath = path.join('/tmp', fileName);

    // ディレクトリの存在を確認し、なければ作成
    await fs.mkdir('/tmp', { recursive: true });

    await fs.writeFile(audioFilePath, buffer);
    console.log(`Audio file successfully written to ${audioFilePath}`);
    return buffer;
  } catch (error) {
    console.error(`Error in generateAudio: ${error}`);
    throw error;
  }
};

const readJsonTranscript = async (file: string): Promise<LipSync> => {
  const data = await fs.readFile(file, 'utf8');
  return JSON.parse(data);
};

const audioFileToBase64 = async (fileName: string): Promise<string> => {
  try {
    const audioFilePath = path.join('/tmp', fileName);
    const data = await fs.readFile(audioFilePath);
    return data.toString('base64');
  } catch (error) {
    console.error(`Error in audioFileToBase64: ${error}`);
    throw error;
  }
};

const templates = {
    personal_attributes: `
    あなたは{theme}についてインタビューを行うインタビュアーです。
    回答者の基本的なプロフィールを収集します。
    これまでの会話コンテキスト: {context}
    質問生成の指針:
    - まず，デモグラフィック情報（年齢、職業、家族構成は必須）を聞く
    - ライフスタイルや価値観に関する質問を含める
    - {theme}に関連する趣味や習慣について尋ねる
    - １対話で複数の質問を投げかけない
    - １対話につき質問は１つとする
    `,
    usage_situation: `
    あなたは{theme}についてインタビューを行うインタビュアーです。
    {theme}の利用状況や消費シーンについて詳しく探ります。
    これまでの会話コンテキスト: {context}
    質問生成の指針:
    - {theme}をどのような場面で利用するか，具体的なエピソードなどを交えて
    - 利用した時の満足と不満について，具体的なエピソードなどを交えて
    - {theme}を利用する際の感情や期待を，具体的なエピソードなどを交えて
    - {theme}を利用するにあたりこんなものがあれば，みたいな要望を，具体的なエピソードなどを交えて
    - 各対話につき質問は１つに絞る
    - なぜそう思ったのかを深掘りする
    - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する
    `,
    purchase_intention: `
    あなたは{theme}についてインタビューを行うインタビュアーです。
    {theme}の選択意思決定プロセスについて深掘りします。
    これまでの会話コンテキスト: {context}
    質問生成の指針:
    - 選択時に重視する要素（価格、品質、ブランドなど）を聞き，なぜそれを重視するのか深掘りする
    - 選択のきっかけや情報源を具体的に聞く
    - 選択後の満足度や不満を具体的に聞く
    - 各対話につき質問は１つに絞る
    - なぜそう思ったのかを深掘りする
    - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する
    `,
    competitor_analysis: `
    あなたは{theme}についてインタビューを行うインタビュアーです。
    競合製品やブランドに対する認識を調査します。
    これまでの会話コンテキスト: {context}
    質問生成の指針:
    - 知っている競合ブランドやその特徴を，具体的なエピソードなどを交えて
    - 競合サービスとの比較や選択理由を，具体的なエピソードなどを交えて
    - 競合サービスに対する印象や期待を，具体的なエピソードなどを交えて
    - 各対話につき質問は１つに絞る
    - なぜそう思ったのかを深掘りする
    `,
    // summary: `
    // テーマ: {theme}
    // インタビュー全体を分析し、以下の形式で分析レポートを作成してください：
    // 1. どんな{theme}が選ばれるか:ここに記載
    // 2. 今の{theme}を選んだ理由:ここに記載
    // 3. 他社{theme}と比較したときの魅力:ここに記載
    // 4. これから{theme}を選ぶとしたらどこを重視するか:ここに記載
    // 5. {theme}における不満や問題:ここに記載
    // 6. {theme}において新しく求める特徴や機能:ここに記載
    // これまでの会話コンテキスト: {context}
    // `,
    summary: `
    テーマ: {theme}
    インタビュー全体を分析し、以下の形式で詳細なレポートを作成してください：

    1. インタビューの概要:
    ここに{theme}に関するインタビューの全体的な概要を記載

    2. 主要な発見事項:
    ここに{theme}に関する重要な発見や洞察を記載

    3. ユーザーの特性と行動パターン:
    ここに{theme}に関連するユーザーの特徴や行動傾向を記載

    4. {theme}に対する意見や要望:
    ここに{theme}についてのユーザーの具体的な意見や改善要望を記載

    5. 競合分析の結果:
    ここに{theme}の競合製品やサービスに関する分析結果を記載

    6. 結論と推奨事項:
    ここに{theme}に関する総括と今後のアクションプランを記載

    これまでの会話コンテキスト:{context}
    `,
}

const phases = [
  { template: "personal_attributes", text: "現在のフェーズ: プロフィール", questions: 3 },
  { template: "usage_situation", text: "現在のフェーズ: 利用状況の把握", questions: 4 },
  { template: "purchase_intention", text: "現在のフェーズ: 購入意思の把握", questions: 3 },
  { template: "competitor_analysis", text: "現在のフェーズ: 競合調査", questions: 3 },
];

export async function POST(request: Request) {
  try {
    await fs.mkdir('/tmp', { recursive: true }).catch(error => {
      console.error(`Error creating /tmp directory: ${error}`);
    });

    const { message: userMessage, theme } = await request.json();
    if (!theme) {
      return NextResponse.json({ error: 'テーマが指定されていません' }, { status: 400 });
    }

    let context = "";
    let currentPhaseIndex = 0;
    let currentPhaseQuestionCount = 0;
    let totalQuestionCount = 0;
    const themeDocRef = doc(db, "themes", theme);
    const messageCollectionRef = collection(themeDocRef, "messages");

    try {
      const q = query(messageCollectionRef, orderBy("createdAt", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const lastMessage = querySnapshot.docs[0].data();
        if (lastMessage.sender === "bot" && lastMessage.type === "interview") {
          totalQuestionCount = querySnapshot.size;
          currentPhaseIndex = phases.findIndex((phase, index) =>
            totalQuestionCount < phases.slice(0, index + 1).reduce((sum, p) => sum + p.questions, 0)
          );
          currentPhaseQuestionCount = totalQuestionCount - phases.slice(0, currentPhaseIndex).reduce((sum, p) => sum + p.questions, 0);
        }
      }
    } catch (error) {
      console.error('Firebaseからのデータ取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    try {
      await addDoc(messageCollectionRef, {
        text: userMessage,
        sender: "user",
        createdAt: serverTimestamp(),
        type: "interview",
      });
    } catch (error) {
      console.error('ユーザーメッセージの保存中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'メッセージの保存に失敗しました' }, { status: 500 });
    }

    if (!userMessage) {
      try {
        const messages: Message[] = [
          {
            text: 'インタビューを始めます。まずはあなたの基本的なプロフィールについて教えてください。',
            audio: await audioFileToBase64('intro_0.wav'),
            lipsync: await readJsonTranscript(path.join('/tmp', `message_${totalQuestionCount}.json`)),
            facialExpression: 'smile',
            animation: 'Talking_1',
          },
        ];
        return NextResponse.json({ messages });
      } catch (error) {
        console.error('初期メッセージの生成中にエラーが発生しました:', error);
        return NextResponse.json({ error: '初期メッセージの生成に失敗しました' }, { status: 500 });
      }
    }

    context += "\nUser: " + userMessage;

    const updatePhase = () => {
      if (currentPhaseQuestionCount >= phases[currentPhaseIndex].questions) {
        currentPhaseIndex++;
        currentPhaseQuestionCount = 0;
      }
    };

    if (currentPhaseIndex < phases.length) {
      const currentPhase = phases[currentPhaseIndex];
      const currentTemplate = currentPhase.template;

      try {
        await addDoc(messageCollectionRef, {
          text: currentPhase.text,
          sender: "bot",
          createdAt: serverTimestamp(),
          type: "interview",
        });
      } catch (error) {
        console.error('フェーズ情報の保存中にエラーが発生しました:', error);
        return NextResponse.json({ error: 'フェーズ情報の保存に失敗しました' }, { status: 500 });
      }

      const prompt = templates[currentTemplate as keyof typeof templates]
        .replace("{theme}", theme)
        .replace("{context}", context);

      try {
        const gpt4Response = await openai.chat.completions.create({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userMessage }
          ],
          model: "gpt-4"
        });

        const botResponseText = gpt4Response.choices[0].message.content ?? null;

        if (botResponseText) {
          const fileName = `message_${totalQuestionCount}.mp3`;
          await generateAudio(botResponseText, fileName);
          await lipSyncMessage(totalQuestionCount);

          const botMessage: Message = {
            text: botResponseText,
            audio: await audioFileToBase64(fileName),
            lipsync: await readJsonTranscript(path.join('/tmp', `message_${totalQuestionCount}.json`)),
            facialExpression: 'smile',
            animation: 'Talking_1',
          };

          await addDoc(messageCollectionRef, {
            ...botMessage,
            sender: "bot",
            createdAt: serverTimestamp(),
            type: "interview",
          });

          context += "\nBot: " + botResponseText;
          currentPhaseQuestionCount++;
          updatePhase();

          return NextResponse.json({ messages: [botMessage] });
        } else {
          console.error('botResponseTextがnullです');
          return NextResponse.json({ error: 'AI応答の生成に失敗しました' }, { status: 500 });
        }
      } catch (error) {
        console.error('GPT-4 APIの呼び出し中にエラーが発生しました:', error);
        return NextResponse.json({ error: 'AI応答の生成に失敗しました' }, { status: 500 });
      }
    } else {
      try {
        await addDoc(messageCollectionRef, {
          text: "インタビューを終了します。ありがとうございました。",
          sender: "bot",
          createdAt: serverTimestamp(),
          type: "interview",
        });

        console.log("レポート作成中");
        const reportPrompt = templates.summary
          .replace("{theme}", theme)
          .replace("{context}", context);

        const reportResponse = await openai.chat.completions.create({
          messages: [
            { role: "system", content: "あなたは優秀なマーケティングアナリストです。" },
            { role: "user", content: reportPrompt }
          ],
          model: "gpt-4"
        });

        const report = reportResponse.choices[0].message.content;

        await addDoc(messageCollectionRef, {
          text: report,
          sender: "bot",
          createdAt: serverTimestamp(),
          type: "report"
        });

        return NextResponse.json({ messages: [{ text: "インタビューが終了しました。レポートを生成しました。" }] });
      } catch (error) {
        console.error('レポート生成中にエラーが発生しました:', error);
        return NextResponse.json({ error: 'レポートの生成に失敗しました' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
    return NextResponse.json({ error: '予期せぬエラーが発生しました' }, { status: 500 });
  }
}













// // if (questionCount === 0) {
// //   currentTemplate = "personal_attributes";
// //   await addDoc(messageCollectionRef, {
// //     text: "現在のフェーズ: プロフィール",
// //     sender: "bot",
// //     createdAt: serverTimestamp(),
// //     type: "phase",
// //   });
// // } else if (questionCount === 1) {
// //   currentTemplate = "usage_situation";
// //   console.log("現在のフェーズ: 利用状況の把握");
// //   await addDoc(messageCollectionRef, {
// //     text: "現在のフェーズ: 利用状況の把握",
// //     sender: "bot",
// //     createdAt: serverTimestamp(),
// //     type: "interview",
// //   });
// // } else if (questionCount === 2) {
// //   currentTemplate = "purchase_intention";
// //   console.log("現在のフェーズ: 購入意思の把握");
// //   await addDoc(messageCollectionRef, {
// //     text: "現在のフェーズ: 購入意思の把握",
// //     sender: "bot",
// //     createdAt: serverTimestamp(),
// //     type: "interview",
// //   });
// // } else if (questionCount === 3) {
// //   currentTemplate = "competitor_analysis";
// //   console.log("現在のフェーズ: 競合調査");
// //   await addDoc(messageCollectionRef, {
// //     text: "現在のフェーズ: 競合調査",
// //     sender: "bot",
// //     createdAt: serverTimestamp(),
// //     type: "interview",
// //   });
// // } else if (questionCount >= 4) {
// //   await addDoc(messageCollectionRef, {
// //     text: "インタビューを終了します。ありがとうございました。",
// //     sender: "bot",
// //     createdAt: serverTimestamp(),
// //     type: "interview",
// //   });

















// // import { exec } from 'child_process';
// // import { promises as fs } from 'fs';
// // import OpenAI from 'openai';
// // import { NextResponse } from 'next/server';

// // const openai = new OpenAI({
// //   apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
// // });

// // interface LipSync {
// //     mouthCues: Array<{
// //         start: number;
// //         end: number
// //         value: string;
// //     }>;
// // }

// // interface Message {
// //     text: string;
// //     audio: string;
// //     lipsync: LipSync;
// //     facialExpression: string;
// //     animation: string;
// // }

// // const execCommand = (command: string): Promise<string> => {
// //   return new Promise((resolve, reject) => {
// //     exec(command, (error, stdout) => {
// //       if (error) reject(error);
// //       resolve(stdout);
// //     });
// //   });
// // };

// // const lipSyncMessage = async (message: number): Promise<void> => {
// //   const time = new Date().getTime();
// //   console.log(`Starting conversion for message ${message}`);
// //   await execCommand(
// //     `ffmpeg -y -i /tmp/message_${message}.mp3 /tmp/message_${message}.wav`
// //   );
// //   console.log(`Conversion done in ${new Date().getTime() - time}ms`);
// //   await execCommand(
// //     `./bin/rhubarb -f json -o /tmp/message_${message}.json /tmp/message_${message}.wav -r phonetic`
// //   );
// //   console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
// // };

// // const generateAudio = async (text: string, fileName: string): Promise<void> => {
// //   const mp3 = await openai.audio.speech.create({
// //     model: 'tts-1',
// //     voice: 'alloy',
// //     input: text,
// //   });

// //   const buffer = Buffer.from(await mp3.arrayBuffer());
// //   await fs.writeFile(fileName, buffer);
// // };

// // const readJsonTranscript = async (file: string): Promise<LipSync> => {
// //   const data = await fs.readFile(file, 'utf8');
// //   return JSON.parse(data);
// // };

// // const audioFileToBase64 = async (file: string): Promise<string> => {
// //   const data = await fs.readFile(file);
// //   return data.toString('base64');
// // };

// // export async function POST(request: Request) {
// //   const { message: userMessage } = await request.json();

// //   if (!userMessage) {
// //     const messages: Message[] = [
// //       {
// //         text: 'Hey dear... How was your day?',
// //         audio: await audioFileToBase64('/tmp/intro_0.wav'),
// //         lipsync: await readJsonTranscript('/tmp/intro_0.json'),
// //         facialExpression: 'smile',
// //         animation: 'Talking_1',
// //       },
// //       {
// //         text: "I missed you so much... Please don't go for so long!",
// //         audio: await audioFileToBase64('/tmp/intro_1.wav'),
// //         lipsync: await readJsonTranscript('/tmp/intro_1.json'),
// //         facialExpression: 'sad',
// //         animation: 'Crying',
// //       },
// //     ];
// //     return NextResponse.json({ messages });
// //   }

// //   if (openai.apiKey === '-') {
// //     const messages: Message[] = [
// //       {
// //         text: "Please my dear, don't forget to add your API key!",
// //         audio: await audioFileToBase64('/tmp/api_0.wav'),
// //         lipsync: await readJsonTranscript('/tmp/api_0.json'),
// //         facialExpression: 'angry',
// //         animation: 'Angry',
// //       },
// //       {
// //         text: "You don't want to ruin Wawa Sensei with a crazy OpenAI bill, right?",
// //         audio: await audioFileToBase64('/tmp/api_1.wav'),
// //         lipsync: await readJsonTranscript('/tmp/api_1.json'),
// //         facialExpression: 'smile',
// //         animation: 'Laughing',
// //       },
// //     ];
// //     return NextResponse.json({ messages });
// //   }

// //   const completion = await openai.chat.completions.create({
// //     model: 'gpt-3.5-turbo-1106',
// //     max_tokens: 1000,
// //     temperature: 0.6,
// //     response_format: { type: 'json_object' },
// //     messages: [
// //       {
// //         role: 'system',
// //         content: `
// //         You are a virtual girlfriend.
// //         You will always reply with a JSON array of messages. With a maximum of 3 messages.
// //         Each message has a text, facialExpression, and animation property.
// //         The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
// //         The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry. 
// //         `,
// //       },
// //       {
// //         role: 'user',
// //         content: userMessage || 'Hello',
// //       },
// //     ],
// //   });

// //   const messages: Message[] = JSON.parse(completion.choices[0].message.content ?? '{"messages":[]}').messages;
// //   for (let i = 0; i < messages.length; i++) {
// //     const message = messages[i];
// //     const fileName = `/tmp/message_${i}.mp3`;
// //     await generateAudio(message.text, fileName);
// //     await lipSyncMessage(i);
// //     message.audio = await audioFileToBase64(fileName);
// //     message.lipsync = await readJsonTranscript(`/tmp/message_${i}.json`);
// //   }

// //   return NextResponse.json({ messages });
// // }
