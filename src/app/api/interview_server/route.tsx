import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { addDoc, collection, doc, serverTimestamp, getDocs, query, orderBy, where, getCountFromServer, getDoc, CollectionReference } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { protos, SpeechClient } from '@google-cloud/speech';
import axios from 'axios';
import { kv } from '@vercel/kv';

type ISpeechRecognitionResult = protos.google.cloud.speech.v1.ISpeechRecognitionResult;

const startTimer = (label: string) => {  // timer
  console.time(label);
  return () => console.timeEnd(label);
};

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
  'ア': 'O', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
  'a': 'O', 'i': 'I', 'u': 'U', 'e': 'E', 'o': 'O',
  'カ': 'O', 'キ': 'I', 'ク': 'U', 'ケ': 'E', 'コ': 'O',
  'ka': 'O', 'ki': 'I', 'ku': 'U', 'ke': 'E', 'ko': 'O',
  'サ': 'I', 'シ': 'I', 'ス': 'U', 'セ': 'E', 'ソ': 'O',
  'sa': 'I', 'shi': 'I', 'su': 'U', 'se': 'E', 'so': 'O',
  'タ': 'I', 'チ': 'I', 'ツ': 'U', 'テ': 'E', 'ト': 'O',
  'ta': 'I', 'chi': 'I', 'tsu': 'U', 'te': 'E', 'to': 'O',
  'ナ': 'O', 'ニ': 'I', 'ヌ': 'U', 'ネ': 'E', 'ノ': 'O',
  'na': 'O', 'ni': 'I', 'nu': 'U', 'ne': 'E', 'no': 'O',
  'ハ': 'O', 'ヒ': 'I', 'フ': 'U', 'ヘ': 'E', 'ホ': 'O',
  'ha': 'O', 'hi': 'I', 'fu': 'U', 'he': 'E', 'ho': 'O',
  'マ': 'C', 'ミ': 'I', 'ム': 'U', 'メ': 'E', 'モ': 'O',
  'ma': 'C', 'mi': 'I', 'mu': 'U', 'me': 'E', 'mo': 'O',
  'ヤ': 'I', 'ユ': 'U', 'ヨ': 'O',
  'ya': 'I', 'yu': 'U', 'yo': 'O',
  'ラ': 'O', 'リ': 'I', 'ル': 'U', 'レ': 'E', 'ロ': 'O',
  'ra': 'O', 'ri': 'I', 'ru': 'U', 're': 'E', 'ro': 'O',
  'ワ': 'U', 'ヲ': 'O',
  'wa': 'U', 'wo': 'O',
  'ン': 'C', 'n': 'C',
  // 濁音
  'ガ': 'O', 'ギ': 'I', 'グ': 'U', 'ゲ': 'E', 'ゴ': 'O',
  'ga': 'O', 'gi': 'I', 'gu': 'U', 'ge': 'E', 'go': 'O',
  'ザ': 'I', 'ジ': 'I', 'ズ': 'U', 'ゼ': 'E', 'ゾ': 'O',
  'za': 'I', 'ji': 'I', 'zu': 'U', 'ze': 'E', 'zo': 'O',
  'ダ': 'O', 'ヂ': 'I', 'ヅ': 'U', 'デ': 'E', 'ド': 'O',
  'da': 'O', 'di': 'I', 'du': 'U', 'de': 'E', 'do': 'O',
  'バ': 'C', 'ビ': 'I', 'ブ': 'U', 'ベ': 'E', 'ボ': 'O',
  'ba': 'C', 'bi': 'I', 'bu': 'U', 'be': 'E', 'bo': 'O',
  // 半濁音
  'パ': 'C', 'ピ': 'I', 'プ': 'U', 'ペ': 'E', 'ポ': 'O',
  'pa': 'C', 'pi': 'I', 'pu': 'U', 'pe': 'E', 'po': 'O',
  // 拗音
  'キャ': 'I', 'キュ': 'U', 'キョ': 'O',
  'kya': 'I', 'kyu': 'U', 'kyo': 'O',
  'シャ': 'I', 'シュ': 'U', 'ショ': 'O',
  'sha': 'I', 'shu': 'U', 'sho': 'O',
  'チャ': 'I', 'チュ': 'U', 'チョ': 'O',
  'cha': 'I', 'chu': 'U', 'cho': 'O',
  'ニャ': 'I', 'ニュ': 'U', 'ニョ': 'O',
  'nya': 'I', 'nyu': 'U', 'nyo': 'O',
  'ヒャ': 'I', 'ヒュ': 'U', 'ヒョ': 'O',
  'hya': 'I', 'hyu': 'U', 'hyo': 'O',
  'ミャ': 'I', 'ミュ': 'U', 'ミョ': 'O',
  'mya': 'I', 'myu': 'U', 'myo': 'O',
  'リャ': 'I', 'リュ': 'U', 'リョ': 'O',
  'rya': 'I', 'ryu': 'U', 'ryo': 'O',
  'ギャ': 'I', 'ギュ': 'U', 'ギョ': 'O',
  'gya': 'I', 'gyu': 'U', 'gyo': 'O',
  'ジャ': 'I', 'ジュ': 'U', 'ジョ': 'O',
  'ja': 'I', 'ju': 'U', 'jo': 'O',
  'ビャ': 'I', 'ビュ': 'U', 'ビョ': 'O',
  'bya': 'I', 'byu': 'U', 'byo': 'O',
  'ピャ': 'I', 'ピュ': 'U', 'ピョ': 'O',
  'pya': 'I', 'pyu': 'U', 'pyo': 'O',
  // 外来音
  'ファ': 'U', 'フィ': 'I', 'フェ': 'E', 'フォ': 'O',
  'fa': 'U', 'fi': 'I', 'fe': 'E', 'fo': 'O',
  'ヴァ': 'U', 'ヴィ': 'I', 'ヴ': 'U', 'ヴェ': 'E', 'ヴォ': 'O',
  'va': 'U', 'vi': 'I', 've': 'E', 'vo': 'O',
  'ティ': 'I', 'トゥ': 'U',
  'ti': 'I', 'tu': 'U',
  'ウィ': 'I', 'ウェ': 'E',
  'wi': 'I', 'we': 'E',
  'クァ': 'O', 'クィ': 'I', 'クェ': 'E', 'クォ': 'O',
  'kwa': 'O', 'kwi': 'I', 'kwe': 'E', 'kwo': 'O',
  'グァ': 'O',
  'gwa': 'O',
  // 長音
  'ー': 'C',
  'ァ': 'O', 'ィ': 'I', 'ゥ': 'U', 'ェ': 'E', 'ォ': 'O',
  'ッ': 'C', 'ャ': 'I', 'ュ': 'U', 'ョ': 'O',
};

