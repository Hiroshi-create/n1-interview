import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Client } from '@/stores/Client';

interface RequestBody {
  organizationId: string
  updatedData: Client
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, updatedData }: RequestBody = await req.json();

    // lastAuditDate, createdAt, subscriptionRenewalDateを除外し、undefinedのフィールドも除外
    const { lastAuditDate, createdAt, subscriptionRenewalDate, ...restData } = updatedData;
    const filteredData = Object.entries(restData).reduce<Partial<Client>>((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {});

    // 組織情報の更新
    const batch = adminDb.batch();
    const orgRef = adminDb.collection('clients').doc(organizationId);
    
    // filteredDataとlastAuditDate.organizationを別々に更新
    batch.update(orgRef, filteredData);
    batch.update(orgRef, {
      'lastAuditDate.organization': FieldValue.serverTimestamp(),
    });

    // バッチ処理を実行
    await batch.commit();

    return NextResponse.json({ message: '組織設定が更新されました' }, { status: 200 });
  } catch (error: unknown) {
    console.error('組織設定の更新中にエラーが発生しました:', error);
    return NextResponse.json({ message: '組織設定の更新に失敗しました' }, { status: 500 });
  }
}
