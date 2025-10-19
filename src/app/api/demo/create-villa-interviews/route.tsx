import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// 30人分の多様なペルソナ
const villaPersonas = [
  // 富裕層
  { age: '40代', gender: '男性', occupation: '会社経営者' },
  { age: '50代', gender: '女性', occupation: '医師' },
  { age: '30代', gender: '男性', occupation: '投資家' },
  { age: '60代', gender: '男性', occupation: '企業役員' },
  { age: '40代', gender: '女性', occupation: '弁護士' },
  
  // ファミリー層
  { age: '30代', gender: '女性', occupation: 'IT企業管理職' },
  { age: '40代', gender: '男性', occupation: '外資系コンサルタント' },
  { age: '30代', gender: '男性', occupation: 'エンジニア' },
  { age: '40代', gender: '女性', occupation: '大学教授' },
  { age: '50代', gender: '男性', occupation: '銀行員' },
  
  // カップル・新婚
  { age: '20代', gender: '女性', occupation: 'マーケター' },
  { age: '30代', gender: '男性', occupation: 'デザイナー' },
  { age: '20代', gender: '男性', occupation: 'スタートアップ創業者' },
  { age: '30代', gender: '女性', occupation: '広告代理店' },
  { age: '20代', gender: '女性', occupation: '商社勤務' },
  
  // シニア・リタイア層
  { age: '60代', gender: '女性', occupation: '元教員' },
  { age: '70代', gender: '男性', occupation: '元会社役員' },
  { age: '60代', gender: '男性', occupation: '元公務員' },
  { age: '50代', gender: '女性', occupation: '自営業' },
  { age: '60代', gender: '女性', occupation: '元看護師' },
  
  // 海外在住・外国人
  { age: '40代', gender: '男性', occupation: '外交官' },
  { age: '30代', gender: '女性', occupation: '国際機関職員' },
  { age: '50代', gender: '男性', occupation: '貿易会社経営' },
  { age: '40代', gender: '女性', occupation: '通訳・翻訳家' },
  { age: '30代', gender: '男性', occupation: '外資系金融' },
  
  // 特別な機会利用者
  { age: '30代', gender: '女性', occupation: 'イベントプランナー' },
  { age: '40代', gender: '男性', occupation: '芸能関係者' },
  { age: '20代', gender: '女性', occupation: 'インフルエンサー' },
  { age: '50代', gender: '男性', occupation: 'スポーツ選手' },
  { age: '30代', gender: '女性', occupation: 'アーティスト' }
];

// インタビュー内容生成関数
function generateVillaInterview(persona: typeof villaPersonas[0], index: number) {
  const interviewId = uuidv4();
  const messages = [];
  
  // システムメッセージ
  messages.push({
    id: uuidv4(),
    text: `こんにちは。本日は高級宿泊施設ヴィラについてのインタビューにご協力いただき、ありがとうございます。
${persona.age}の${persona.gender}で、${persona.occupation}をされているということですね。
まず、高級ヴィラを利用される際、どのような目的で利用されることが多いですか？`,
    isUser: false,
    timestamp: Timestamp.now()
  });

  // 利用目的の回答
  const purposes = [
    '家族との特別な記念日を過ごすため',
    'ビジネスの重要な商談のため',
    '日常から離れてリフレッシュするため',
    '友人たちとの贅沢な時間を過ごすため',
    'パートナーとの記念日を祝うため',
    '自分へのご褒美として',
    '海外からのゲストをもてなすため',
    '長期休暇をゆっくり過ごすため'
  ];
  
  messages.push({
    id: uuidv4(),
    text: purposes[index % purposes.length] + 'に利用することが多いです。プライバシーが確保された空間で、特別な時間を過ごせることが魅力です。',
    isUser: true,
    timestamp: Timestamp.now()
  });

  // 重視する要素について
  messages.push({
    id: uuidv4(),
    text: 'なるほど、ありがとうございます。高級ヴィラを選ぶ際、最も重視される要素は何でしょうか？',
    isUser: false,
    timestamp: Timestamp.now()
  });

  const priorities = [
    'プライバシーの確保とプライベートプール',
    'オーシャンビューと自然環境',
    '充実したスパ・ウェルネス施設',
    '高級感のある内装とアメニティ',
    'パーソナライズされたサービス',
    '食事のクオリティとオプション',
    'アクセスの良さと周辺環境',
    '静寂性と非日常感'
  ];

  messages.push({
    id: uuidv4(),
    text: `最も重視するのは${priorities[index % priorities.length]}です。
また、24時間対応のコンシェルジュサービスや、地元の文化体験プログラムなども重要です。
価格は月額${20 + (index * 10)}万円から${50 + (index * 15)}万円程度を想定しています。`,
    isUser: true,
    timestamp: Timestamp.now()
  });

  // 理想的な設備について
  messages.push({
    id: uuidv4(),
    text: '理想的なヴィラの設備やサービスについて、具体的に教えていただけますか？',
    isUser: false,
    timestamp: Timestamp.now()
  });

  const facilities = [
    'インフィニティプール、ジャグジー、プライベートビーチへのアクセス',
    'フルキッチン、BBQ設備、プライベートダイニングエリア',
    'ホームシアター、音響システム、スマートホーム機能',
    'ヨガスタジオ、フィットネスルーム、瞑想スペース',
    'ワインセラー、シガールーム、ライブラリー',
    'キッズルーム、ゲームルーム、アクティビティ設備',
    'アートギャラリー、日本庭園、茶室',
    'ヘリポート、プライベート桟橋、専用車両'
  ];

  messages.push({
    id: uuidv4(),
    text: `理想的な設備としては、${facilities[index % facilities.length]}があることです。
さらに、専属シェフによる料理、スパトリートメント、アクティビティの手配なども期待しています。
環境への配慮や、地域社会への貢献も重要な要素だと考えています。`,
    isUser: true,
    timestamp: Timestamp.now()
  });

  // 過去の経験について
  messages.push({
    id: uuidv4(),
    text: '過去に利用されたヴィラで、特に印象に残った体験はありますか？',
    isUser: false,
    timestamp: Timestamp.now()
  });

  const experiences = [
    'バリ島でのサンセットディナーと伝統舞踊',
    '沖縄での早朝ヨガとマリンアクティビティ',
    '軽井沢での森林浴とプライベートコンサート',
    'ハワイでのサーフィンレッスンとルアウパーティー',
    'モルディブでの海中レストランとドルフィンウォッチング',
    '京都での茶道体験と懐石料理',
    'ニセコでのスキーとプライベート温泉',
    'プーケットでのヨットクルーズとタイマッサージ'
  ];

  messages.push({
    id: uuidv4(),
    text: `最も印象的だったのは${experiences[index % experiences.length]}の体験です。
スタッフの心遣いや、細部まで行き届いたサービスに感動しました。
一方で、Wi-Fi環境の不安定さや、子供向け設備の不足など、改善点も感じました。`,
    isUser: true,
    timestamp: Timestamp.now()
  });

  // 今後の期待
  messages.push({
    id: uuidv4(),
    text: '今後、高級ヴィラに期待される新しいサービスや機能はありますか？',
    isUser: false,
    timestamp: Timestamp.now()
  });

  messages.push({
    id: uuidv4(),
    text: `今後期待するのは、AIコンシェルジュによる24時間対応、VRを活用した事前の施設体験、
サステナブルな運営（太陽光発電、雨水利用など）、ウェルネスプログラムの充実、
そしてワーケーション対応の充実した仕事環境です。
また、ペット同伴可能な施設や、医療サポート体制の充実も重要になってくると思います。`,
    isUser: true,
    timestamp: Timestamp.now()
  });

  // 締めくくり
  messages.push({
    id: uuidv4(),
    text: '貴重なご意見をありがとうございました。最後に、理想的な高級ヴィラを一言で表現するとしたら？',
    isUser: false,
    timestamp: Timestamp.now()
  });

  messages.push({
    id: uuidv4(),
    text: `「第二の我が家でありながら、日常を超越した特別な体験ができる場所」ですね。
プライバシーと贅沢さ、そして心からのおもてなしが完璧に調和した空間が理想です。`,
    isUser: true,
    timestamp: Timestamp.now()
  });

  messages.push({
    id: uuidv4(),
    text: '素晴らしい表現ですね。本日は貴重なお時間をいただき、ありがとうございました。',
    isUser: false,
    timestamp: Timestamp.now()
  });

  return {
    interviewId,
    messages,
    userInfo: persona,
    interviewDuration: 15 + Math.floor(Math.random() * 10)
  };
}

