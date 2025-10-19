#!/usr/bin/env node

/**
 * デモインタビューデータを作成するスクリプト
 * 使用方法: node scripts/create-demo-interview.js
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Firebase Admin初期化
function initializeFirebase() {
  if (admin.apps.length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin.firestore();
}

async function createDemoInterview() {
  const db = initializeFirebase();
  
  const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
  const interviewId = '01adc61b-b4fb-4bab-8446-5c2a6250f4d0';
  
  console.log('📝 デモインタビューデータを作成中...');
  console.log(`Theme ID: ${themeId}`);
  console.log(`Interview ID: ${interviewId}`);
  
  try {
    // 1. テーマドキュメントを作成/更新
    const themeRef = db.doc(`themes/${themeId}`);
    await themeRef.set({
      themeId: themeId,
      theme: '新製品開発のためのユーザーインタビュー',
      deadline: admin.firestore.Timestamp.fromDate(new Date('2025-12-31')),
      isPublic: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      organizationId: 'demo-org-001',
      description: 'ユーザーのニーズと製品に対する期待を理解するためのインタビュー'
    }, { merge: true });
    
    console.log('✅ テーマドキュメントを作成しました');
    
    // 2. インタビュードキュメントを作成
    const interviewRef = db.doc(`themes/${themeId}/interviews/${interviewId}`);
    await interviewRef.set({
      interviewId: interviewId,
      startTime: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:00:00')),
      endTime: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:30:00')),
      duration: 1800, // 30分
      interviewCollected: true, // 完了フラグ
      reportCreated: false, // レポート未生成
      temporaryId: null,
      confirmedUserId: 'demo-user-001',
      userInfo: {
        age: '30代',
        gender: '男性',
        occupation: 'ソフトウェアエンジニア'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ インタビュードキュメントを作成しました');
    
    // 3. メッセージコレクションにインタビュー内容を追加
    const messagesRef = interviewRef.collection('messages');
    
    const messages = [
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'こんにちは！本日は新製品開発に関するインタビューにご協力いただきありがとうございます。まず、普段どのような製品やサービスをよく利用されていますか？',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:00:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '主にプロジェクト管理ツールやコミュニケーションツールを使っています。SlackやNotionを日常的に使用していて、チームでの情報共有に役立てています。',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:02:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'なるほど、チームコラボレーションツールをよく使われているんですね。現在使用しているツールで、何か不便に感じることはありますか？',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:03:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: 'はい、いくつかあります。まず、複数のツールを行き来する必要があることが面倒です。また、情報が分散してしまって、必要な情報を見つけるのに時間がかかることがあります。特にドキュメントとタスク管理が別々のツールになっていると、関連性が見えにくいです。',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:05:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: '情報の統合が課題なんですね。理想的には、どのような機能があると便利だと思いますか？',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:07:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '理想的には、プロジェクトに関するすべての情報が一箇所で管理できて、AIが関連する情報を自動的に整理・提案してくれるような機能があると便利です。例えば、タスクを作成したら関連するドキュメントを自動的にリンクしてくれたり、過去の似たようなプロジェクトの知見を提示してくれたりすると助かります。',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:09:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'AI による情報の自動整理と提案機能ですね。そのような製品があった場合、価格についてはどのように考えますか？',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:11:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '機能が充実していて、実際に業務効率が向上するのであれば、月額3,000円から5,000円程度なら検討すると思います。チーム全体で使う場合は、ユーザー数に応じた料金体系だと導入しやすいですね。無料トライアル期間があると、実際に試してから決められるので安心です。',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:13:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: '価格設定についても具体的なご意見ありがとうございます。競合製品と比較する際、最も重視するポイントは何ですか？',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:15:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '一番重視するのは使いやすさとデータの安全性です。どんなに機能が豊富でも、インターフェースが複雑だとチーム全体に浸透させるのが難しいので。また、企業の重要な情報を扱うので、セキュリティ面での信頼性も重要です。データのバックアップや暗号化、アクセス権限の細かい設定ができることも必須だと思います。',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:17:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'セキュリティと使いやすさのバランスが重要なんですね。最後に、新しいツールを導入する際の決定プロセスについて教えていただけますか？',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:19:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '通常は、まず私のようなエンジニアが技術的な評価を行い、その後チームリーダーと相談します。予算が大きい場合は経営層の承認も必要です。導入前には必ず小規模なチームでPoCを実施して、実際の業務で使えるかを検証します。他社の導入事例やレビューも参考にしますね。サポート体制も重要で、日本語でのサポートがあると安心です。',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:21:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: '詳細な導入プロセスについてお聞かせいただきありがとうございます。本日は貴重なご意見をいただき、ありがとうございました。いただいたフィードバックは製品開発に活かさせていただきます。',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:23:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: 'こちらこそ、ありがとうございました。新製品の開発、楽しみにしています！',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-01-14T10:24:00'))
      }
    ];
    
    // メッセージをバッチで保存
    const batch = db.batch();
    messages.forEach(message => {
      const messageRef = messagesRef.doc(message.messageId);
      batch.set(messageRef, message);
    });
    await batch.commit();
    
    console.log(`✅ ${messages.length}件のメッセージを作成しました`);
    
    // 4. サマリー情報を追加（オプション）
    const summaryRef = interviewRef.collection('summary').doc('analysis');
    await summaryRef.set({
      keyPoints: [
        '複数ツールの統合が課題',
        'AI による自動整理・提案機能への期待',
        '月額3,000-5,000円の価格帯',
        'セキュリティと使いやすさを重視',
        '段階的な導入プロセス'
      ],
      userNeeds: [
        '情報の一元管理',
        'AIによる業務効率化',
        'セキュアな環境',
        '直感的なUI',
        '日本語サポート'
      ],
      sentiment: 'positive',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ サマリー情報を作成しました');
    
    console.log('\n========================================');
    console.log('🎉 デモインタビューデータの作成が完了しました！');
    console.log('========================================');
    console.log(`\nFirestoreパス:`);
    console.log(`themes/${themeId}/interviews/${interviewId}`);
    console.log('\nこのインタビューは:');
    console.log('- interviewCollected: true (完了済み)');
    console.log('- reportCreated: false (レポート未生成)');
    console.log('\nレポート生成をテストできます！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// 環境変数チェック
if (!process.env.FIREBASE_ADMIN_PROJECT_ID || 
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
    !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  console.error('❌ Firebase Admin環境変数が設定されていません');
  console.error('必要な環境変数:');
  console.error('- FIREBASE_ADMIN_PROJECT_ID');
  console.error('- FIREBASE_ADMIN_CLIENT_EMAIL');
  console.error('- FIREBASE_ADMIN_PRIVATE_KEY');
  process.exit(1);
}

// スクリプト実行
createDemoInterview()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });