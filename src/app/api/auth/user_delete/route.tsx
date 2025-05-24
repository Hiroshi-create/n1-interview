import { adminDb } from '@/lib/firebase-admin';
import { Client } from '@/stores/Client';
import { User } from '@/stores/User';
import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
    user: User;
    clientId?: string;
}

interface FirebaseError {
    code: string;
    message: string;
    details?: unknown;
}

function isFirebaseError(error: unknown): error is FirebaseError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error
    );
}

export async function POST(request: NextRequest) {
    try {
        const { user: userData, clientId: organizationId }: RequestBody = await request.json();

        if (!userData) {
            return NextResponse.json({ error: 'ユーザーデータが空です' }, { status: 400 });
        }

        if (!userData.inOrganization) {
            await performUserDeletion(userData);
        } else {
            if (!organizationId) {
                return NextResponse.json({ error: 'クライアントIDが必要です' }, { status: 400 });
            }

            // Firestoreからclientデータを取得
            const clientRef = adminDb.collection('clients').doc(organizationId);
            const clientDoc = await clientRef.get();

            if (!clientDoc.exists) {
                return NextResponse.json({ error: 'クライアントが見つかりません' }, { status: 404 });
            }

            const clientData = clientDoc.data() as Client;

            const conditions = {
                organizationMatch: userData.organizationId === clientData.organizationId,
                notAdministrator: userData.userId !== clientData.administratorId,
                inChildUserIds: clientData.childUserIds.includes(userData.userId)
            };

            if (conditions.organizationMatch && conditions.notAdministrator && conditions.inChildUserIds) {
                await performUserDeletion(userData);
                
                await clientRef.update({
                    childUserIds: clientData.childUserIds.filter(id => id !== userData.userId)
                });
            } else {
                const failedConditions = Object.entries(conditions)
                    .filter(([_, value]) => !value)
                    .map(([key]) => key);

                return NextResponse.json({ 
                    error: 'ユーザーを削除する条件を満たしていません', 
                    failedConditions,
                    details: { userData, clientData } 
                }, { status: 403 });
            }
        }
        return NextResponse.json({ message: 'ユーザーが正常に削除されました' });
    } catch (error) {
        console.error('ユーザーの削除に失敗しました:', error);
        if (isFirebaseError(error)) {
        return NextResponse.json({ 
            error: 'Firebaseエラー: ユーザーの削除に失敗しました', 
            code: error.code,
            message: error.message,
            details: error.details
        }, { status: error.code === 'permission-denied' ? 403 : 500 });
        }
        return NextResponse.json({ error: 'ユーザーの削除に失敗しました', details: error }, { status: 500 });
    }
}

async function performUserDeletion(userData: User) {
    try {
        const deletedUserRef = adminDb.collection('deletedUsers').doc(userData.userId);
        await deletedUserRef.set(userData);

        const userRef = adminDb.collection('users').doc(userData.userId);
        await userRef.delete();
    } catch (error) {
        console.error('ユーザー削除処理中にエラーが発生しました:', error);
        throw error;
    }
}