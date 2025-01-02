import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { addDoc, collection, doc, serverTimestamp, getDocs, query, orderBy, where, getCountFromServer, getDoc, CollectionReference } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { protos, SpeechClient } from '@google-cloud/speech';
import axios from 'axios';

type ISpeechRecognitionResult = protos.google.cloud.speech.v1.ISpeechRecognitionResult;

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
});

interface LipSync {
  mouthCues: Array<{ start: number; end: number; value: string; intensity: number; }>;
  blinkCues: Array<{ time: number; duration: number; }>;
  emotionCues: Array<{ start: number; end: number; emotion: string; intensity: number; }>;
}

interface Message {
  text: string;
  audio: string;
  lipsync: LipSync;
  facialExpression: string;
  animation: string;
}

const memoryCache: {
  audioFiles: Map<string, Buffer>;
  lipSyncData: Map<string, LipSync>;
} = {
  audioFiles: new Map(),
  lipSyncData: new Map()
};

const japanesePhonemeToViseme: { [key: string]: string } = {
  'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
  'a': 'A', 'i': 'I', 'u': 'U', 'e': 'E', 'o': 'O',
  'カ': 'K', 'キ': 'KI', 'ク': 'KU', 'ケ': 'KE', 'コ': 'KO',
  'ka': 'K', 'ki': 'KI', 'ku': 'KU', 'ke': 'KE', 'ko': 'KO',
  'サ': 'S', 'シ': 'SH', 'ス': 'S', 'セ': 'S', 'ソ': 'S',
  'sa': 'S', 'shi': 'SH', 'su': 'S', 'se': 'S', 'so': 'S',
  'タ': 'T', 'チ': 'CH', 'ツ': 'TS', 'テ': 'T', 'ト': 'T',
  'ta': 'T', 'chi': 'CH', 'tsu': 'TS', 'te': 'T', 'to': 'T',
  'ナ': 'N', 'ニ': 'N', 'ヌ': 'N', 'ネ': 'N', 'ノ': 'N',
  'na': 'N', 'ni': 'N', 'nu': 'N', 'ne': 'N', 'no': 'N',
  'ハ': 'F', 'ヒ': 'F', 'フ': 'F', 'ヘ': 'F', 'ホ': 'F',
  'ha': 'F', 'hi': 'F', 'fu': 'F', 'he': 'F', 'ho': 'F',
  'マ': 'M', 'ミ': 'M', 'ム': 'M', 'メ': 'M', 'モ': 'M',
  'ma': 'M', 'mi': 'M', 'mu': 'M', 'me': 'M', 'mo': 'M',
  'ヤ': 'I', 'ユ': 'U', 'ヨ': 'O',
  'ya': 'I', 'yu': 'U', 'yo': 'O',
  'ラ': 'R', 'リ': 'R', 'ル': 'R', 'レ': 'R', 'ロ': 'R',
  'ra': 'R', 'ri': 'R', 'ru': 'R', 're': 'R', 'ro': 'R',
  'ワ': 'W', 'ヲ': 'W',
  'wa': 'W', 'wo': 'W',
  'ン': 'N', 'n': 'N',
  // 濁音
  'ガ': 'K', 'ギ': 'KI', 'グ': 'KU', 'ゲ': 'KE', 'ゴ': 'KO',
  'ga': 'K', 'gi': 'KI', 'gu': 'KU', 'ge': 'KE', 'go': 'KO',
  'ザ': 'S', 'ジ': 'CH', 'ズ': 'S', 'ゼ': 'S', 'ゾ': 'S',
  'za': 'S', 'ji': 'CH', 'zu': 'S', 'ze': 'S', 'zo': 'S',
  'ダ': 'T', 'ヂ': 'CH', 'ヅ': 'TS', 'デ': 'T', 'ド': 'T',
  'da': 'T', 'di': 'CH', 'du': 'TS', 'de': 'T', 'do': 'T',
  'バ': 'M', 'ビ': 'M', 'ブ': 'M', 'ベ': 'M', 'ボ': 'M',
  'ba': 'M', 'bi': 'M', 'bu': 'M', 'be': 'M', 'bo': 'M',
  // 半濁音
  'パ': 'M', 'ピ': 'M', 'プ': 'M', 'ペ': 'M', 'ポ': 'M',
  'pa': 'M', 'pi': 'M', 'pu': 'M', 'pe': 'M', 'po': 'M',
  // 拗音
  'キャ': 'KI', 'キュ': 'KU', 'キョ': 'KO',
  'kya': 'KI', 'kyu': 'KU', 'kyo': 'KO',
  'シャ': 'SH', 'シュ': 'SH', 'ショ': 'SH',
  'sha': 'SH', 'shu': 'SH', 'sho': 'SH',
  'チャ': 'CH', 'チュ': 'CH', 'チョ': 'CH',
  'cha': 'CH', 'chu': 'CH', 'cho': 'CH',
  'ニャ': 'N', 'ニュ': 'N', 'ニョ': 'N',
  'nya': 'N', 'nyu': 'N', 'nyo': 'N',
  'ヒャ': 'F', 'ヒュ': 'F', 'ヒョ': 'F',
  'hya': 'F', 'hyu': 'F', 'hyo': 'F',
  'ミャ': 'M', 'ミュ': 'M', 'ミョ': 'M',
  'mya': 'M', 'myu': 'M', 'myo': 'M',
  'リャ': 'R', 'リュ': 'R', 'リョ': 'R',
  'rya': 'R', 'ryu': 'R', 'ryo': 'R',
  'ギャ': 'KI', 'ギュ': 'KU', 'ギョ': 'KO',
  'gya': 'KI', 'gyu': 'KU', 'gyo': 'KO',
  'ジャ': 'CH', 'ジュ': 'CH', 'ジョ': 'CH',
  'ja': 'CH', 'ju': 'CH', 'jo': 'CH',
  'ビャ': 'M', 'ビュ': 'M', 'ビョ': 'M',
  'bya': 'M', 'byu': 'M', 'byo': 'M',
  'ピャ': 'M', 'ピュ': 'M', 'ピョ': 'M',
  'pya': 'M', 'pyu': 'M', 'pyo': 'M',
  // 外来音
  'ファ': 'F', 'フィ': 'F', 'フェ': 'F', 'フォ': 'F',
  'fa': 'F', 'fi': 'F', 'fe': 'F', 'fo': 'F',
  'ヴァ': 'F', 'ヴィ': 'F', 'ヴ': 'F', 'ヴェ': 'F', 'ヴォ': 'F',
  'va': 'F', 'vi': 'F', 've': 'F', 'vo': 'F',
  'ティ': 'CH', 'トゥ': 'TS',
  'ti': 'CH', 'tu': 'TS',
  'ウィ': 'W', 'ウェ': 'W',
  'wi': 'W', 'we': 'W',
  'クァ': 'KU', 'クィ': 'KI', 'クェ': 'KE', 'クォ': 'KO',
  'kwa': 'KU', 'kwi': 'KI', 'kwe': 'KE', 'kwo': 'KO',
  'グァ': 'KU',
  'gwa': 'KU',
  // 長音
  'ー': 'X',
  'ァ': 'A', 'ィ': 'I', 'ゥ': 'U', 'ェ': 'E', 'ォ': 'O',
  'ッ': 'TS', 'ャ': 'I', 'ュ': 'U', 'ョ': 'O',
};


