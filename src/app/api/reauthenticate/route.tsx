import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface RequestBody {
  userId: string;
  interviewRefPath: string;
  temporaryId: string;
}

export async function POST(request: Request) {
  try {
    const { userId, interviewRefPath, temporaryId }: RequestBody = await request.json();

    // ユーザードキュメントの取得と組織所属確認
    const userRef = adminDb.doc(`users/${userId}`);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (!userData?.inOrganization) {
      return NextResponse.json(
        { success: false, error: '組織に所属していないユーザーです' },
        { status: 403 }
      );
    }

    // インタビュードキュメントの取得
    const interviewRef = adminDb.doc(interviewRefPath);
    const interviewDoc = await interviewRef.get();

    if (!interviewDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'インタビューが見つかりません' },
        { status: 404 }
      );
    }

    const interviewData = interviewDoc.data();

    // temporaryIdの確認と更新
    if (interviewData?.temporaryId === temporaryId) {
      await interviewRef.update({
        temporaryId: null,
        confirmedUserId: userId,
        confirmedAt: FieldValue.serverTimestamp(),
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
    console.error('エラー:', error);
    return NextResponse.json(
      { success: false, error: '予期せぬエラーが発生しました' },
      { status: 500 }
    );
  }
}
