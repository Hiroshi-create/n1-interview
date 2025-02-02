import { NextRequest, NextResponse } from "next/server";
import { db } from '../../../../firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import { cleanOperationMessages } from "../components/cleanOperationMessages";

export async function POST(req: NextRequest) {
  try {
    const { interviewRefPath } = await req.json();

    if (!interviewRefPath) {
      return NextResponse.json({ error: 'インタビューの参照パスが指定されていません' }, { status: 400 });
    }

    // interviewCollectedフィールドを取得
    const interviewDocRef = doc(db, interviewRefPath);
    const interviewDocSnap = await getDoc(interviewDocRef);

    if (!interviewDocSnap.exists()) {
      return NextResponse.json({ error: 'インタビュードキュメントが見つかりません' }, { status: 404 });
    }

    const data = interviewDocSnap.data();
    const interviewCollected = data.interviewCollected;

    if (typeof interviewCollected !== 'boolean') {
      return NextResponse.json({ error: 'interviewCollectedフィールドが見つからないか、boolean型ではありません' }, { status: 400 });
    }

    const messageCollectionRef = collection(db, interviewRefPath, "messages");
    await cleanOperationMessages(messageCollectionRef);

    return NextResponse.json({ 
      success: true, 
      message: 'operation_checkメッセージが正常に削除されました',
      interviewCollected: interviewCollected
    });
  } catch (error) {
    console.error('処理中にエラーが発生しました:', error);
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }
}
