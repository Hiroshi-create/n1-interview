import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { User } from '@/stores/User';

interface RequestBody {
  email: string
  userNickname: string
  gender: 'male' | 'female' | 'other' | 'not_specified'
  userBirthday: {
      year: string
      monthDay: string
  }
  userId: string
}

export async function POST(req: NextRequest) {
  try {
    const { email, userNickname, gender, userBirthday, userId }: RequestBody = await req.json();

    // userBirthdayの検証
    if (!userBirthday || typeof userBirthday.year !== 'string' || typeof userBirthday.monthDay !== 'string') {
      return NextResponse.json({ message: '生年月日の形式が正しくありません' }, { status: 400 });
    }
    const year = userBirthday.year;
    const month = userBirthday.monthDay.substring(0, 2);
    const day = userBirthday.monthDay.substring(2);
    const birthdayString = `${year}-${month}-${day}`;
    const birthdayDate = new Date(birthdayString);
    if (isNaN(birthdayDate.getTime())) {
      return NextResponse.json({ message: '無効な生年月日です' }, { status: 400 });
    }

    const birthdayTimestamp = Timestamp.fromDate(birthdayDate);

    if (!email || !userNickname || !gender || !birthdayTimestamp || !userId) {
      return NextResponse.json({ message: '全てのフィールドを入力してください' }, { status: 400 });
    }

    const userData: User = {
      email: email,
      userNickname: userNickname,
      userName: [],
      createdAt: FieldValue.serverTimestamp(),
      userId: userId,
      gender: gender,
      userBirthday: birthdayTimestamp,
      interviewCount: 0,
      organizationId: '',
      organizationPosition: '',
      userPhoneNumber: null,
      inOrganization: false,
      role: 'user',
      permissions: [],
      lastLoginAt: FieldValue.serverTimestamp(),
      status: 'active',
      twoFactorAuthEnabled: false,
      notificationPreferences: {
        email: true,
        inApp: true,
      },
      dataAccessLevel: 'basic',
      featureAccess: [],
    };

    await adminDb.doc(`users/${userId}`).set(userData);

    return NextResponse.json({
      message: 'ユーザーが正常に登録されました',
      user: {
        email: email,
        userNickname: userNickname,
        userId: userId,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('登録エラー:', error);
    return NextResponse.json({ message: 'ユーザー登録中にエラーが発生しました' }, { status: 500 });
  }
}
