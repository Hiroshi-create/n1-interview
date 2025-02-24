import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminDb } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { IndividualReport } from '@/stores/IndividualReport';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '-',
});

interface RequestBody {
  theme: string | null;
  interviewRefPath: string;
}

export async function POST(req: NextRequest) {
  try {
    const { theme, interviewRefPath }: RequestBody = await req.json();
    const interviewRef = adminDb.doc(interviewRefPath);

    if (!theme) {
      return NextResponse.json({ error: 'テーマが指定されていません' }, { status: 400 });
    }

    const messageCollectionRef = interviewRef.collection("messages");
    const querySnapshot = await messageCollectionRef.orderBy("createdAt", "asc").get();

    let context = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === "interview") {
        context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
      }
    });

    const summary_template = `
    テーマ: ${theme}
    インタビュー全体を分析し、情報は省略せず、以下の形式で詳細なレポートを作成してください：

    1. インタビューの概要:
    ここに${theme}に関するインタビューの全体的な概要を記載

    2. 主要な発見事項:
    ここに${theme}に関する重要な発見や洞察を記載
    (以下に特徴の数だけ列挙する)
    - ${theme}に求める特徴
      - その理由等詳細を記載

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

    const reportsCollectionRef = interviewRef.collection("individualReport");
    const newReportId = uuidv4();
    const newReport: IndividualReport = {
      createdAt: FieldValue.serverTimestamp(),
      report: report,
      individualReportId: newReportId,
    };
    await reportsCollectionRef.doc(newReportId).set(newReport);

    const temporaryId = uuidv4();
    await interviewRef.update({
      reportCreated: true,
      temporaryId: temporaryId,
    });

    return NextResponse.json({ report: report, temporaryId: temporaryId });
  } catch (error) {
    console.error('レポート生成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'レポートの生成に失敗しました' }, { status: 500 });
  }
}
