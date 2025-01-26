import { NextResponse } from 'next/server';
import { addDoc, collection, doc, serverTimestamp, getDocs, query, orderBy, where, getCountFromServer, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Theme } from '@/stores/Theme';
import { handleUserMessage, audioFileToBase64, readJsonTranscript } from '../components/commonFunctions';
import OpenAI from 'openai';

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
        isInterviewComplete: true 
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
        where("type", "==", "interview"),
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
        context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
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
    if ((currentPhase.type === "two_choices" && userMessage.toLowerCase() === "はい") ||
        (currentPhase.type === "free_response" && userMessage.trim() !== "")) {
      phases[currentPhaseIndex].isChecked = true;
      currentPhaseIndex++;
    }

    // 次のフェーズが存在するかチェック
    if (currentPhaseIndex >= phases.length) {
      console.log("全てのフェーズが完了しました");
      return NextResponse.json({ 
        message: "インタビューが完了しました。ありがとうございました。",
        isInterviewComplete: true 
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
      "interview",
      "interviewEnd",
      interviewRef,
      messageCollectionRef,
      context,
      totalQuestionCount,
      currentPhaseIndex,
      phases,
      async (updatedContext, userMessage) => {
        if (currentTemplate === "thank_you") {
          return templates.thank_you;
        }
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
