import { NextResponse } from 'next/server';
import { db } from '../../../../firebase';
import { doc, setDoc, collection, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { AnswerInterviews } from '@/stores/AnswerInterviews';
import { ManageThemes } from '@/stores/ManageThemes';

export async function POST(request: Request) {
  try {
    const { theme, isCustomer, isTest, userId, duration, isPublic, deadline } = await request.json();

    if (!theme || !userId || !duration || !deadline) {
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
      deadline: Timestamp.fromDate(new Date(deadline)),
      clientId: organizationId,
      interviewsRequestedCount: intervieweeIds.length,
      collectInterviewsCount: 0,
      interviewDurationMin: duration,
      isPublic: isPublic !== undefined ? isPublic : true,
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
        reportCreated: false,
        interviewDurationMin: duration,
        themeId: newThemeId,
      };
      await setDoc(interviewDocRef, interviewData);

      // users コレクションの intervieweeId に answerInterviews サブコレクションを作成
      const userAnswerInterviewsCollection = collection(doc(db, "users", intervieweeId), "answerInterviews");
      const answerInterviewDocRef = doc(userAnswerInterviewsCollection);
      const answerInterviewData: AnswerInterviews = {
        createdAt: serverTimestamp(),
        interviewReference: interviewDocRef,
      };
      await setDoc(answerInterviewDocRef, answerInterviewData);

      // clients コレクションの organizationId に manageThemes サブコレクションを作成
      const clientManageThemesCollection = collection(doc(db, "clients", organizationId), "manageThemes");
      const manageThemeDocRef = doc(clientManageThemesCollection);
      const manageThemeData: ManageThemes = {
        createdAt: serverTimestamp(),
        themeReference: newThemeRef,
      };
      return setDoc(manageThemeDocRef, manageThemeData);
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, newThemeId });
  } catch (error) {
    console.error('インタビューの作成中にエラーが発生しました:', error);
    return NextResponse.json({ error: 'インタビューの作成に失敗しました' }, { status: 500 });
  }
}
