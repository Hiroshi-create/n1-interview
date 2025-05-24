import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { User } from '@/stores/User';
import { serverGetTenantIdForDomain } from '../../components/serverGetTenantIdForDomain';

interface NewUser {
  email: string;
  password: string;
  userName: string[];
  role: string;
  gender: string;
  organizationPosition: string;
  userPhoneNumber: string;
}

interface RequestBody {
  newUser: NewUser;
  organizationId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { newUser, organizationId }: RequestBody = await req.json();

    // 組織のテナントIDを取得
    const domain = newUser.email.split('@')[1];
    const tenantId = await serverGetTenantIdForDomain(domain);
    
    if (!tenantId) {
        throw new Error('登録されていないドメインです。組織内でのメールアドレスを使用してください。');
    }

    // テナント固有の認証インスタンスを取得
    const tenantAuth = adminAuth.tenantManager().authForTenant(tenantId);

    // Firebase Authenticationで新しいユーザーを作成
    const userRecord = await tenantAuth.createUser({
      email: newUser.email,
      password: newUser.password,
    });
    const userId = userRecord.uid;

    const userDoc: Partial<User> = {
      email: newUser.email,
      userNickname: Array.isArray(newUser.userName) ? newUser.userName.join(' ') : [newUser.userName].join(' '),
      userName: Array.isArray(newUser.userName) ? newUser.userName : [newUser.userName],
      createdAt: FieldValue.serverTimestamp(),
      userId: userId,
      gender: newUser.gender,
      userBirthday: null,
      interviewCount: 0,
      organizationId: organizationId,
      organizationPosition: newUser.organizationPosition,
      userPhoneNumber: newUser.userPhoneNumber.replace(/\D/g, '') !== '' ? newUser.userPhoneNumber.replace(/\D/g, '') : null,
      inOrganization: true,
      role: newUser.role,
      permissions: [],
      lastLoginAt: FieldValue.serverTimestamp(),
      status: 'active',
      twoFactorAuthEnabled: false,
      notificationPreferences: {
        email: true,
        inApp: true
      },
    };

    // ユーザードキュメントの作成/更新
    const userRef = adminDb.doc(`users/${userId}`);
    await userRef.set(userDoc, { merge: true });

    // クライアントドキュメントの更新
    const clientRef = adminDb.doc(`clients/${organizationId}`);
    await clientRef.update({
      childUserIds: FieldValue.arrayUnion(userId),
    });

    return NextResponse.json({ message: 'ユーザーが正常に登録されました', user: userDoc }, { status: 201 });
  } catch (error: unknown) {
    console.error('ユーザー登録エラー:', error);
    return NextResponse.json({ message: 'ユーザー登録中にエラーが発生しました' }, { status: 500 });
  }
}
