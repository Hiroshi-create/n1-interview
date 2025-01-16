import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { Theme } from '@/stores/Theme';
import { IndividualReport } from '@/stores/IndividualReport';
import { db } from '../../../../../firebase';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
});

export async function POST(req: NextRequest) {
  try {
    const { themeId: themeId, interviewRefPath: interviewRefPath } = await req.json();
    const interviewRef = doc(db, interviewRefPath);

    if (!themeId) {
      return NextResponse.json({ error: 'テーマIDが指定されていません' }, { status: 400 });
    }

    const themeDocSnap = await getDoc(interviewRef);
    if (!themeDocSnap.exists()) {
      console.error('指定されたテーマIDのドキュメントが存在しません');
      return NextResponse.json({ error: '指定されたテーマIDのドキュメントが存在しません' }, { status: 404 });
    }
    const themeData = themeDocSnap.data() as Theme;
    const theme = themeData.theme;

    const messageCollectionRef = collection(interviewRef, "messages");
    const q = query(messageCollectionRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);

    let context = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
    });

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
      model: "gpt-3.5-turbo"
    });

    const report = reportResponse.choices[0].message.content;

    if (report === null) {
      throw new Error('レポートの内容がnullです');
    }

    const reportsCollectionRef = collection(interviewRef, "individualReport");
    const newReportId = uuidv4();
    const newReport: IndividualReport = {
      createdAt: serverTimestamp(),
      report: report,
      individualReportId: newReportId,
    };
    await setDoc(doc(reportsCollectionRef, newReportId), newReport);

    await updateDoc(interviewRef, {
      reportCreated: true
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('レポート生成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'レポートの生成に失敗しました' }, { status: 500 });
  }
}
