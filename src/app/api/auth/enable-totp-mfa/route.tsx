import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, enableTOTPMFA } from '@/lib/firebase-admin';

interface RequestBody {
    tenantId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId }: RequestBody = await request.json();
    // プロジェクトレベルでTOTP MFAを有効化
    await enableTOTPMFA();

    // 各テナントでTOTP MFAを有効化
    await adminAuth.tenantManager().updateTenant(tenantId, {
        multiFactorConfig: {
            state: 'ENABLED',
            providerConfigs: [{
            state: 'ENABLED',
            totpProviderConfig: {
                adjacentIntervals: 5 // デフォルト値
            }
            }]
        }
    });
    console.log(`テナントレベルで TOTP MFA を有効化しました。`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TOTP MFA の有効化に失敗しました:', error);
    return NextResponse.json({ error: 'TOTP MFA の有効化に失敗しました' }, { status: 500 });
  }
}