const audioCache = new Map<string, Buffer>();
const lipSyncCache = new Map<string, LipSync>();
// const phonemeCache = new Map<string, string[]>();
const memoryPhonemeCache = new Map<string, string[]>();  // メモリキャッシュとVercel KVに保存用

const generateLipSyncFromTranscription = async (results: ISpeechRecognitionResult[]): Promise<LipSync> => {
  const lipSyncData: LipSync = {
    mouthCues: [],
    blinkCues: [],
    emotionCues: []
  };
  let lastEndTime = 0;

  const words = results.flatMap(result => result.alternatives?.[0]?.words || []);
  const endTimerPhonemes = startTimer('Japanese Phonemes Generation');  // timer
  const phonemePromises = words.map(async (word, index) => {
    const phonemes = await getJapanesePhonemes(word.word || '');
    return { index, word, phonemes };
  });
  endTimerPhonemes();  // timer
  const phonemeResults = await Promise.all(phonemePromises);
  phonemeResults.sort((a, b) => a.index - b.index);

  for (const { word, phonemes } of phonemeResults) {
    const start = word.startTime?.seconds !== undefined ? Number(word.startTime.seconds) + (word.startTime.nanos || 0) / 1e9 : 0;
    const end = word.endTime?.seconds !== undefined ? Number(word.endTime.seconds) + (word.endTime.nanos || 0) / 1e9 : 0;

    let frameNum = 1;
    for (let index = 0; index < phonemes.length; index+=frameNum) {
      const phoneme = phonemes[index];
      const phonemeDuration = (end - start) / (phonemes.length / frameNum);
      const phonemeStart = start + (index / frameNum) * phonemeDuration;
      const phonemeEnd = phonemeStart + phonemeDuration;

      const viseme = japanesePhonemeToViseme[phoneme] || 'C';
      const intensity = viseme === 'C' ? 0.2 : 0.8;
    
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

  const endTimerEmotionAnalysis = startTimer('Emotion Analysis');  // timer
  lipSyncData.emotionCues = analyzeEmotions(results, lastEndTime);
  endTimerEmotionAnalysis();  // timer
  return lipSyncData;
};


const getJapanesePhonemes = async (word: string): Promise<string[]> => {
  // メモリキャッシュを確認
  if (memoryPhonemeCache.has(word)) {
    return memoryPhonemeCache.get(word)!;
  }

  // Vercel KVを確認
  const kvKey = `phoneme:${word}`;
  const cachedPhonemes = await kv.get<string[]>(kvKey);
  if (cachedPhonemes) {
    memoryPhonemeCache.set(word, cachedPhonemes);
    return cachedPhonemes;
  }

  try {
    const response = await axios.post('https://labs.goo.ne.jp/api/morph', {
      app_id: process.env.GOO_LAB_APP_ID,
      sentence: word,
      info_filter: 'form|read'
    });

    if (response.data.word_list && response.data.word_list[0]) {
      const phonemes = response.data.word_list[0].flatMap((item: string[]) => {
        const reading = item[1] || item[0];
        return reading.split('');
      });
      
      // メモリキャッシュとVercel KVに保存
      memoryPhonemeCache.set(word, phonemes);
      await kv.set(kvKey, phonemes, { ex: 86400 }); // 1日間キャッシュ

      return phonemes;
    } else {
      console.error('Unexpected API response structure:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Error in getJapanesePhonemes:', error);
    return [];
  }
};
// const getJapanesePhonemes = async (word: string): Promise<string[]> => {
//   if (phonemeCache.has(word)) {
//     return phonemeCache.get(word)!;
//   }

//   try {
//     const response = await axios.post('https://labs.goo.ne.jp/api/morph', {
//       app_id: process.env.GOO_LAB_APP_ID,
//       sentence: word,
//       info_filter: 'form|read'
//     });

//     if (response.data.word_list && response.data.word_list[0]) {
//       const phonemes = response.data.word_list[0].flatMap((item: string[]) => {
//         const reading = item[1] || item[0];
//         return reading.split('');
//       });
//       phonemeCache.set(word, phonemes);
//       return phonemes;
//     } else {
//       console.error('Unexpected API response structure:', response.data);
//       return [];
//     }
//   } catch (error) {
//     console.error('Error in getJapanesePhonemes:', error);
//     return [];
//   }
// };

// const getIntensity = (phoneme: string, index: number, totalPhonemes: number): number => {
//   let baseIntensity = 0.5 + (index / totalPhonemes) * 0.5;
//   if ('アイウエオァィゥェォ'.includes(phoneme)) baseIntensity *= 1.2;
//   return Math.min(baseIntensity, 1);
// };

const analyzeEmotions = (results: ISpeechRecognitionResult[], duration: number): Array<{ start: number; end: number; emotion: string; intensity: number; }> => {
  const endTimerEmotionAnalysis = startTimer('Analyze Emotions');  // timer
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

  endTimerEmotionAnalysis();  // timer
  return emotionCues;
};



const lipSyncMessage = async (message: number): Promise<LipSync> => {
  const endTimerLipSync = startTimer('Lip Sync Message');  // timer
  // console.log(`メッセージ ${message} の変換を開始します`);
  try {
    const fileName = `message_${message}.mp3`;
    const audioBuffer = memoryCache.audioFiles.get(fileName);
    if (!audioBuffer) {
      throw new Error(`Audio file not found in memory cache: ${fileName}`);
    }

    // キャッシュの確認
    if (lipSyncCache.has(fileName)) {
      return lipSyncCache.get(fileName)!;
    }

    const endTimerSpeechClient = startTimer('Speech Client Creation');  // timer
    const client = new SpeechClient({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.GCP_CLIENT_EMAIL,
      },
    });
    endTimerSpeechClient();  // timer

    if (!process.env.GCP_PROJECT_ID || !process.env.GCP_PRIVATE_KEY || !process.env.GCP_CLIENT_EMAIL) {
      throw new Error('Google Cloud 認証情報が不足しています。環境変数を確認してください。');
    }

    // 音声認識
    const audio: protos.google.cloud.speech.v1.IRecognitionAudio = {
      content: audioBuffer,
    };
    const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
      encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3,
      sampleRateHertz: 8000,
      languageCode: 'ja-JP',
      enableWordTimeOffsets: true,
    };
    const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
      audio: audio,
      config: config,
    };
    const endTimerSpeechRecognition = startTimer('Speech Recognition');  // timer
    const [response] = await client.recognize(request);
    endTimerSpeechRecognition();  // timer
    // console.log(`文字起こし完了: ${new Date().getTime() - time}ms`);

    if (!response.results || response.results.length === 0) {
      throw new Error('音声認識結果が空です');
    }

    // リップシンクデータの生成
    const endTimerLipSyncGeneration = startTimer('Lip Sync Generation');  // timer
    const lipSyncData = await generateLipSyncFromTranscription(response.results);
    endTimerLipSyncGeneration();  // timer

    memoryCache.lipSyncData.set(`message_${message}`, lipSyncData);
    // console.log(`リップシンク完了: ${new Date().getTime() - time}ms`);

    return lipSyncData;
  } catch (error) {
    console.error(`lipSyncMessageでエラーが発生しました: ${error}`);
    throw error;
  } finally {  // timer
    endTimerLipSync();
  }
};

