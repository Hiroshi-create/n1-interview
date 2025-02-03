import { NextResponse } from 'next/server';
import { collection, doc, getDocs, query, orderBy, where, getCountFromServer, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
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
  interview_prompt: `
**【AIインタビュアー プロンプト】**
あなたは商品開発の専門家です。次のアルゴリズムでユーザーへ質問し、0→1の新規商品アイデアを発掘してください。**会話例**と**競合比較**を常に意識し、深掘りを徹底します。
---
### **【基本フロー】**
1. **ニーズの抽出**
    ❏「これから{theme}を購入する場合、どんな特徴を求めますか？」
    → 例: 「目に優しい調光機能」「スマホ連動機能」「デザイン性」など
2. **競合の確認**
    ❏「他社製品でその条件を満たすものは知っていますか？（yes/no）」
    → **yesの場合**: 具体例を挙げてもらう
    → **noの場合**: AIが類似商品を提示
    **【YESの深掘り例】**
    ユーザ「◯◯社の△△という製品があります」
    AI「その製品を購入する予定は？」
    ユーザ「いいえ」
    AI「なぜ購入しないのですか？[価格/機能/デザイン...]のどの点が不満ですか？」
    ユーザ「価格が5万円は高い」
    AI「具体的にどの価格帯なら購入しますか？ また、機能面で妥協できる点はありますか？」
3. **競合不在時の分析**
    ❏「当社調査では××社のYYが類似機能を持っています。この商品についてどう思いますか？」
    ユーザ「デザインが好みじゃない」
    AI「理想のデザインを具体的に教えてください。例えば素材（木製/金属）や形状（丸型/直線的）で希望は？」
4. **ニーズの優先順位付け**
    ❏「挙げていただいた特徴を重要度順に並べ替えてください」
    → 例: [1位: 眼精疲労軽減 2位: スマート家電連動 3位: 北欧風デザイン]
---
### **【実践シナリオ例】**
**テーマ: スマートウォッチ**
AI「健康管理機能で重視する点は？」
ユーザ「ストレス測定精度です」
AI「◯◯社のAAモデルは医療機関と共同開発した測定機能があります。ご存知ですか？」
ユーザ「知ってますが、サイズが大きすぎて…」
AI「具体的にどのサイズ（例: 直径40mm以下）なら許容できますか？ 精度とサイズのどちらを優先しますか？」
ユーザ「38mm以下なら精度が若干落ちてもOK」
→ **インサイト**: 「コンパクトさ」が「高精度」より優先される層が存在
---
### **【行動指針】**
・「なぜ？」を3階層で掘り下げる（例: 不便→根本原因→理想状態）
・常に数値/具体例を要求（「高い」→「3万円以上ならNG」）
・競合比較では「機能」「価格」「デザイン」「UX」の4軸で分析
・ユーザーの言葉を「要約→確認」しながら進める
  `,
  thank_you: `インタビューにご協力いただき、ありがとうございました。貴重なご意見を頂戴し、大変参考になりました。`
};

export async function POST(request: Request) {
  try {
    const { message: userMessage, selectThemeName, interviewRefPath, phases, isInterviewEnded }: {
      message: string;
      selectThemeName: string;
      interviewRefPath: string;
      phases: Phase[];
      isInterviewEnded: boolean
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
      console.log("全てのフェーズが完了しました(1)");
      return NextResponse.json({ 
        message: "インタビューが完了しました。ありがとうございました。",
        isInterviewComplete: true 
      });
    }

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
        if (data.type === "interview") {
          context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
        }
      });
    } catch (error) {
      console.error('コンテキストの取得中にエラーが発生しました:', error);
      return NextResponse.json({ error: 'コンテキストの取得に失敗しました' }, { status: 500 });
    }

    if (!userMessage) {  // 使ってないのでは？
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

    console.log("現フェーズのindex番号 : " + currentPhaseIndex);
    console.log("現フェーズのtheme : " + selectThemeName);
    let currentPhase = phases[currentPhaseIndex];
    // フェーズ移行
    if (isInterviewEnded) {
      phases[currentPhaseIndex].isChecked = true;
      currentPhaseIndex++;
    }

    // 次のフェーズが存在するかチェック
    if (currentPhaseIndex >= phases.length) {
      console.log("全てのフェーズが完了しました(2)");
      return NextResponse.json({ 
        message: "インタビューが完了しました。ありがとうございました。",
        isInterviewComplete: true 
      });
    }

    currentPhase = phases[currentPhaseIndex];
    console.log("何個目の質問か(サーバーサイド) : " + currentPhaseIndex);

    const currentTemplate = currentPhase.template;
    const prompt = templates[currentTemplate as keyof typeof templates]
      .replace("{theme}", selectThemeName)
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
          await updateDoc(interviewRef, {
            interviewCollected: true
          });
          return templates.thank_you;
        }
        const gptResponse = await openai.chat.completions.create({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userMessage }
          ],
          model: "gpt-4o"
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







