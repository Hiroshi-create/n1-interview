import { NextResponse } from 'next/server';
import { db } from '../../../../firebase';
import { doc, setDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { AnswerInterviews } from '@/stores/AnswerInterviews';

export async function POST(request: Request) {
  try {
    const { themeRefPath, intervieweeId } = await request.json();

    if (!themeRefPath || !intervieweeId) {
      return NextResponse.json({ error: "無効なデータです" }, { status: 400 });
    }

    const userDocRef = doc(db, "users", intervieweeId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
        return NextResponse.json({ error: 'ユーザードキュメントが見つかりません' }, { status: 404 });
    }
    const userData = userDocSnap.data();

    const themeDocRef = doc(db, themeRefPath);
    const themeDocSnap = await getDoc(themeDocRef);
    if (!themeDocSnap.exists()) {
        return NextResponse.json({ error: 'ユーザードキュメントが見つかりません' }, { status: 404 });
    }
    const themeData = themeDocSnap.data() as Theme;

    const interviewsCollection = collection(themeDocRef, 'interviews');
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

    // users コレクションの intervieweeId に answerInterviews サブコレクションを作成
    const userAnswerInterviewsCollection = collection(db, "users", intervieweeId, "answerInterviews");
    const answerInterviewDocRef = doc(userAnswerInterviewsCollection, answerInterviewId);
    const answerInterviewData: AnswerInterviews = {
    createdAt: serverTimestamp(),
    interviewReference: interviewDocRef,
    };
    await setDoc(answerInterviewDocRef, answerInterviewData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('インタビューの作成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'インタビューの作成に失敗しました' }, { status: 500 });
  }
}
