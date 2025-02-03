import { NextResponse } from 'next/server';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { email, password, interviewRefPath, temporaryId } = await request.json();

    // ユーザー認証
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // ユーザードキュメントの取得と組織所属確認
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!userData.inOrganization) {
      return NextResponse.json(
        { success: false, error: '組織に所属していないユーザーです' },
        { status: 403 }
      );
    }

    // インタビュードキュメントの取得
    const interviewRef = doc(db, interviewRefPath);
    const interviewDoc = await getDoc(interviewRef);

    if (!interviewDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'インタビューが見つかりません' },
        { status: 404 }
      );
    }

    const interviewData = interviewDoc.data();

    // temporaryIdの確認と更新
    if (interviewData.temporaryId === temporaryId) {
      await updateDoc(interviewRef, {
        temporaryId: null,
        confirmedUserId: userId,
        confirmedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: '認証が完了し、インタビューが確認されました',
      });
    }

    return NextResponse.json(
      { success: false, error: '一時IDが一致しません' },
      { status: 400 }
    );

  } catch (error) {
    if (error instanceof FirebaseError) {
      let errorMessage = '認証に失敗しました';
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'パスワードが間違っています';
          break;
        case 'auth/user-not-found':
          errorMessage = 'ユーザーが見つかりません';
          break;
        case 'auth/too-many-requests':
          errorMessage = '試行回数が多すぎます。後ほどお試しください';
          break;
      }
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: '予期せぬエラーが発生しました' },
      { status: 500 }
    );
  }
}
