import { NextResponse } from 'next/server';
import { db } from '../../../../firebase';
import { doc, setDoc, collection, serverTimestamp, getDoc, query, where, getDocs } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { AnswerInterviews } from '@/stores/AnswerInterviews';

export async function POST(request: Request) {
  try {
    const { intervieweeId, themeRefPath } = await request.json();

    if (!intervieweeId || !themeRefPath) {
      return NextResponse.json({ error: "無効なデータです" }, { status: 400 });
    }

    const themeDocRef = doc(db, themeRefPath as string);
    const themeDocSnap = await getDoc(themeDocRef);
    if (!themeDocSnap.exists()) {
      return NextResponse.json({ error: 'テーマドキュメントが見つかりません' }, { status: 404 });
    }
    const themeData = themeDocSnap.data() as Theme;

    const interviewsCollection = collection(themeDocRef, 'interviews');

    // 既存のインタビューを検索
    const q = query(interviewsCollection, where('intervieweeId', '==', intervieweeId));
    const querySnapshot = await getDocs(q);

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

    const interviewDocRef = doc(interviewsCollection, interviewId);
    const interviewData: Interviews = {
      interviewId: interviewId,
      intervieweeId: intervieweeId,
      answerInterviewId: answerInterviewId,
      createdAt: serverTimestamp(),
      questionCount: 0,
      reportCreated: false,
      interviewCollected: false,
      interviewDurationMin: themeData.interviewDurationMin,
      themeId: themeData.themeId,
      temporaryId: null,
      confirmedUserId: null,
    };
    await setDoc(interviewDocRef, interviewData);

    // users コレクションの answerInterviews 作成
    const userAnswerInterviewsCollection = collection(db, "users", intervieweeId, "answerInterviews");
    const answerInterviewDocRef = doc(userAnswerInterviewsCollection, answerInterviewId);
    const answerInterviewData: AnswerInterviews = {
      createdAt: serverTimestamp(),
      interviewReference: interviewDocRef,
    };
    await setDoc(answerInterviewDocRef, answerInterviewData);

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
