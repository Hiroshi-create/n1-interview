/**
 * ストリーミング対応インタビューAPI
 * Server-Sent Eventsで段階的に応答を返す
 */

import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { SSEStreamer } from '@/lib/streaming-response';
import { InterviewParallelProcessor } from '@/lib/parallel-processor';
import { SafeOpenAIClient } from '@/lib/external-api';
import { generateAudio, lipSyncMessage } from '../../components/commonFunctions';
import { memoryCache } from '@/lib/cache-compatibility';

const openaiClient = new SafeOpenAIClient();
const templates = {
  interview_prompt: `
あなたは商品開発の専門家です。次のアルゴリズムでユーザーへ質問し、0→1の新規商品アイデアを発掘してください。
インタビューをする対象の商品は{theme}です。
### **【基本フロー】**
1. **ニーズの抽出**
2. **競合の確認**
3. **競合不在時の分析**
4. **ニーズの優先順位付け**
### **【絶対的制約】**
・インタビューの発話には、質問のみ含めてください
・競合商品を紹介することを意識してください
  `,
  thank_you: `インタビューにご協力いただき、ありがとうございました。`
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const sse = new SSEStreamer();
  const encoder = new TextEncoder();

  // ReadableStreamを作成
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 即座に接続確認を送信
        const connectMsg = sse.formatSSE({ status: 'connected' }, 'connection');
        controller.enqueue(encoder.encode(connectMsg));

        // リクエストボディを解析
        const body = await request.json();
        const { 
          message: userMessage, 
          selectThemeName, 
          interviewRefPath,
          phases,
          currentPhaseIndex,
          totalQuestionCount
        } = body;

        // 処理開始を通知
        const startMsg = sse.formatSSE({ 
          step: 'processing',
          message: '応答を準備しています...'
        }, 'progress');
        controller.enqueue(encoder.encode(startMsg));

        // コンテキスト構築
        const interviewRef = adminDb.doc(interviewRefPath);
        const messageCollectionRef = interviewRef.collection("messages");
        
        let context = "";
        const querySnapshot = await messageCollectionRef
          .orderBy("createdAt", "asc")
          .get();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === "interview") {
            context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
          }
        });

        // OpenAI応答生成を通知
        const genMsg = sse.formatSSE({ 
          step: 'generating',
          message: 'AIが応答を考えています...'
        }, 'progress');
        controller.enqueue(encoder.encode(genMsg));

        // AI応答生成
        const currentPhase = phases[currentPhaseIndex];
        const currentTemplate = currentPhase.template;
        const prompt = templates[currentTemplate as keyof typeof templates]
          .replace("{theme}", selectThemeName)
          .replace("{context}", context);

        let botResponseText: string | null = null;
        
        if (currentTemplate === "thank_you") {
          botResponseText = templates.thank_you;
        } else {
          const gptResponse = await openaiClient.createChatCompletion({
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: userMessage }
            ],
            model: "gpt-4"
          }, { timeout: 30000, maxRetries: 3 });
          
          botResponseText = gptResponse.choices[0].message.content ?? null;
        }

        if (!botResponseText) {
          throw new Error('AI応答の生成に失敗しました');
        }

        // テキスト応答を即座に送信
        const textMsg = sse.formatSSE({ 
          type: 'text',
          data: botResponseText
        }, 'response');
        controller.enqueue(encoder.encode(textMsg));

        // 並列処理で音声とリップシンクを生成
        const synthMsg = sse.formatSSE({ 
          step: 'synthesizing',
          message: '音声を合成しています...'
        }, 'progress');
        controller.enqueue(encoder.encode(synthMsg));

        const fileName = `message_${totalQuestionCount}.mp3`;
        const parallelProcessor = new InterviewParallelProcessor();
        
        const parallelResults = await parallelProcessor.processInterviewResponse({
          audioGeneration: async () => {
            await generateAudio(botResponseText!, fileName);
            return memoryCache.audioFiles.get(fileName)!;
          },
          lipSyncGeneration: async () => {
            // オーディオ生成を待つ
            let retries = 0;
            while (!memoryCache.audioFiles.get(fileName) && retries < 20) {
              await new Promise(resolve => setTimeout(resolve, 100));
              retries++;
            }
            return await lipSyncMessage(totalQuestionCount);
          }
        });

        // 音声データを送信
        if (parallelResults.audio) {
          const audioMsg = sse.formatSSE({ 
            type: 'audio',
            data: parallelResults.audio.toString('base64')
          }, 'response');
          controller.enqueue(encoder.encode(audioMsg));
        }

        // リップシンクデータを送信
        if (parallelResults.lipSync) {
          const lipSyncMsg = sse.formatSSE({ 
            type: 'lipsync',
            data: parallelResults.lipSync
          }, 'response');
          controller.enqueue(encoder.encode(lipSyncMsg));
        }

        // 完了通知
        const completeMsg = sse.formatSSE({ 
          type: 'complete',
          duration: Date.now() - startTime,
          currentPhaseIndex: currentPhaseIndex,
          totalQuestionCount: totalQuestionCount + 1
        }, 'complete');
        controller.enqueue(encoder.encode(completeMsg));

        // Firestoreに保存
        await messageCollectionRef.add({
          text: userMessage,
          sender: "user",
          createdAt: Date.now(),
          type: "interview"
        });

        await messageCollectionRef.add({
          text: botResponseText,
          sender: "bot",
          createdAt: Date.now(),
          type: "interview"
        });

        logger.info('ストリーミング応答完了', {
          duration: Date.now() - startTime
        });

      } catch (error) {
        logger.error('ストリーミングエラー', error as Error);
        
        const errorMsg = sse.formatSSE({ 
          error: 'エラーが発生しました',
          message: (error as Error).message
        }, 'error');
        controller.enqueue(encoder.encode(errorMsg));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}