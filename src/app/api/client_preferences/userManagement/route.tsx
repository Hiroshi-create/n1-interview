import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

type UpdatedUser = {
  userId: string;
  role: string;
  dataAccessLevel: string;
  featureAccess: string[];
  status: string;
};

type UpdatedOrganization = {
  childUserIds: string[];
};

type RequestBody = {
  organizationId: string | undefined;
  updatedUsers: UpdatedUser[];
  updatedOrganization: UpdatedOrganization;
};

export async function POST(req: NextRequest) {
  try {
    const { organizationId, updatedUsers, updatedOrganization }: RequestBody = await req.json();
    console.log('Received data:', { organizationId, updatedUsers, updatedOrganization });

    if (!organizationId) {
      return NextResponse.json({ error: '組織IDが提供されていません' }, { status: 400 });
    }

    if (!updatedUsers || !Array.isArray(updatedUsers)) {
      return NextResponse.json({ error: 'updatedUsersが正しく提供されていません' }, { status: 400 });
    }

    const batch = adminDb.batch();

    // ユーザー情報の更新
    updatedUsers.forEach((user: UpdatedUser) => {
      const userRef = adminDb.collection('users').doc(user.userId);
      batch.update(userRef, {
        role: user.role,
        dataAccessLevel: user.dataAccessLevel,
        featureAccess: user.featureAccess,
        status: user.status,
      });
    });

    // 組織情報の更新
    const orgRef = adminDb.collection('clients').doc(organizationId);
    batch.update(orgRef, {
      ...updatedOrganization,
      'lastAuditDate.user': FieldValue.serverTimestamp()
    });

    await batch.commit();

    return NextResponse.json({ message: 'ユーザー管理設定が更新されました' }, { status: 200 });
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json({ error: 'ユーザー管理設定の更新中にエラーが発生しました' }, { status: 500 });
  }
}
