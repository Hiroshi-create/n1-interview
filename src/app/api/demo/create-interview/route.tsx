import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

/**
 * デモインタビューデータを作成するAPI
 * GET /api/demo/create-interview
 */
export async function GET(request: NextRequest) {
  const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
  const interviewId = '01adc61b-b4fb-4bab-8446-5c2a6250f4d0';
  
  logger.info('デモインタビューデータ作成開始', { themeId, interviewId });
  
  try {
    // 1. テーマドキュメントを作成/更新
    const themeRef = adminDb.doc(`themes/${themeId}`);
    await themeRef.set({
      themeId: themeId,
      theme: '新製品開発のためのユーザーインタビュー',
      deadline: Timestamp.fromDate(new Date('2025-12-31')),
      isPublic: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      organizationId: 'demo-org-001',
      description: 'ユーザーのニーズと製品に対する期待を理解するためのインタビュー'
    }, { merge: true });
    
    // 2. インタビュードキュメントを作成
    const interviewRef = adminDb.doc(`themes/${themeId}/interviews/${interviewId}`);
    await interviewRef.set({
      interviewId: interviewId,
      startTime: Timestamp.fromDate(new Date('2025-01-14T10:00:00')),
      endTime: Timestamp.fromDate(new Date('2025-01-14T10:30:00')),
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // 3. メッセージコレクションにインタビュー内容を追加
    const messagesRef = interviewRef.collection('messages');
    
    const messages = [
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'こんにちは！本日は新製品開発に関するインタビューにご協力いただきありがとうございます。まず、普段どのような製品やサービスをよく利用されていますか？',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:00:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '主にプロジェクト管理ツールやコミュニケーションツールを使っています。SlackやNotionを日常的に使用していて、チームでの情報共有に役立てています。',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:02:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'なるほど、チームコラボレーションツールをよく使われているんですね。現在使用しているツールで、何か不便に感じることはありますか？',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:03:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: 'はい、いくつかあります。まず、複数のツールを行き来する必要があることが面倒です。また、情報が分散してしまって、必要な情報を見つけるのに時間がかかることがあります。特にドキュメントとタスク管理が別々のツールになっていると、関連性が見えにくいです。',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:05:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: '情報の統合が課題なんですね。理想的には、どのような機能があると便利だと思いますか？',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:07:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '理想的には、プロジェクトに関するすべての情報が一箇所で管理できて、AIが関連する情報を自動的に整理・提案してくれるような機能があると便利です。例えば、タスクを作成したら関連するドキュメントを自動的にリンクしてくれたり、過去の似たようなプロジェクトの知見を提示してくれたりすると助かります。',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:09:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'AI による情報の自動整理と提案機能ですね。そのような製品があった場合、価格についてはどのように考えますか？',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:11:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '機能が充実していて、実際に業務効率が向上するのであれば、月額3,000円から5,000円程度なら検討すると思います。チーム全体で使う場合は、ユーザー数に応じた料金体系だと導入しやすいですね。無料トライアル期間があると、実際に試してから決められるので安心です。',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:13:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: '価格設定についても具体的なご意見ありがとうございます。競合製品と比較する際、最も重視するポイントは何ですか？',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:15:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '一番重視するのは使いやすさとデータの安全性です。どんなに機能が豊富でも、インターフェースが複雑だとチーム全体に浸透させるのが難しいので。また、企業の重要な情報を扱うので、セキュリティ面での信頼性も重要です。データのバックアップや暗号化、アクセス権限の細かい設定ができることも必須だと思います。',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:17:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: 'セキュリティと使いやすさのバランスが重要なんですね。最後に、新しいツールを導入する際の決定プロセスについて教えていただけますか？',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:19:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: '通常は、まず私のようなエンジニアが技術的な評価を行い、その後チームリーダーと相談します。予算が大きい場合は経営層の承認も必要です。導入前には必ず小規模なチームでPoCを実施して、実際の業務で使えるかを検証します。他社の導入事例やレビューも参考にしますね。サポート体制も重要で、日本語でのサポートがあると安心です。',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:21:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'bot',
        text: '詳細な導入プロセスについてお聞かせいただきありがとうございます。本日は貴重なご意見をいただき、ありがとうございました。いただいたフィードバックは製品開発に活かさせていただきます。',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:23:00'))
      },
      {
        messageId: uuidv4(),
        type: 'interview',
        sender: 'user',
        text: 'こちらこそ、ありがとうございました。新製品の開発、楽しみにしています！',
        createdAt: Timestamp.fromDate(new Date('2025-01-14T10:24:00'))
      }
    ];
    
    // メッセージをバッチで保存
    const batch = adminDb.batch();
    messages.forEach(message => {
      const messageRef = messagesRef.doc(message.messageId);
      batch.set(messageRef, message);
    });
    await batch.commit();
    
    logger.info(`${messages.length}件のメッセージを作成しました`);
    
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
      createdAt: FieldValue.serverTimestamp()
    });
    
    logger.info('デモインタビューデータの作成が完了しました', {
      themeId,
      interviewId,
      messageCount: messages.length
    });
    
    return NextResponse.json({
      success: true,
      message: 'デモインタビューデータを作成しました',
      data: {
        themeId,
        interviewId,
        path: `themes/${themeId}/interviews/${interviewId}`,
        status: {
          interviewCollected: true,
          reportCreated: false
        },
        messageCount: messages.length,
        summary: '新製品開発に関するユーザーインタビュー（30分）'
      }
    });
    
  } catch (error) {
    logger.error('デモインタビューデータ作成エラー', error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'デモデータの作成に失敗しました',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * デモインタビューのレポートを生成
 * POST /api/demo/create-interview
 */
export async function POST(request: NextRequest) {
  const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
  const interviewId = '01adc61b-b4fb-4bab-8446-5c2a6250f4d0';
  
  try {
    const { generateReport = false } = await request.json();
    
    if (generateReport) {
      // レポート生成APIを呼び出し
      const reportResponse = await fetch(`${request.nextUrl.origin}/api/report/individualReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: '新製品開発のためのユーザーインタビュー',
          interviewRefPath: `themes/${themeId}/interviews/${interviewId}`,
          forceRegenerate: true,
          useGPT4: false
        }),
      });
      
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        return NextResponse.json({
          success: true,
          message: 'レポートを生成しました',
          reportId: reportData.reportId,
          reportGenerated: true
        });
      } else {
        const error = await reportResponse.text();
        throw new Error(`レポート生成失敗: ${error}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'レポート生成をスキップしました',
      reportGenerated: false
    });
    
  } catch (error) {
    logger.error('レポート生成エラー', error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'レポート生成に失敗しました',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}