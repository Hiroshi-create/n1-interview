import { NextResponse } from 'next/server';
import { addDoc, collection, doc, serverTimestamp, getDocs, query, orderBy, where, getCountFromServer, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Theme } from '@/stores/Theme';
import { handleUserMessage, audioFileToBase64, readJsonTranscript } from '../components/commonFunctions';
import OpenAI from 'openai';
import { Phase } from '@/context/interface/Phase';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
});

interface Message {
  text: string;
  audio: string;
  lipsync: any;
  facialExpression: string;
  animation: string;
}

const templates = {
  checking_the_audio: `
    あなたは音声インタビューシステムの動作確認を行うアシスタントです。
    現在のフェーズ: 音声が聴こえるかの確認
    指示:
    1. ユーザーに音声が聞こえているか確認してください。
    2. 音声が聞こえていることを確認できたら、次のフェーズに進む準備ができたか尋ねてください。
    3. 各対話で1つの質問のみを行ってください。
    4. ユーザーの回答に応じて適切にフォローアップしてください。
    これまでの会話コンテキスト: {context}
  `,
  checking_voice_input: `
    あなたは音声インタビューシステムの動作確認を行うアシスタントです。
    現在のフェーズ: 音声入力の動作確認
    指示:
    1. ユーザーに音声入力ができているか確認してください。
    2. ユーザーになんと呼んだら良いか簡単な質問をして、音声入力が正常に機能しているか確認してください。
    3. 音声入力が正常に機能していることを確認できたら、本格的なインタビューの準備ができたか尋ねてください。
    4. 各対話で1つの質問のみを行ってください。
    5. ユーザーの回答に応じて適切にフォローアップしてください。
    これまでの会話コンテキスト: {context}
  `,
  confirmation_complete: `音声インタビューシステムの動作確認が完了しました。
インタビューを始めます。リラックスして、質問にお答えください。`,
};

export async function POST(request: Request) {
  try {
    const { message: userMessage, interviewRefPath, phases }: {
      message: string;
      interviewRefPath: string;
      phases: Phase[];
    } = await request.json();

    const interviewRef = doc(db, interviewRefPath);
    if (!interviewRef) {
      console.error('インタビューが指定されていません');
      return NextResponse.json({ error: 'インタビューが指定されていません' }, { status: 400 });
    }

    let context = "";
    let currentPhaseIndex = phases.findIndex(phase => !phase.isChecked);
    let totalQuestionCount = 0;

    // フェーズが全て完了しているかチェック
    if (currentPhaseIndex >= phases.length) {
      console.log("全てのフェーズが完了しました");
      return NextResponse.json({ 
        message: "インタビューが完了しました。ありがとうございました。",
        isOperationCheckComplete: true 
      });
    }

    const themeDocSnap = await getDoc(interviewRef);
    if (!themeDocSnap.exists()) {
      console.error('指定されたテーマIDのドキュメントが存在しません');
      return NextResponse.json({ error: '指定されたテーマIDのドキュメントが存在しません' }, { status: 404 });
    }

    const themeData = themeDocSnap.data() as Theme;
    const theme = themeData.theme;
    console.log("theme : " + theme);

    const messageCollectionRef = collection(interviewRef, "messages");

    try {
      const botMessagesQuery = query(
        messageCollectionRef,
        where("type", "==", "operation_check"),
        where("sender", "==", "bot")
      );
      const snapshot = await getCountFromServer(botMessagesQuery);
      totalQuestionCount = snapshot.data().count;
    } catch (error) {
      console.error('Firebaseからのデータ取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    try {
      const q = query(messageCollectionRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === "operation_check") {
          context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
        }
      });
    } catch (error) {
      console.error('コンテキストの取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'コンテキストの取得に失敗しました' }, { status: 500 });
    }

    if (!userMessage) {
      try {
        const messages: Message[] = [{
          text: 'インタビューを始めます。まずはあなたの基本的なプロフィールについて教えてください。',
          audio: await audioFileToBase64('intro_0.wav'),
          lipsync: await readJsonTranscript(totalQuestionCount),
          facialExpression: 'smile',
          animation: 'Talking_1',
        }];
        return NextResponse.json({ messages });
      } catch (error) {
        console.error('初期メッセージの生成中にエラーが発生しました:', error);
        return NextResponse.json({ error: '初期メッセージの生成に失敗しました' }, { status: 500 });
      }
    }

    
    let currentPhase = phases[currentPhaseIndex];
    if (currentPhase.type === "two_choices" && userMessage.toLowerCase() === "はい") {
      phases[currentPhaseIndex].isChecked = true;
      currentPhaseIndex++;
    } else if (currentPhase.type === "free_response" && userMessage.trim() !== "") {
      phases[currentPhaseIndex].isChecked = true;
      currentPhaseIndex++;
    }

    // 次のフェーズが存在するかチェック
    if (currentPhaseIndex >= phases.length) {
      console.log("全てのフェーズが完了しました");
      return NextResponse.json({ 
        message: "インタビューが完了しました。ありがとうございました。",
        isOperationCheckComplete: true 
      });
    }

    currentPhase = phases[currentPhaseIndex];
    console.log("何個目の質問か(サーバーサイド) : " + currentPhaseIndex);

    const currentTemplate = currentPhase.template;
    const prompt = templates[currentTemplate as keyof typeof templates]
      .replace("{theme}", theme)
      .replace("{context}", context);

    const response = await handleUserMessage(
      userMessage,
      "operation_check",
      "operationCheckComplete",
      interviewRef,
      messageCollectionRef,
      context,
      totalQuestionCount,
      currentPhaseIndex,
      phases,
      async (updatedContext, userMessage) => {
        const gptResponse = await openai.chat.completions.create({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userMessage }
          ],
          model: "gpt-3.5-turbo"
        });
        return gptResponse.choices[0].message.content ?? null;
      },
      templates
    );

    const responseData = await response.json();

    return NextResponse.json({
      messages: responseData.messages,
      currentPhaseIndex: currentPhaseIndex,
      totalQuestionCount: totalQuestionCount,
      phases: phases
    });
  } catch (error) {
    console.error('予期せぬエラーが発生しました:', error);
    return NextResponse.json({ error: '予期せぬエラーが発生しました' }, { status: 500 });
  }
}