const generateLipSyncFromTranscription = async (results: ISpeechRecognitionResult[]): Promise<LipSync> => {
  const lipSyncData: LipSync = {
    mouthCues: [],
    blinkCues: [],
    emotionCues: []
  };
  let lastEndTime = 0;

  for (const result of results) {
    if (result.alternatives && result.alternatives[0] && result.alternatives[0].words) {
      for (const word of result.alternatives[0].words) {
        const start = word.startTime?.seconds !== undefined ? Number(word.startTime.seconds) + (word.startTime.nanos || 0) / 1e9 : 0;
        const end = word.endTime?.seconds !== undefined ? Number(word.endTime.seconds) + (word.endTime.nanos || 0) / 1e9 : 0;
        const phonemes = await getJapanesePhonemes(word.word || '');
        console.log(`Word: ${word.word}, Phonemes: ${phonemes.join(', ')}`);

        for (let index = 0; index < phonemes.length; index++) {
          const phoneme = phonemes[index];
          const phonemeDuration = (end - start) / phonemes.length;
          const phonemeStart = start + index * phonemeDuration;
          const phonemeEnd = phonemeStart + phonemeDuration;
          const viseme = japanesePhonemeToViseme[phoneme] || 'X';
          const intensity = getIntensity(phoneme, index, phonemes.length);
        
          console.log(`Phoneme: ${phoneme}, Viseme: ${viseme}, Intensity: ${intensity}`);
        
          lipSyncData.mouthCues.push({
            start: phonemeStart,
            end: phonemeEnd,
            value: viseme,
            intensity: intensity
          });
        }

        if (Math.random() < 0.2) {
          lipSyncData.blinkCues.push({
            time: end + Math.random() * 0.3,
            duration: 0.1 + Math.random() * 0.1
          });
        }

        lastEndTime = end;
      }
    }
  }

  lipSyncData.emotionCues = analyzeEmotions(results, lastEndTime);
  return lipSyncData;
};

