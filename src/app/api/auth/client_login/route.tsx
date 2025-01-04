// route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../../../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();

        // ユーザードキュメントの参照を取得
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            // inOrganizationフィールドがtrueかチェック
            if (userData.inOrganization === true) {
                // organizationIdフィールドを取得
                const organizationId = userData.organizationId;
                if (organizationId) {
                    return NextResponse.json({ organizationId }, { status: 200 });
                }
            }
            
            // inOrganizationがfalseまたはorganizationIdが存在しない場合
            return NextResponse.json({ message: '組織に所属していません。' }, { status: 403 });
        } else {
            return NextResponse.json({ message: 'ユーザーが見つかりません。' }, { status: 404 });
        }
    } catch (error) {
        console.error('エラー:', error);
        return NextResponse.json({ message: 'サーバーエラーが発生しました。' }, { status: 500 });
    }
}