// 音声処理
const generateAudio = async (text: string, fileName: string): Promise<void> => {
  const endTimerGenerateAudio = startTimer('Generate Audio');  // timer
  try {
    // 音声データのキャッシュを実装して、同じテキストの音声を再利用
    if (audioCache.has(text)) {
      memoryCache.audioFiles.set(fileName, audioCache.get(text)!);
      console.log(`Audio data retrieved from cache for ${fileName}`);
      return;
    }

    const endTimerOpenAIAPI = startTimer('OpenAI API Call mp3');  // timer
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
    });
    endTimerOpenAIAPI();  // timer

    const endTimerBufferCreation = startTimer('Buffer Creation');  // timer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    endTimerBufferCreation();  // timer

    // キャッシュに保存
    const endTimerCacheStore = startTimer('Cache Store');  // timer
    audioCache.set(text, buffer);
    memoryCache.audioFiles.set(fileName, buffer);
    endTimerCacheStore();  // timer

    // console.log(`Audio data successfully stored in memory cache for ${fileName}`);
  } catch (error) {
    console.error(`Error in generateAudio: ${error}`);
    throw error;
  } finally {  // timer
    endTimerGenerateAudio();
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
  const endTimer = startTimer('POST function total time');  // timer
  try {
    const { message: userMessage, themeId } = await request.json();
    // const endTimerUserMessage = startTimer('User message processing');  // timer
    if (!themeId) {
      console.error('テーマIDが指定されていません');
      // endTimerUserMessage();  // timer
      return NextResponse.json({ error: 'テーマIDが指定されていません' }, { status: 400 });
    }

    let context = "";
    let currentPhaseIndex = 0;
    let totalQuestionCount = 0;

    // const endTimerThemeDoc = startTimer('Theme document retrieval');  // timer
    const themeDocRef = doc(db, "themes", themeId);
    const themeDocSnap = await getDoc(themeDocRef);
    if (!themeDocSnap.exists()) {
      console.error('指定されたテーマIDのドキュメントが存在しません');
      // endTimerThemeDoc();  // timer
      return NextResponse.json({ error: '指定されたテーマIDのドキュメントが存在しません' }, { status: 404 });
    }

    const theme = themeDocSnap.data().name;
    // endTimerThemeDoc();  // timer

    const messageCollectionRef = collection(themeDocRef, "messages");

    // const endTimerMessageCount = startTimer('Message count retrieval');  // timer
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
      // endTimerMessageCount();  // timer
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }
    // endTimerMessageCount();  // timer

    // const endTimerContext = startTimer('Context retrieval');  // timer
    try {
      const q = query(messageCollectionRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
      });
    } catch (error) {
      console.error('コンテキストの取得中にエラーが発生しました:', error);
      // endTimerContext();  // timer
      return NextResponse.json({ error: 'コンテキストの取得に失敗しました' }, { status: 500 });
    }
    // endTimerContext();  // timer

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

      // const endTimerGPT4 = startTimer('GPT API call');  // timer
      try {
        const endTimerAPICall = startTimer('OpenAI API Call');  // timer
        const gpt4Response = await openai.chat.completions.create({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userMessage }
          ],
          // model: "gpt-4"
          model: "gpt-3.5-turbo"
        });
        endTimerAPICall();  // timer

        // const endTimerResponseGeneration = startTimer('Bot Response Generation');  // timer
        const botResponseText = gpt4Response.choices[0].message.content ?? null;
        // endTimerResponseGeneration();  // timer

        if (botResponseText) {
          const endTimerTextProcessing = startTimer('Text Processing');  // timer
          const fileName = `message_${totalQuestionCount}.mp3`;
          const endTimerAudioGeneration = startTimer('Audio Generation');  // timer
          await generateAudio(botResponseText, fileName);
          endTimerAudioGeneration();  // timer

          const endTimerLipSyncProcessing = startTimer('Lip Sync Processing');  // timer
          await lipSyncMessage(totalQuestionCount);
          endTimerLipSyncProcessing();  // timer

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

          endTimerTextProcessing();  // timer
          // endTimerUserMessage();  // timer
          // endTimerGPT4();  // timer
          return NextResponse.json({ messages: [botMessage] });
        } else {
          console.error('botResponseTextがnullです');
          return NextResponse.json({ error: 'AI応答の生成に失敗しました' }, { status: 500 });
        }
      } catch (error) {
        console.error('GPT APIの呼び出し中にエラーが発生しました:', error);
        return NextResponse.json({ error: 'AI応答の生成に失敗しました' }, { status: 500 });
      } finally {  // timer
        // endTimerGPT4();
      }
    } else {
      return await handleInterviewEnd(messageCollectionRef);
    }
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
    return NextResponse.json({ error: '予期せぬエラーが発生しました' }, { status: 500 });
  } finally {  // timer
    endTimer();
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