const getJapanesePhonemes = async (word: string): Promise<string[]> => {
  try {
    const response = await axios.post('https://labs.goo.ne.jp/api/morph', {
      app_id: process.env.GOO_LAB_APP_ID,
      sentence: word,
      info_filter: 'form|read'
    });
    console.log('API response:', JSON.stringify(response.data, null, 2));
    if (response.data.word_list && response.data.word_list[0]) {
      return response.data.word_list[0].flatMap((item: string[]) => {
        const reading = item[1] || item[0];
        return reading.split('');
      });
    } else {
      console.error('Unexpected API response structure:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error in getJapanesePhonemes:', error);
    return [];
  }
};

const getIntensity = (phoneme: string, index: number, totalPhonemes: number): number => {
  let baseIntensity = 0.5 + (index / totalPhonemes) * 0.5;
  if ('アイウエオァィゥェォ'.includes(phoneme)) baseIntensity *= 1.2;
  return Math.min(baseIntensity, 1);
};

const analyzeEmotions = (results: ISpeechRecognitionResult[], duration: number): Array<{ start: number; end: number; emotion: string; intensity: number; }> => {
  const emotions = ['neutral', 'happy', 'sad', 'surprised', 'angry'];
  const emotionCues = [];
  let currentTime = 0;

  while (currentTime < duration) {
    const emotionDuration = 1 + Math.random() * 2;
    emotionCues.push({
      start: currentTime,
      end: Math.min(currentTime + emotionDuration, duration),
      emotion: emotions[Math.floor(Math.random() * emotions.length)],
      intensity: 0.5 + Math.random() * 0.5
    });
    currentTime += emotionDuration;
  }

  return emotionCues;
};

const lipSyncMessage = async (message: number): Promise<LipSync> => {
  const time = new Date().getTime();
  console.log(`メッセージ ${message} の変換を開始します`);
  try {
    const fileName = `message_${message}.mp3`;
    const audioBuffer = memoryCache.audioFiles.get(fileName);
    if (!audioBuffer) {
      throw new Error(`Audio file not found in memory cache: ${fileName}`);
    }

    const client = new SpeechClient({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.GCP_CLIENT_EMAIL,
      },
    });

    if (!process.env.GCP_PROJECT_ID || !process.env.GCP_PRIVATE_KEY || !process.env.GCP_CLIENT_EMAIL) {
      throw new Error('Google Cloud 認証情報が不足しています。環境変数を確認してください。');
    }

    const audio: protos.google.cloud.speech.v1.IRecognitionAudio = {
      content: audioBuffer,
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

    const lipSyncData = await generateLipSyncFromTranscription(response.results);
    memoryCache.lipSyncData.set(`message_${message}`, lipSyncData);
    console.log(`リップシンク完了: ${new Date().getTime() - time}ms`);

    return lipSyncData;
  } catch (error) {
    console.error(`lipSyncMessageでエラーが発生しました: ${error}`);
    throw error;
  }
};

const generateAudio = async (text: string, fileName: string): Promise<void> => {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    memoryCache.audioFiles.set(fileName, buffer);
    console.log(`Audio data successfully stored in memory cache for ${fileName}`);
  } catch (error) {
    console.error(`Error in generateAudio: ${error}`);
    throw error;
  }
};

const readJsonTranscript = async (messageId: number): Promise<LipSync> => {
  const lipSyncData = memoryCache.lipSyncData.get(`message_${messageId}`);
  if (!lipSyncData) {
    throw new Error(`LipSync data not found in memory cache for message ${messageId}`);
  }
  return lipSyncData;
};

