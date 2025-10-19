import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { DocumentReference, DocumentData } from 'firebase-admin/firestore';

interface RequestBody {
  intervieweeId: string;
  themeRefPath: string;
}

interface ServerAnswerInterviews {
  createdAt: FieldValue;
  interviewReference: DocumentReference<DocumentData>;
}

export async function POST(request: Request) {
  try {
    const { intervieweeId, themeRefPath }: RequestBody = await request.json();

    if (!intervieweeId || !themeRefPath) {
      return NextResponse.json({ error: "無効なデータです" }, { status: 400 });
    }

    const themeDocRef = adminDb.doc(themeRefPath);
    const themeDocSnap = await themeDocRef.get();
    if (!themeDocSnap.exists) {
      return NextResponse.json({ error: 'テーマドキュメントが見つかりません' }, { status: 404 });
    }
    const themeData = themeDocSnap.data() as Theme;

    const interviewsCollection = themeDocRef.collection('interviews');

    // 既存のインタビューを検索
    const querySnapshot = await interviewsCollection.where('intervieweeId', '==', intervieweeId).get();

    if (!querySnapshot.empty) {
      // 既存のインタビューがある場合は最初のドキュメントを取得
      const existingInterview = querySnapshot.docs[0];
      const existingInterviewData = existingInterview.data() as Interviews;
      return NextResponse.json({ 
        success: true, 
        interviewId: existingInterviewData.interviewId,
        interviewRefPath: existingInterview.ref.path,
        exists: true
      });
    }

    // 新規インタビュー作成処理
    const interviewId = uuidv4();
    const answerInterviewId = uuidv4();

    const interviewDocRef = interviewsCollection.doc(interviewId);
    const interviewData: Interviews = {
      interviewId: interviewId,
      intervieweeId: intervieweeId,
      answerInterviewId: answerInterviewId,
      createdAt: FieldValue.serverTimestamp(),
      questionCount: 0,
      reportCreated: false,
      interviewCollected: false,
      interviewDurationMin: themeData.interviewDurationMin,
      themeId: themeData.themeId,
      temporaryId: null,
      confirmedUserId: null,
    };
    await interviewDocRef.set(interviewData);

    // users コレクションの answerInterviews 作成
    const userAnswerInterviewsCollection = adminDb.collection("users").doc(intervieweeId).collection("answerInterviews");
    const answerInterviewDocRef = userAnswerInterviewsCollection.doc(answerInterviewId);
    const answerInterviewData: ServerAnswerInterviews = {
      createdAt: FieldValue.serverTimestamp(),
      interviewReference: interviewDocRef,
    };
    await answerInterviewDocRef.set(answerInterviewData);

    return NextResponse.json({ 
      success: true, 
      interviewId: interviewId,
      interviewRefPath: interviewDocRef.path,
      exists: false,
    });

  } catch (error) {
    console.error('インタビューの作成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'インタビューの作成に失敗しました' }, { status: 500 });
  }
}
