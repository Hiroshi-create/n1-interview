import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { serverTimestamp, CollectionReference, setDoc, doc } from 'firebase/firestore';
import { protos, SpeechClient } from '@google-cloud/speech';
import axios from 'axios';
import { kv } from '@vercel/kv';
import { cleanOperationMessages } from './cleanOperationMessages';
import { v4 as uuidv4 } from 'uuid';

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

const audioCache = new Map<string, Buffer>();
const lipSyncCache = new Map<string, LipSync>();
const memoryPhonemeCache = new Map<string, string[]>();

const generateLipSyncFromTranscription = async (results: ISpeechRecognitionResult[]): Promise<LipSync> => {
    const lipSyncData: LipSync = {
      mouthCues: [],
      blinkCues: [],
      emotionCues: []
    };
    let lastEndTime = 0;
  
    const words = results.flatMap(result => result.alternatives?.[0]?.words || []);
    // const endTimerPhonemes = startTimer('Japanese Phonemes Generation');  // timer
    const phonemePromises = words.map(async (word, index) => {
      const phonemes = await getJapanesePhonemes(word.word || '');
      return { index, word, phonemes };
    });
    // endTimerPhonemes();  // timer
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
  
    // const endTimerEmotionAnalysis = startTimer('Emotion Analysis');  // timer
    lipSyncData.emotionCues = analyzeEmotions(results, lastEndTime);
    // endTimerEmotionAnalysis();  // timer
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
        await kv.set(kvKey, phonemes, { ex: 604800 }); // 1週間キャッシュ
  
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

// const getIntensity = (phoneme: string, index: number, totalPhonemes: number): number => {
//   let baseIntensity = 0.5 + (index / totalPhonemes) * 0.5;
//   if ('アイウエオァィゥェォ'.includes(phoneme)) baseIntensity *= 1.2;
//   return Math.min(baseIntensity, 1);
// };

const analyzeEmotions = (results: ISpeechRecognitionResult[], duration: number): Array<{ start: number; end: number; emotion: string; intensity: number; }> => {
    // const endTimerEmotionAnalysis = startTimer('Analyze Emotions');  // timer
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
  
    // endTimerEmotionAnalysis();  // timer
    return emotionCues;
};

const lipSyncMessage = async (message: number): Promise<LipSync> => {
  // const endTimerLipSync = startTimer('Lip Sync Message');  // timer
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

    // const endTimerSpeechClient = startTimer('Speech Client Creation');  // timer
    const client = new SpeechClient({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        private_key: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.GCP_CLIENT_EMAIL,
      },
    });
    // endTimerSpeechClient();  // timer

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
    // const endTimerSpeechRecognition = startTimer('Speech Recognition');  // timer
    const [response] = await client.recognize(request);
    // endTimerSpeechRecognition();  // timer
    // console.log(`文字起こし完了: ${new Date().getTime() - time}ms`);

    if (!response.results || response.results.length === 0) {
      throw new Error('音声認識結果が空です');
    }

    // リップシンクデータの生成
    // const endTimerLipSyncGeneration = startTimer('Lip Sync Generation');  // timer
    const lipSyncData = await generateLipSyncFromTranscription(response.results);
    // endTimerLipSyncGeneration();  // timer

    memoryCache.lipSyncData.set(`message_${message}`, lipSyncData);
    // console.log(`リップシンク完了: ${new Date().getTime() - time}ms`);

    return lipSyncData;
  } catch (error) {
    console.error(`lipSyncMessageでエラーが発生しました: ${error}`);
    throw error;
  } finally {  // timer
    // endTimerLipSync();
  }
};

// 音声処理
const generateAudio = async (text: string, fileName: string): Promise<void> => {
    // const endTimerGenerateAudio = startTimer('Generate Audio');  // timer
    try {
      // 音声データのキャッシュを実装して、同じテキストの音声を再利用
      if (audioCache.has(text)) {
        memoryCache.audioFiles.set(fileName, audioCache.get(text)!);
        console.log(`Audio data retrieved from cache for ${fileName}`);
        return;
      }
  
      // const endTimerOpenAIAPI = startTimer('OpenAI API Call mp3');  // timer
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
      });
      // endTimerOpenAIAPI();  // timer
  
      // const endTimerBufferCreation = startTimer('Buffer Creation');  // timer
      const buffer = Buffer.from(await mp3.arrayBuffer());
      // endTimerBufferCreation();  // timer
  
      // キャッシュに保存
      // const endTimerCacheStore = startTimer('Cache Store');  // timer
      audioCache.set(text, buffer);
      memoryCache.audioFiles.set(fileName, buffer);
      // endTimerCacheStore();  // timer
  
      // console.log(`Audio data successfully stored in memory cache for ${fileName}`);
    } catch (error) {
      console.error(`Error in generateAudio: ${error}`);
      throw error;
    } finally {  // timer
      // endTimerGenerateAudio();
    }
};

export const readJsonTranscript = async (messageId: number): Promise<LipSync> => {
    const lipSyncData = memoryCache.lipSyncData.get(`message_${messageId}`);
    if (!lipSyncData) {
      throw new Error(`LipSync data not found in memory cache for message ${messageId}`);
    }
    return lipSyncData;
};

export const audioFileToBase64 = async (fileName: string): Promise<string> => {
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

export const handleUserMessage = async (
  userMessage: string,
  messageType: string,
  endType: string,
  interviewRef: any,
  messageCollectionRef: CollectionReference,
  context: string,
  totalQuestionCount: number,
  currentPhaseIndex: number,
  phases: any[],
  generateBotResponse: (context: string, userMessage: string) => Promise<string | null>,
  templates: { [key: string]: string },
): Promise<NextResponse> => {
  try {
    if (messageType === "interview") {
      await cleanOperationMessages(messageCollectionRef);
    }
    
    const userMessageId = uuidv4();
    await setDoc(doc(messageCollectionRef, userMessageId), {
      text: userMessage,
      sender: "user",
      createdAt: serverTimestamp(),
      type: messageType,
      messageId: userMessageId
    });

    context += "\nUser: " + userMessage;

    if (currentPhaseIndex < phases.length) {
      const currentPhase = phases[currentPhaseIndex];
      const currentTemplate = currentPhase.template;
      const lastPhase = phases[phases.length - 1];
      
      let botResponseText: string | null;
      
      if (currentTemplate === lastPhase.template) {
        botResponseText = templates[lastPhase.template as keyof typeof templates];
      } else {
        botResponseText = await generateBotResponse(context, userMessage);
      }

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

        const botMessageId = uuidv4();
        await setDoc(doc(messageCollectionRef, botMessageId), {
          text: botResponseText,
          sender: "bot",
          createdAt: serverTimestamp(),
          type: messageType,
          messageId: botMessageId
        });

        totalQuestionCount++;
        if (totalQuestionCount >= phases.slice(0, currentPhaseIndex + 1).reduce((sum, p) => sum + p.questions, 0)) {
          currentPhaseIndex++;
        }

        return NextResponse.json({ messages: [botMessage], currentPhaseIndex, totalQuestionCount });
      } else {
        throw new Error('AI応答の生成に失敗しました');
      }
    } else {
      throw new Error('全てのフェーズが完了しました');
    }
  } catch (error) {
    console.error('メッセージ処理中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'メッセージの処理に失敗しました' }, { status: 500 });
  }
};