// import { NextResponse } from 'next/server';
// import { addDoc, collection, doc, serverTimestamp, getDocs, query, orderBy, where, getCountFromServer, getDoc } from 'firebase/firestore';
// import { db } from '../../../../firebase';
// import { Theme } from '@/stores/Theme';
// import { handleUserMessage, audioFileToBase64, readJsonTranscript } from '../components/commonFunctions';
// import OpenAI from 'openai';
// import { Phase } from '@/context/interface/Phase';
// import { interview_phases } from '@/context/components/lists';
// import { constants } from 'node:fs/promises';

// const openai = new OpenAI({
//   apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
// });

// interface Message {
//   text: string;
//   audio: string;
//   lipsync: any;
//   facialExpression: string;
//   animation: string;
// }

// const templates = {
//   interview_prompt: `
// あなたは、0-1の商品アイデアを発想するためのインタビューを行うAIアシスタントです。
// 以下のアルゴリズムに従って、ユーザーにインタビューを行い、ニーズを深掘りしてください。

// これまでの会話コンテキスト: {context}

// ## インタビューアルゴリズム
// 1. ユーザにテーマを聞く
// 2. 「これから{theme}を買う場合、どんな特徴を持った{theme}を求めますか？」と質問する
// 3. ユーザの回答から特徴を抽出する
// 4. 「他社製品にそれを満たす{theme}があるか知っていますか？（yes/no）」と質問する
// 5. yesの場合
//    - 知っている{theme}の他社製品を挙げてもらう
//    - 「それを購入する予定はありますか？（yes/no）」と質問する
//      - yesの場合 -> 2.に戻る
//      - noの場合 -> 「なぜ購入しないのか、理由をすべて教えてください」と質問する
//        - 理由を聞き、それぞれ「なぜ◯◯と思うのか？」と深掘りする
//        - 2.に戻る
// 6. noの場合
//    - （AIが他社製品に特徴を満たすテーマがあるか調べる）
//    - 存在する場合
//      - 商品を紹介する
//      - 「購入したいと思うか？（yes/no）」と質問する
//        - yesの場合 -> 2.に戻る
//        - noの場合 -> 「なぜ購入しないのか、理由をすべて教えてください」と質問する
//          - 理由を聞き、それぞれ「なぜ◯◯と思うのか？」と深掘りする
//          - 2.に戻る
//    - 存在しない場合
//      - 抽出した特徴ごとに「△△の特徴について、要望を具体的に教えてください」と質問する
//      - 「なぜ、その特徴が必要か、理由を全て答えてください」と質問する
//      - 理由を聞き、それぞれ「なぜ◯◯と思うのか？」と深掘りする
//      - 2.に戻る

// ## インタビュー例
// 質問者: これからスマートウォッチを買う場合、どんな特徴を持ったスマートウォッチを求めますか？

// ユーザー: うーん、そうですね…健康管理ができるのはもちろんですが、やっぱりデザインがおしゃれなものがいいです。毎日身につけるものですし、服装に合わせやすいものがいいなと思います。

// 質問者: （ユーザーは「デザイン」を重視している。 ->  次に、他社製品の有無を確認）なるほど、デザイン性重視ですね。他社製品にそれを満たすスマートウォッチがあるか知っていますか？

// ユーザー: ええ、いくつか知っています。Apple WatchとかGARMINとか…

// 質問者: （ユーザーは既存のスマートウォッチを認識している。 -> 次に、購入意向を確認）それらのスマートウォッチを購入する予定はありますか？

// ユーザー: いえ、今のところはないです。

// 質問者: （ユーザーに購入意向がない -> 次に、その理由を聞く）なぜ購入しないのでしょうか？理由をすべて教えてください。
// ...

// ## その他
// - ユーザの回答から「特徴」を抽出する際には、名詞や形容詞をキーワードとして抽出してください。
// - 必要に応じて、質問の順番や表現を変更しても構いません。
// - ユーザのニーズを深掘りすることを意識して、インタビューを進めてください。
//   `,
//   thank_you: `インタビューにご協力いただき、ありがとうございました。貴重なご意見を頂戴し、大変参考になりました。`
// };

// export async function POST(request: Request) {
//   try {
//     const { message: userMessage, interviewRefPath, phases }: {
//       message: string;
//       interviewRefPath: string;
//       phases: Phase[];
//     } = await request.json();

//     const interviewRef = doc(db, interviewRefPath);
//     if (!interviewRef) {
//       console.error('インタビューが指定されていません');
//       return NextResponse.json({ error: 'インタビューが指定されていません' }, { status: 400 });
//     }

