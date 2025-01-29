import { NextRequest, NextResponse } from "next/server";
import { db } from '../../../../firebase';
import { collection } from 'firebase/firestore';
import { cleanOperationMessages } from "../components/cleanOperationMessages";

export async function POST(req: NextRequest) {
  try {
    const { interviewRefPath } = await req.json();

    if (!interviewRefPath) {
      return NextResponse.json({ error: 'インタビューの参照パスが指定されていません' }, { status: 400 });
    }

    const messageCollectionRef = collection(db, interviewRefPath, "messages");
    await cleanOperationMessages(messageCollectionRef);

    return NextResponse.json({ success: true, message: 'operation_checkメッセージが正常に削除されました' });
  } catch (error) {
    console.error('operation_checkメッセージの削除中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'operation_checkメッセージの削除に失敗しました' }, { status: 500 });
  }
}
