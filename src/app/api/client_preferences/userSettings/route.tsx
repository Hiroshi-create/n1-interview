import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { User } from '@/stores/User';

type UserWithStringTimestamp = Omit<User, 'userBirthday'> & {
  userBirthday: string;
};

interface RequestBody {
  userId: string
  updatedData: UserWithStringTimestamp
}

export async function POST(req: NextRequest) {
  try {
    const { userId, updatedData }: RequestBody = await req.json();

    const userRef = adminDb.collection('users').doc(userId);

    // createdAt, lastLoginAtを除外し、undefinedのフィールドも除外
    const { createdAt, lastLoginAt, ...restData } = updatedData;
    const filteredData = Object.entries(restData).reduce<Partial<User>>((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {});

    // User型に合わせてデータを変換
    const userDataToUpdate: Partial<User> = {
      ...filteredData,
      userBirthday: Timestamp.fromDate(new Date(updatedData.userBirthday)) as any,
    };

    // 電話番号の処理
    if (userDataToUpdate.userPhoneNumber) {
      userDataToUpdate.userPhoneNumber = userDataToUpdate.userPhoneNumber.replace(/\D/g, '');
      if (userDataToUpdate.userPhoneNumber === '') {
        userDataToUpdate.userPhoneNumber = null;
      }
    }

    await userRef.update(userDataToUpdate);

    return NextResponse.json({ message: 'ユーザー設定が更新されました' }, { status: 200 });
  } catch (error: unknown) {
    console.error('ユーザー設定の更新中にエラーが発生しました:', error);
    return NextResponse.json({ message: 'ユーザー設定の更新に失敗しました' }, { status: 500 });
  }
}
