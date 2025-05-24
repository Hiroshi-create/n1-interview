import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, enableTOTPMFA } from '../../../../lib/firebase-admin';
import { Auth, getAuth, TenantAwareAuth } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
  try {
    // // TOTP MFAをプロジェクトレベルで有効化
    // await enableTOTPMFA();

    console.log("サーバー時刻:", new Date().toISOString());
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '認証トークンが不足しています。' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    // tenantIdをdecodedTokenから直接取得
    const tenantId = decodedToken.firebase?.tenant || null;

    let auth: TenantAwareAuth | Auth = getAuth();
    if (tenantId) {
      auth = auth.tenantManager().authForTenant(tenantId);
    }

    const user = await auth.getUser(userId);
    console.log('User found:', user.uid);

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const userData = userSnap.data();
      const mfaEnabled = user.multiFactor?.enrolledFactors && user.multiFactor.enrolledFactors.length > 0;
      const requireMFA = !mfaEnabled;

      if (userData?.inOrganization === true) {
        const organizationId = userData.organizationId;
        if (organizationId) {
          return NextResponse.json({ 
            organizationId, 
            mfaEnabled, 
            requireMFA 
          }, { status: 200 });
        }
      }
      return NextResponse.json({ 
        message: '組織に所属していません。', 
        mfaEnabled, 
        requireMFA 
      }, { status: 403 });
    } else {
      return NextResponse.json({ message: 'ユーザーが見つかりません。' }, { status: 404 });
    }
  } catch (error) {
    console.error('エラー:', error);
    if (error instanceof Error) {
      return NextResponse.json({ 
        message: 'サーバーエラーが発生しました。', 
        error: error.message 
      }, { status: 500 });
    } else {
      return NextResponse.json({ 
        message: 'サーバーエラーが発生しました。', 
        error: '不明なエラー' 
      }, { status: 500 });
    }
  }
}
