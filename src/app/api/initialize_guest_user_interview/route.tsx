import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebase-admin";
import { DocumentData, DocumentReference, FieldValue, Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { Interviews } from "@/stores/Interviews";
import { Theme } from "@/stores/Theme";

interface ServerGuestUser {
  createdAt: Timestamp | FieldValue;
  guestUserId: string;
  interviewReference: DocumentReference<DocumentData>;
}

interface RequestBody {
  acquiredThemeId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { acquiredThemeId }: RequestBody = await req.json();
    const themeId = acquiredThemeId;

    // FirestoreのthemesコレクションのthemeIdドキュメントのフィールドを取得
    const themeDocRef = adminDb.doc(`themes/${themeId}`);
    const themeDocSnap = await themeDocRef.get();
    if (!themeDocSnap.exists) {
      return NextResponse.json({ error: "テーマが見つかりません" }, { status: 404 });
    }
    const themeData = themeDocSnap.data() as Theme;
    const interviewDurationMin = themeData.interviewDurationMin;
    const theme = themeData.theme;

    const guestUserId = uuidv4();
    const interviewId = uuidv4();
    const answerInterviewId = uuidv4();

    // インタビューのデータを作成
    const interviewDocRef = themeDocRef.collection("interviews").doc(interviewId);
    const interviewData: Interviews = {
      interviewId: interviewId,
      intervieweeId: guestUserId,
      answerInterviewId: answerInterviewId,
      createdAt: FieldValue.serverTimestamp(),
      questionCount: 0,
      reportCreated: false,
      interviewCollected: false,
      interviewDurationMin: interviewDurationMin,
      themeId: themeId,
      temporaryId: null,
      confirmedUserId: null,
    };
    await interviewDocRef.set(interviewData);

    // ゲストユーザーのデータを作成
    const guestUserDocRef = adminDb.collection("guestUsers").doc(guestUserId);
    const guestUserData: ServerGuestUser = {
      createdAt: FieldValue.serverTimestamp(),
      guestUserId: guestUserId,
      interviewReference: interviewDocRef,
    };
    await guestUserDocRef.set(guestUserData);

    // ゲストユーザー用のURLを生成
    const guestUserPathname = `/auto-interview/guest-user/${themeId}/${interviewId}/description`;

    return NextResponse.json({
      guestUserPathname,
      guestUserId,
      theme,
      themeId,
      interviewId,
      interviewRefPath: interviewDocRef.path,
    });
  } catch (error) {
    console.error("処理中にエラーが発生しました:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
