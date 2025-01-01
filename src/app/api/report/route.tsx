import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '../../../../firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
});

export async function POST(req: NextRequest) {
  try {
    const { themeId } = await req.json();

    if (!themeId) {
      return NextResponse.json({ error: 'テーマIDが指定されていません' }, { status: 400 });
    }

    // Firestoreからインタビューデータを取得
    const themeDocRef = doc(db, "themes", themeId);
    const themeDocSnap = await getDoc(themeDocRef);
    if (!themeDocSnap.exists()) {
        console.error('指定されたテーマIDのドキュメントが存在しません');
        return NextResponse.json({ error: '指定されたテーマIDのドキュメントが存在しません' }, { status: 404 });
    }
    const theme = themeDocSnap.data().name;

    const messageCollectionRef = collection(themeDocRef, "messages");
    const q = query(messageCollectionRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);

    let context = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
    });

    // レポート生成のためのプロンプト
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
    const summary_template = `
    テーマ: ${theme}
    インタビュー全体を分析し、以下の形式で詳細なレポートを作成してください：

    1. インタビューの概要:
    ここに${theme}に関するインタビューの全体的な概要を記載

    2. 主要な発見事項:
    ここに${theme}に関する重要な発見や洞察を記載

    3. ユーザーの特性と行動パターン:
    ここに${theme}に関連するユーザーの特徴や行動傾向を記載

    4. ${theme}に対する意見や要望:
    ここに${theme}についてのユーザーの具体的な意見や改善要望を記載

    5. 競合分析の結果:
    ここに${theme}の競合製品やサービスに関する分析結果を記載

    6. 結論と推奨事項:
    ここに${theme}に関する総括と今後のアクションプランを記載

    これまでの会話コンテキスト:${context}
    `;

    const reportPrompt = summary_template
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

    // レポートをFirebaseに保存
    const reportsCollectionRef = collection(themeDocRef, "messages");
    await addDoc(reportsCollectionRef, {
      content: report,
      createdAt: new Date()
    });

    await addDoc(reportsCollectionRef, {
        text: report,
        sender: "bot",
        createdAt: serverTimestamp(),
        type: "report",
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('レポート生成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'レポートの生成に失敗しました' }, { status: 500 });
  }
}
