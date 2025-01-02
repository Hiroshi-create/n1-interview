import { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Firebaseの初期化
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'メソッドが許可されていません' });
  }

  try {
    const { email, password, name } = req.body;

    // 入力値のバリデーション
    if (!email || !password || !name) {
      return res.status(400).json({ message: '全てのフィールドを入力してください' });
    }

    // パスワードの強度チェック
    if (password.length < 6) {
      return res.status(400).json({ message: 'パスワードは8文字以上である必要があります' });
    }

    // Firebaseでユーザー作成
    const auth = getAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Firestoreにユーザー情報を保存
    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      name: userRecord.displayName,
      createdAt: new Date(),
    });

    // カスタムトークンの生成
    const token = await auth.createCustomToken(userRecord.uid);

    res.status(201).json({
      message: 'ユーザーが正常に登録されました',
      token,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
      },
    });
  } catch (error) {
    console.error('登録エラー:', error);
    res.status(500).json({ message: 'ユーザー登録中にエラーが発生しました' });
  }
}
