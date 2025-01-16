import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../../../../firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { User } from '@/stores/User';
import { Client } from '@/stores/Client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const {
      lastName,
      firstName,
      gender,
      userBirthday,
      organizationType,
      organizationName,
      departmentName,  // TODO サブコレクションを作成
      position,
      email,
      password,
      phoneNumber,
      employeeCount,
      country,
      language,
    } = await req.json();

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

    if (!lastName || !firstName || !gender || !userBirthday || !organizationType || 
      !organizationName || !position || !email || !password || 
      !phoneNumber || !employeeCount || !country || !language) {
    return NextResponse.json({ message: '全てのフィールドを入力してください' }, { status: 400 });
  }

    if (password.length < 6) {
      return NextResponse.json({ message: 'パスワードは6文字以上である必要があります' }, { status: 400 });
    }

    // メールアドレスが既に使用されているかチェック
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    if (signInMethods.length > 0) {
      return NextResponse.json({ message: 'このメールアドレスは既に使用されています' }, { status: 400 });
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const displayName = `${firstName} ${lastName}`;
    await updateProfile(user, { displayName });

    const organizationId = uuidv4();

    const userData: User = {
      email: user.email!,
      userNickname: displayName,
      userName: [firstName, lastName],
      createdAt: serverTimestamp(),
      userId: user.uid,
      gender: gender,
      userBirthday: birthdayTimestamp,
      interviewCount: 0,
      organizationId: organizationId,
      organizationPosition: position,
      userPhoneNumber: phoneNumber ? Number(phoneNumber) : null,
      inOrganization: true,
    };

    const clientData: Client = {
      organizationId: organizationId,
      organizationType: organizationType,
      organizationName: organizationName,
      administratorId: user.uid,
      childUsersCount: 1,
      childUserIds: [user.uid],
      createdAt: serverTimestamp(),
      themesCount: 0,
    };


    await setDoc(doc(db, 'users', user.uid), userData);
    await setDoc(doc(db, 'clients', clientData.organizationId), clientData);

    const token = await user.getIdToken();

    return NextResponse.json({
      message: 'ユーザーが正常に登録されました',
      token,
      user: {
        email: user.email,
        userNickname: displayName,
        userId: user.uid,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('登録エラー:', error);
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json({ message: 'このメールアドレスは既に使用されています' }, { status: 400 });
      }
    }
    return NextResponse.json({ message: 'ユーザー登録中にエラーが発生しました' }, { status: 500 });
  }
}
