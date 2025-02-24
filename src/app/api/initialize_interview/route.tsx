import { NextRequest, NextResponse } from "next/server";
import { adminDb } from '../../../lib/firebase-admin';
import { cleanOperationMessages } from "../components/cleanOperationMessages";

interface RequestBody {
  interviewRefPath: string;
}

export async function POST(req: NextRequest) {
  try {
    const { interviewRefPath }: RequestBody = await req.json();

    if (!interviewRefPath) {
      return NextResponse.json({ error: 'インタビューの参照パスが指定されていません' }, { status: 400 });
    }

    // interviewCollectedフィールドを取得
    const interviewDocRef = adminDb.doc(interviewRefPath);
    const interviewDocSnap = await interviewDocRef.get();

    if (!interviewDocSnap.exists) {
      return NextResponse.json({ error: 'インタビュードキュメントが見つかりません' }, { status: 404 });
    }

    const data = interviewDocSnap.data();
    const interviewCollected = data?.interviewCollected;

    if (typeof interviewCollected !== 'boolean') {
      return NextResponse.json({ error: 'interviewCollectedフィールドが見つからないか、boolean型ではありません' }, { status: 400 });
    }

    const messageCollectionRef = interviewDocRef.collection("messages");
    await cleanOperationMessages(messageCollectionRef.path);

    return NextResponse.json({ 
      success: true, 
      message: 'operation_checkメッセージが正常に削除されました',
      interviewCollected: interviewCollected,
    });
  } catch (error) {
    console.error('処理中にエラーが発生しました:', error);
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }
}