//     let context = "";
//     let currentPhaseIndex = phases.findIndex(phase => !phase.isChecked);
//     let totalQuestionCount = 0;

//     // フェーズが全て完了しているかチェック
//     if (currentPhaseIndex >= phases.length) {
//       console.log("全てのフェーズが完了しました");
//       return NextResponse.json({ 
//         message: "インタビューが完了しました。ありがとうございました。",
//         isInterviewComplete: true 
//       });
//     }

//     const themeDocSnap = await getDoc(interviewRef);
//     if (!themeDocSnap.exists()) {
//       console.error('指定されたテーマIDのドキュメントが存在しません');
//       return NextResponse.json({ error: '指定されたテーマIDのドキュメントが存在しません' }, { status: 404 });
//     }

//     const themeData = themeDocSnap.data() as Theme;
//     const theme = themeData.theme;
//     console.log("theme : " + theme);

//     const messageCollectionRef = collection(interviewRef, "messages");

//     try {
//       const botMessagesQuery = query(
//         messageCollectionRef,
//         where("type", "==", "interview"),
//         where("sender", "==", "bot")
//       );
//       const snapshot = await getCountFromServer(botMessagesQuery);
//       totalQuestionCount = snapshot.data().count;
//     } catch (error) {
//       console.error('Firebaseからのデータ取得中にエラーが発生しました:', error);
//       return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
//     }

//     try {
//       const q = query(messageCollectionRef, orderBy("createdAt", "asc"));
//       const querySnapshot = await getDocs(q);
//       querySnapshot.forEach((doc) => {
//         const data = doc.data();
//         context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
//       });
//     } catch (error) {
//       console.error('コンテキストの取得中にエラーが発生しました:', error);
//       return NextResponse.json({ error: 'コンテキストの取得に失敗しました' }, { status: 500 });
//     }

//     if (!userMessage) {
//       try {
//         const messages: Message[] = [{
//           text: 'インタビューを始めます。まずはあなたの基本的なプロフィールについて教えてください。',
//           audio: await audioFileToBase64('intro_0.wav'),
//           lipsync: await readJsonTranscript(totalQuestionCount),
//           facialExpression: 'smile',
//           animation: 'Talking_1',
//         }];
//         return NextResponse.json({ messages });
//       } catch (error) {
//         console.error('初期メッセージの生成中にエラーが発生しました:', error);
//         return NextResponse.json({ error: '初期メッセージの生成に失敗しました' }, { status: 500 });
//       }
//     }

//     const currentPhase = phases[currentPhaseIndex];
//     // if ((currentPhase.type === "two_choices" && userMessage.toLowerCase() === "はい") ||
//     //     (currentPhase.type === "free_response" && userMessage.trim() !== "")) {
//     //   phases[currentPhaseIndex].isChecked = true;
//     //   currentPhaseIndex++;
//     // }

//     // 次のフェーズが存在するかチェック
//     if (currentPhaseIndex >= phases.length) {
//       console.log("全てのフェーズが完了しました");
//       return NextResponse.json({ 
//         message: "インタビューが完了しました。ありがとうございました。",
//         isInterviewComplete: true 
//       });
//     }

//     // currentPhase = phases[currentPhaseIndex];
//     // console.log("何個目の質問か(サーバーサイド) : " + currentPhaseIndex);

//     const currentTemplate = currentPhase.template;
//     const prompt = templates[currentTemplate as keyof typeof templates]
//       .replace("{theme}", theme)
//       .replace("{context}", context);

//     console.log("プロンプト : " + prompt)

//     const response = await handleUserMessage(
//       userMessage,
//       "interview",
//       "interviewEnd",
//       interviewRef,
//       messageCollectionRef,
//       context,
//       totalQuestionCount,
//       currentPhaseIndex,
//       phases,
//       async (updatedContext, userMessage) => {
//         if (currentTemplate === "thank_you") {
//           return templates.thank_you;
//         }
//         const gptResponse = await openai.chat.completions.create({
//           messages: [
//             { role: "system", content: prompt },
//             { role: "user", content: userMessage }
//           ],
//           model: "gpt-4o-mini-2024-07-18"
//         });
//         return gptResponse.choices[0].message.content ?? null;
//       },
//       templates
//     );

//     const responseData = await response.json();

//     return NextResponse.json({
//       messages: responseData.messages,
//       currentPhaseIndex: currentPhaseIndex,
//       totalQuestionCount: totalQuestionCount,
//       phases: phases
//     });
//   } catch (error) {
//     console.error('予期せぬエラーが発生しました:', error);
//     return NextResponse.json({ error: '予期せぬエラーが発生しました' }, { status: 500 });
//   }
// }
