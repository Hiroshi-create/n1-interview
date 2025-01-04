import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../../../../firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { User } from '@/stores/User';

export async function POST(req: NextRequest) {
  try {
    const { email, password, userNickname, gender, userBirthday } = await req.json();

    // userBirthdayの検証
    if (!userBirthday || typeof userBirthday.year !== 'string' || typeof userBirthday.monthDay !== 'string') {
      return NextResponse.json({ message: '生年月日の形式が正しくありません' }, { status: 400 });
    }
    // birthdayStringの作成を修正
    const year = userBirthday.year;
    const month = userBirthday.monthDay.substring(0, 2);
    const day = userBirthday.monthDay.substring(2);
    const birthdayString = `${year}-${month}-${day}`;
    const birthdayDate = new Date(birthdayString);
    // 無効な日付の場合はエラーを返す
    if (isNaN(birthdayDate.getTime())) {
      return NextResponse.json({ message: '無効な生年月日です' }, { status: 400 });
    }

    const birthdayTimestamp = Timestamp.fromDate(birthdayDate);

    if (!email || !password || !userNickname || !gender || !birthdayTimestamp) {
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

    await updateProfile(user, { displayName: userNickname });

    const userData: User = {
      email: user.email!,
      userNickname: user.displayName!,
      userName: [],
      createdAt: serverTimestamp(),
      userId: user.uid,
      gender: gender,
      userBirthday: birthdayTimestamp,
      interviewCount: 0,
      organizationId: '',
      organizationPosition: '',
      userPhoneNumber: null,
      inOrganization: false,
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    const token = await user.getIdToken();

    return NextResponse.json({
      message: 'ユーザーが正常に登録されました',
      token,
      user: {
        email: user.email,
        userNickname: user.displayName,
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
    // デフォルトのエラーレスポンス
    return NextResponse.json({ message: 'ユーザー登録中にエラーが発生しました' }, { status: 500 });
  }
}