export async function POST(req: NextRequest) {
  try {
    const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';
    const baseInterviewId = 'ccbf1181-c9b2-4689-8578-da89fd58d177';
    
    // テーマの存在確認
    const themeRef = adminDb.doc(`themes/${themeId}`);
    const themeDoc = await themeRef.get();
    
    if (!themeDoc.exists) {
      return NextResponse.json({ 
        error: 'テーマが見つかりません' 
      }, { status: 404 });
    }

    const results = [];
    
    // 30件のインタビューを生成
    for (let i = 0; i < 30; i++) {
      const persona = villaPersonas[i];
      const interviewData = generateVillaInterview(persona, i);
      
      // 新しいインタビューIDを生成（最初の1件は指定のIDを使用）
      const interviewId = i === 0 ? baseInterviewId : uuidv4();
      
      // インタビュードキュメントを作成
      const interviewRef = themeRef.collection('interviews').doc(interviewId);
      
      await interviewRef.set({
        interviewId,
        intervieweeId: `guest_${uuidv4().substring(0, 8)}`,
        answerInterviewId: uuidv4(),
        createdAt: FieldValue.serverTimestamp(),
        questionCount: interviewData.messages.filter(m => !m.isUser).length,
        reportCreated: false,
        interviewCollected: true,
        interviewDurationMin: interviewData.interviewDuration,
        themeId,
        userInfo: interviewData.userInfo,
        temporaryId: null,
        confirmedUserId: null
      });

      // メッセージを保存
      const messagesRef = interviewRef.collection('messages');
      for (const message of interviewData.messages) {
        await messagesRef.doc(message.id).set(message);
      }

      results.push({
        interviewId,
        persona: interviewData.userInfo,
        messageCount: interviewData.messages.length
      });
    }

    // テーマの統計を更新
    await themeRef.update({
      collectInterviewsCount: FieldValue.increment(30),
      lastInterviewDate: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: '30件の高級ヴィラインタビューデータを生成しました',
      themeId,
      results,
      totalInterviews: 30
    });

  } catch (error) {
    console.error('Error creating villa interview data:', error);
    return NextResponse.json({ 
      error: 'インタビューデータの生成に失敗しました',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// GET: 生成状況を確認
export async function GET(req: NextRequest) {
  try {
    const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';
    const themeRef = adminDb.doc(`themes/${themeId}`);
    const interviewsRef = themeRef.collection('interviews');
    
    const snapshot = await interviewsRef.get();
    
    return NextResponse.json({
      themeId,
      themeName: '高級宿泊施設ヴィラに関するインタビュー',
      totalInterviews: snapshot.size,
      interviews: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'データ取得に失敗しました' 
    }, { status: 500 });
  }
}