const audioFileToBase64 = async (fileName: string): Promise<string> => {
  try {
    const audioBuffer = memoryCache.audioFiles.get(fileName);
    if (!audioBuffer) {
      throw new Error(`Audio file not found in memory cache: ${fileName}`);
    }
    return audioBuffer.toString('base64');
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
  thank_you: `インタビューにご協力いただき、ありがとうございました。貴重なご意見を頂戴し、大変参考になりました。`
}

const phases = [
  { template: "personal_attributes", text: "現在のフェーズ: プロフィール", questions: 2 },
  { template: "usage_situation", text: "現在のフェーズ: 利用状況の把握", questions: 3 },
  { template: "purchase_intention", text: "現在のフェーズ: 購入意思の把握", questions: 3 },
  { template: "competitor_analysis", text: "現在のフェーズ: 競合調査", questions: 3 },
  { template: "thank_you", text: "現在のフェーズ: お礼", questions: 1 }
];

export async function POST(request: Request) {
  try {
    const { message: userMessage, themeId } = await request.json();
    if (!themeId) {
      console.error('テーマIDが指定されていません');
      return NextResponse.json({ error: 'テーマIDが指定されていません' }, { status: 400 });
    }

    console.log(`指定されたテーマID: ${themeId}`);
    let context = "";
    let currentPhaseIndex = 0;
    let totalQuestionCount = 0;

    const themeDocRef = doc(db, "themes", themeId);
    const themeDocSnap = await getDoc(themeDocRef);
    if (!themeDocSnap.exists()) {
      console.error('指定されたテーマIDのドキュメントが存在しません');
      return NextResponse.json({ error: '指定されたテーマIDのドキュメントが存在しません' }, { status: 404 });
    }

    const theme = themeDocSnap.data().name;
    console.log(`テーマ名: ${theme}`);

    const messageCollectionRef = collection(themeDocRef, "messages");

    try {
      const botMessagesQuery = query(
        messageCollectionRef,
        where("type", "==", "interview"),
        where("sender", "==", "bot")
      );
      const snapshot = await getCountFromServer(botMessagesQuery);
      totalQuestionCount = snapshot.data().count;
      currentPhaseIndex = phases.findIndex((phase, index) =>
        totalQuestionCount < phases.slice(0, index + 1).reduce((sum, p) => sum + p.questions, 0)
      );
    } catch (error) {
      console.error('Firebaseからのデータ取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    try {
      const q = query(messageCollectionRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
      });
    } catch (error) {
      console.error('コンテキストの取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'コンテキストの取得に失敗しました' }, { status: 500 });
    }

    if (!userMessage) {
      try {
        const messages: Message[] = [
          {
            text: 'インタビューを始めます。まずはあなたの基本的なプロフィールについて教えてください。',
            audio: await audioFileToBase64('intro_0.wav'),
            lipsync: await readJsonTranscript(totalQuestionCount),
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

    context += "\nUser: " + userMessage;

    if (currentPhaseIndex < phases.length) {
      const currentPhase = phases[currentPhaseIndex];
      const currentTemplate = currentPhase.template;
      
      if (currentTemplate === "thank_you") {
        return await handleInterviewEnd(messageCollectionRef);
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
            lipsync: await readJsonTranscript(totalQuestionCount),
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
          totalQuestionCount++;

          if (totalQuestionCount >= phases.slice(0, currentPhaseIndex + 1).reduce((sum, p) => sum + p.questions, 0)) {
            currentPhaseIndex++;
          }

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
      return await handleInterviewEnd(messageCollectionRef);
    }
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
    return NextResponse.json({ error: '予期せぬエラーが発生しました' }, { status: 500 });
  }
}


async function handleInterviewEnd(messageCollectionRef: CollectionReference) {
  try {
    const thanksMessage = templates.thank_you;
    await addDoc(messageCollectionRef, {
      text: thanksMessage,
      sender: "bot",
      createdAt: serverTimestamp(),
      type: "interview",
    });

    return NextResponse.json({ interviewEnd: true });
  } catch (error) {
    console.error('お礼メッセージの保存中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'お礼メッセージの保存に失敗しました' }, { status: 500 });
  }
}