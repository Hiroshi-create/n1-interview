import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '../../../../../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // 入力値のバリデーション
    if (!email || !password || !name) {
      return NextResponse.json({ message: '全てのフィールドを入力してください' }, { status: 400 });
    }

    // パスワードの強度チェック
    if (password.length < 6) {
      return NextResponse.json({ message: 'パスワードは6文字以上である必要があります' }, { status: 400 });
    }

    // Firebaseでユーザー作成
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ユーザープロフィールの更新
    await updateProfile(user, { displayName: name });

    // Firestoreにユーザー情報を保存
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      name: user.displayName,
      createdAt: serverTimestamp(),
    });

    // IDトークンの取得
    const token = await user.getIdToken();

    return NextResponse.json({
      message: 'ユーザーが正常に登録されました',
      token,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('登録エラー:', error);
    return NextResponse.json({ message: 'ユーザー登録中にエラーが発生しました' }, { status: 500 });
  }
}
