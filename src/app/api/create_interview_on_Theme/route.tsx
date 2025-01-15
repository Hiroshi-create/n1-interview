import { NextResponse } from 'next/server';
import { db } from '../../../../firebase';
import { doc, setDoc, collection, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { AnswerInterviews } from '@/stores/AnswerInterviews';

export async function POST(request: Request) {
  try {
    const { theme, isCustomer, isTest, userId } = await request.json();

    if (!theme || !userId) {
      return NextResponse.json({ error: "無効なデータです" }, { status: 400 });
    }

    // ユーザードキュメントから organizationId を取得
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
        return NextResponse.json({ error: 'ユーザードキュメントが見つかりません' }, { status: 404 });
    }
    const userData = userDocSnap.data();
    const organizationId = userData.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: '組織IDが見つかりません' }, { status: 400 });
    }

    const newThemeId = uuidv4();
    const intervieweeIds = isTest ? [userId] : [userId];

    const newThemeData: Theme = {
      themeId: newThemeId,
      theme: theme,
      createUserId: userId,
      createdAt: Timestamp.now(),
      searchClientId: organizationId,
      interviewsRequestedCount: intervieweeIds.length,
      collectInterviewsCount: 0,
    };

    const newThemeRef = doc(db, "themes", newThemeId);
    await setDoc(newThemeRef, newThemeData);


    const interviewsCollection = collection(newThemeRef, 'interviews');
    const promises = intervieweeIds.map(async (intervieweeId) => {
        const interviewId = uuidv4();
        const interviewDocRef = doc(interviewsCollection, interviewId);
        const interviewData: Interviews = {
            interviewId: interviewId,
            intervieweeId: intervieweeId,
            createdAt: serverTimestamp(),
            questionCount: 0,
            theme: theme,
        };
        await setDoc(interviewDocRef, interviewData);

        // users コレクションの intervieweeId に answerInterviews サブコレクションを作成
        const userAnswerInterviewsCollection = collection(doc(db, "users", intervieweeId), "answerInterviews");
        const answerInterviewDocRef = doc(userAnswerInterviewsCollection);
        const answerInterviewData: AnswerInterviews = {
            createdAt: serverTimestamp(),
            interviewReference: interviewDocRef,
        };
        return setDoc(answerInterviewDocRef, answerInterviewData);
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, newThemeId });
  } catch (error) {
    console.error('インタビューの作成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'インタビューの作成に失敗しました' }, { status: 500 });
  }
}
