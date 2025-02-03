import { NextRequest, NextResponse } from "next/server";
import { doc, setDoc, serverTimestamp, collection, getDoc } from 'firebase/firestore';
import { GuestUser } from "@/stores/GuestUser";
import { db } from "../../../../firebase";
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from "@/stores/Interviews";
import { AnswerInterviews } from "@/stores/AnswerInterviews";
import { Theme } from "@/stores/Theme";

export async function POST(req: NextRequest) {
  try {
    const { pathname } = await req.json();

    if (!pathname) {
      return NextResponse.json({ error: 'インタビューの参照パスが指定されていません' }, { status: 400 });
    }
    
    const uuidRegex = /\/guest-user\/([0-9a-fA-F-]{36})/;
    const match = pathname.match(uuidRegex);
    
    if (!match) {
      return NextResponse.json({ error: '有効な情報が見つかりません' }, { status: 400 });
    }

    const themeId = match[1];
    
    // firestoreのthemesコレクションのthemeIdドキュメントのフィールドを取得
    const themeDocRef = doc(db, "themes", themeId);
    const themeDoc = await getDoc(themeDocRef);
    if (!themeDoc.exists()) {
      return NextResponse.json({ error: 'テーマが見つかりません' }, { status: 404 });
    }
    const themeData = themeDoc.data() as Theme;
    const interviewDurationMin = themeData.interviewDurationMin;
    const theme = themeData.theme;

    const guestUserId = uuidv4();
    const interviewId = uuidv4();
    const answerInterviewId = uuidv4();
    const manageThemeId = uuidv4();

    // firestoreの、themesコレクション/themeIdドキュメント/interviewsコレクションにinterviewIdをドキュメントIdとして追加
    const themeRef = doc(db, "themes", themeId);
    const interviewsCollection = collection(themeRef, 'interviews');
    const interviewDocRef = doc(interviewsCollection, interviewId);
    const interviewData: Interviews = {
      interviewId: interviewId,
      intervieweeId: guestUserId,
      manageThemeId: manageThemeId,
      answerInterviewId: answerInterviewId,
      createdAt: serverTimestamp(),
      questionCount: 0,
      reportCreated: false,
      interviewCollected: false,
      interviewDurationMin: interviewDurationMin,
      themeId: themeId,
      temporaryId: null,
      confirmedUserId: null,
    };
    await setDoc(interviewDocRef, interviewData);

    // Firestoreにデータを追加
    const interviewReference = doc(db, 'themes', themeId, 'interviews', interviewId);
    const guestUserData: GuestUser = {
      createdAt: serverTimestamp(),
      guestUserId: guestUserId,
      interviewReference: interviewReference,
    };
    await setDoc(doc(db, 'guestUsers', guestUserId), guestUserData);

    const guestUserPathname = `/auto-interview/guest-user/${themeId}/${interviewId}/description`;

    return NextResponse.json({
      guestUserPathname: guestUserPathname,
      guestUserId: guestUserId,
      theme: theme,
      themeId: themeId,
      interviewId: interviewId,
      interviewRefPath: interviewReference.path,
    });
  } catch (error) {
    console.error('処理中にエラーが発生しました:', error);
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }
}
