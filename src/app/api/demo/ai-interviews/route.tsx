import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// 60人分の多様なペルソナ（AIの使用に関するインタビュー）
const aiPersonas = [
  // IT・テクノロジー系 (20人)
  { age: '20代', gender: '男性', occupation: 'ソフトウェアエンジニア' },
  { age: '30代', gender: '女性', occupation: 'データサイエンティスト' },
  { age: '40代', gender: '男性', occupation: 'CTOテクノロジー責任者' },
  { age: '30代', gender: '男性', occupation: 'AIエンジニア' },
  { age: '20代', gender: '女性', occupation: 'フロントエンドエンジニア' },
  { age: '30代', gender: '男性', occupation: 'DevOpsエンジニア' },
  { age: '40代', gender: '女性', occupation: 'プロダクトマネージャー' },
  { age: '30代', gender: '男性', occupation: 'システムアーキテクト' },
  { age: '20代', gender: '女性', occupation: 'UXデザイナー' },
  { age: '30代', gender: '男性', occupation: 'セキュリティエンジニア' },
  { age: '40代', gender: '男性', occupation: 'ITコンサルタント' },
  { age: '30代', gender: '女性', occupation: 'QAエンジニア' },
  { age: '20代', gender: '男性', occupation: 'モバイルアプリ開発者' },
  { age: '30代', gender: '女性', occupation: 'データベース管理者' },
  { age: '40代', gender: '男性', occupation: 'クラウドアーキテクト' },
  { age: '30代', gender: '女性', occupation: 'MLエンジニア' },
  { age: '20代', gender: '男性', occupation: 'ゲーム開発者' },
  { age: '30代', gender: '女性', occupation: 'テクニカルライター' },
  { age: '40代', gender: '男性', occupation: 'インフラエンジニア' },
  { age: '30代', gender: '女性', occupation: 'プロジェクトマネージャー' },

  // ビジネス・経営系 (15人)
  { age: '50代', gender: '男性', occupation: '会社経営者' },
  { age: '40代', gender: '女性', occupation: '経営コンサルタント' },
  { age: '30代', gender: '男性', occupation: 'スタートアップ創業者' },
  { age: '40代', gender: '男性', occupation: '事業部長' },
  { age: '30代', gender: '女性', occupation: 'マーケティングマネージャー' },
  { age: '50代', gender: '男性', occupation: '投資家' },
  { age: '40代', gender: '女性', occupation: '人事部長' },
  { age: '30代', gender: '男性', occupation: '営業マネージャー' },
  { age: '40代', gender: '女性', occupation: '財務責任者' },
  { age: '30代', gender: '男性', occupation: 'ビジネスアナリスト' },
  { age: '40代', gender: '女性', occupation: '広報責任者' },
  { age: '50代', gender: '男性', occupation: '取締役' },
  { age: '30代', gender: '女性', occupation: 'カスタマーサクセス' },
  { age: '40代', gender: '男性', occupation: '戦略企画' },
  { age: '30代', gender: '女性', occupation: '新規事業開発' },

  // クリエイティブ系 (10人)
  { age: '20代', gender: '女性', occupation: 'グラフィックデザイナー' },
  { age: '30代', gender: '男性', occupation: '動画クリエイター' },
  { age: '40代', gender: '女性', occupation: 'コピーライター' },
  { age: '30代', gender: '男性', occupation: '写真家' },
  { age: '20代', gender: '女性', occupation: 'イラストレーター' },
  { age: '30代', gender: '男性', occupation: '音楽プロデューサー' },
  { age: '40代', gender: '女性', occupation: 'アートディレクター' },
  { age: '30代', gender: '男性', occupation: '3Dモデラー' },
  { age: '20代', gender: '女性', occupation: 'アニメーター' },
  { age: '30代', gender: '男性', occupation: 'ゲームデザイナー' },

  // 教育・研究系 (5人)
  { age: '40代', gender: '男性', occupation: '大学教授' },
  { age: '30代', gender: '女性', occupation: '研究員' },
  { age: '50代', gender: '男性', occupation: '高校教師' },
  { age: '30代', gender: '女性', occupation: '教育コンサルタント' },
  { age: '40代', gender: '男性', occupation: 'EdTech起業家' },

  // 医療・ヘルスケア系 (5人)
  { age: '40代', gender: '女性', occupation: '医師' },
  { age: '30代', gender: '男性', occupation: '薬剤師' },
  { age: '50代', gender: '女性', occupation: '看護師' },
  { age: '30代', gender: '男性', occupation: '医療データアナリスト' },
  { age: '40代', gender: '女性', occupation: 'ヘルスケアコンサルタント' },

  // その他の職業 (5人)
  { age: '30代', gender: '男性', occupation: '弁護士' },
  { age: '40代', gender: '女性', occupation: '会計士' },
  { age: '20代', gender: '男性', occupation: 'ライター・ジャーナリスト' },
  { age: '30代', gender: '女性', occupation: '翻訳家' },
  { age: '50代', gender: '男性', occupation: '不動産業' }
];

// AIの使用に関するインタビュー内容生成関数
function generateAIInterview(persona: typeof aiPersonas[0], index: number) {
  const interviewId = uuidv4();
  const messages = [];
  
  // システムメッセージ - 導入
  messages.push({
    messageId: uuidv4(),
    text: `こんにちは。本日はAIの使用についてのインタビューにご協力いただき、ありがとうございます。
${persona.age}の${persona.gender}で、${persona.occupation}をされているということですね。
まず、現在お仕事や日常生活でAIツールを使用されていますか？どのようなツールを使っていますか？`,
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // 使用しているAIツールについて
  const aiTools = [
    'ChatGPT、GitHub Copilot、DeepLを日常的に使っています',
    'Midjourney、DALL-E、Stable Diffusionなどの画像生成AIを活用しています',
    'Notion AI、Grammarly、Jasper AIを文書作成に使用しています',
    'Google Bard、Claude、Perplexity AIを情報収集に活用しています',
    'Adobe Firefly、Canva AI、Runway MLをクリエイティブ制作に使っています',
    'Tableau AI、Power BI、DataRobotをデータ分析に利用しています',
    'Salesforce Einstein、HubSpot AI、Monday.comを業務効率化に使っています',
    'まだ本格的には使っていませんが、ChatGPTを試験的に使い始めています'
  ];
  
  messages.push({
    messageId: uuidv4(),
    text: `${aiTools[index % aiTools.length]}。
特に${persona.occupation}としての業務では、${index % 2 === 0 ? 'コード生成や問題解決' : 'アイデア創出や文書作成'}に活用することが多いです。
AIツールによって作業効率が${20 + (index % 4) * 10}%程度向上したと感じています。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // AIの利点について
  messages.push({
    messageId: uuidv4(),
    text: 'AIツールを使用して感じる最大のメリットは何でしょうか？また、どのような場面で特に有効だと感じますか？',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  const benefits = [
    '繰り返し作業の自動化と、創造的な作業への時間の再配分',
    '24時間365日利用可能で、即座にフィードバックが得られること',
    '多言語対応と、グローバルなコミュニケーションの円滑化',
    '大量のデータから洞察を得る能力と、意思決定の高速化',
    'アイデア出しのブレインストーミングパートナーとしての役割',
    '専門知識へのアクセスの民主化と、学習の加速',
    'ヒューマンエラーの削減と、品質の一貫性の向上',
    'コスト削減と、リソースの最適化'
  ];

  messages.push({
    messageId: uuidv4(),
    text: `最大のメリットは${benefits[index % benefits.length]}だと思います。
例えば、${persona.occupation}の立場では、${index % 2 === 0 ? 'プロトタイプの迅速な作成' : 'レポート作成の効率化'}において特に有効です。
また、${index % 3 === 0 ? '新しいアイデアの発想' : index % 3 === 1 ? 'エラーチェック' : 'データ分析'}でも大きな価値を感じています。
月額${5000 + (index * 1000)}円程度までなら投資する価値があると考えています。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // 課題や懸念について
  messages.push({
    messageId: uuidv4(),
    text: 'AIツールを使用する上での課題や懸念事項はありますか？',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  const concerns = [
    '情報の正確性と信頼性の確保、ハルシネーションのリスク',
    'データプライバシーとセキュリティ、機密情報の取り扱い',
    'AIへの過度な依存と、人間のスキル低下の懸念',
    '倫理的な問題と、バイアスの存在',
    '著作権と知的財産権の曖昧さ',
    '雇用への影響と、仕事の自動化による不安',
    'AIの判断プロセスの不透明性（ブラックボックス問題）',
    'コストと投資対効果の不確実性'
  ];

  messages.push({
    messageId: uuidv4(),
    text: `主な懸念は${concerns[index % concerns.length]}です。
実際に、${index % 2 === 0 ? '重要な意思決定では必ず人間による検証を行う' : '機密データは入力しないよう徹底している'}ようにしています。
また、${index % 3 === 0 ? 'AIの出力を鵜呑みにせず、批判的思考を維持する' : index % 3 === 1 ? 'チーム内でAI利用のガイドラインを策定' : '定期的にAIなしでの作業も行う'}ことも心がけています。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // 将来への期待
  messages.push({
    messageId: uuidv4(),
    text: '今後、AIツールにどのような機能や改善を期待しますか？',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  const expectations = [
    'より高度な文脈理解と、長期記憶の実装',
    'マルチモーダル対応の強化（音声、画像、動画の統合処理）',
    'リアルタイムコラボレーション機能の充実',
    'カスタマイズ性の向上と、業界特化型AIの発展',
    'エクスプレイナブルAI（説明可能なAI）の実現',
    'オフライン動作と、エッジコンピューティング対応',
    'より自然な対話インターフェースと、感情理解',
    'APIの標準化と、ツール間の相互運用性向上'
  ];

  messages.push({
    messageId: uuidv4(),
    text: `特に期待しているのは${expectations[index % expectations.length]}です。
${persona.occupation}の観点から、${index % 2 === 0 ? 'より専門的なドメイン知識を持つAI' : 'チーム全体で共有できるAIアシスタント'}が実現すれば、
業務効率がさらに向上すると考えています。
また、${index % 3 === 0 ? 'AI同士が連携して複雑なタスクを解決' : index % 3 === 1 ? 'より直感的なUIとUX' : '学習データの透明性向上'}も重要だと思います。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // AIと人間の協働について
  messages.push({
    messageId: uuidv4(),
    text: 'AIと人間がうまく協働するために、どのようなアプローチが重要だと思いますか？',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  messages.push({
    messageId: uuidv4(),
    text: `AIと人間の協働には、明確な役割分担が重要だと考えています。
AIは${index % 2 === 0 ? 'データ処理と pattern認識' : '定型作業と初期案の生成'}を担当し、
人間は${index % 2 === 0 ? '創造性と倫理的判断' : '最終決定と品質保証'}を担うべきです。
また、${index % 3 === 0 ? 'AIリテラシー教育の充実' : index % 3 === 1 ? '継続的なスキルアップデート' : '組織文化の変革'}も不可欠です。
最終的には、AIを「置き換え」ではなく「増強」のツールとして捉えることが大切だと思います。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // 具体的な成功事例
  messages.push({
    messageId: uuidv4(),
    text: 'AIを活用して成功した具体的な事例があれば教えてください。',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  const successCases = [
    'プレゼン資料の作成時間を8時間から2時間に短縮',
    'コードレビューの品質向上とバグの早期発見',
    '顧客分析レポートの精度が30%向上',
    '多言語対応により海外市場への展開が加速',
    'コンテンツ制作の生産性が3倍に向上',
    'カスタマーサポートの応答時間を50%削減',
    '新製品のアイデア創出プロセスが効率化',
    'データ入力ミスが90%減少'
  ];

  messages.push({
    messageId: uuidv4(),
    text: `最近の成功事例として、${successCases[index % successCases.length]}した経験があります。
具体的には、${index % 2 === 0 ? 'ChatGPTを使って初期案を作成し、それをベースに改良' : 'AIツールで自動化し、人間は最終チェックのみ'}という方法を取りました。
この結果、${index % 3 === 0 ? 'チーム全体の生産性が向上' : index % 3 === 1 ? 'クライアントの満足度が上昇' : 'コスト削減を実現'}しました。
ROIとしては、導入コストの${3 + (index % 3)}倍のリターンがありました。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // 倫理的な配慮
  messages.push({
    messageId: uuidv4(),
    text: 'AI使用における倫理的な配慮について、どのような点を重視していますか？',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  messages.push({
    messageId: uuidv4(),
    text: `倫理的な配慮として、${index % 2 === 0 ? 'AIの判断に頼りすぎない' : '人間の尊厳を損なわない使い方'}を心がけています。
特に${persona.occupation}として、${index % 3 === 0 ? '偏見やバイアスの排除' : index % 3 === 1 ? '透明性の確保' : 'プライバシーの保護'}に注意を払っています。
また、AIが生成したコンテンツは必ず${index % 2 === 0 ? '出典を明記' : '人間によるレビュー'}を行い、
${index % 2 === 0 ? '著作権侵害のリスク' : '誤情報の拡散'}を防ぐようにしています。
組織としても、AI倫理ガイドラインの策定が急務だと感じています。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  // 締めくくり
  messages.push({
    messageId: uuidv4(),
    text: '最後に、AIの発展が社会にもたらす影響について、どのようにお考えですか？',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  messages.push({
    messageId: uuidv4(),
    text: `AIは社会に革命的な変化をもたらすと考えています。
ポジティブな面では、${index % 2 === 0 ? '生産性の飛躍的向上と新たなイノベーション' : '教育や医療へのアクセス改善'}が期待できます。
一方で、${index % 2 === 0 ? '雇用構造の変化' : 'デジタルデバイドの拡大'}という課題もあります。
重要なのは、技術の発展と並行して、${index % 3 === 0 ? '社会制度の整備' : index % 3 === 1 ? '教育システムの改革' : '倫理的フレームワークの構築'}を進めることです。
AIと共存する未来において、人間らしさや創造性がより重要になると信じています。`,
    sender: 'user',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  messages.push({
    messageId: uuidv4(),
    text: '貴重なご意見をありがとうございました。AIの使用に関する深い洞察をいただき、大変参考になりました。',
    sender: 'bot',
    type: 'interview',
    createdAt: FieldValue.serverTimestamp()
  });

  return {
    interviewId,
    messages,
    userInfo: persona,
    interviewDuration: 20 + Math.floor(Math.random() * 15)
  };
}

// DELETE: 既存のインタビューを削除
export async function DELETE(req: NextRequest) {
  try {
    const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';
    const themeRef = adminDb.doc(`themes/${themeId}`);
    const interviewsRef = themeRef.collection('interviews');
    
    // すべてのインタビューを取得
    const snapshot = await interviewsRef.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        message: '削除するインタビューがありません',
        deletedCount: 0
      });
    }

    // バッチ削除
    const batch = adminDb.batch();
    let deletedCount = 0;
    
    for (const doc of snapshot.docs) {
      // メッセージサブコレクションも削除
      const messagesRef = doc.ref.collection('messages');
      const messagesSnapshot = await messagesRef.get();
      
      messagesSnapshot.docs.forEach(msgDoc => {
        batch.delete(msgDoc.ref);
      });
      
      // 個別レポートも削除
      const reportRef = doc.ref.collection('individualReport');
      const reportSnapshot = await reportRef.get();
      
      reportSnapshot.docs.forEach(reportDoc => {
        batch.delete(reportDoc.ref);
      });
      
      batch.delete(doc.ref);
      deletedCount++;
    }
    
    await batch.commit();
    
    // テーマの統計をリセット
    await themeRef.update({
      collectInterviewsCount: 0,
      lastInterviewDate: null
    });
    
    // サマリーレポートも削除
    const summaryRef = themeRef.collection('summaryReport');
    const summarySnapshot = await summaryRef.get();
    
    const summaryBatch = adminDb.batch();
    summarySnapshot.docs.forEach(doc => {
      summaryBatch.delete(doc.ref);
    });
    await summaryBatch.commit();
    
    return NextResponse.json({
      success: true,
      message: `${deletedCount}件のインタビューデータを削除しました`,
      deletedCount
    });
    
  } catch (error) {
    console.error('Error deleting interviews:', error);
    return NextResponse.json({ 
      error: 'インタビューデータの削除に失敗しました',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// POST: 新規インタビューを作成
export async function POST(req: NextRequest) {
  try {
    const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';
    const baseInterviewId = 'ccbf1181-c9b2-4689-8578-da89fd58d177';
    
    // テーマの存在確認
    const themeRef = adminDb.doc(`themes/${themeId}`);
    const themeDoc = await themeRef.get();
    
    if (!themeDoc.exists) {
      // テーマを作成
      await themeRef.set({
        themeId,
        theme: 'AIの使用',
        createUserId: 'demo_user',
        createdAt: FieldValue.serverTimestamp(),
        deadline: Timestamp.fromDate(new Date('2024-12-31')),
        clientId: 'demo_client',
        interviewsRequestedCount: 60,
        collectInterviewsCount: 0,
        interviewDurationMin: 20,
        isPublic: true,
        maximumNumberOfInterviews: 100,
        reportCreated: false
      });
    }

    const results = [];
    
    // 60件のインタビューを生成
    for (let i = 0; i < 60; i++) {
      const persona = aiPersonas[i];
      const interviewData = generateAIInterview(persona, i);
      
      // 新しいインタビューIDを生成（最初の1件は指定のIDを使用）
      const interviewId = i === 0 ? baseInterviewId : uuidv4();
      
      // インタビュードキュメントを作成
      const interviewRef = themeRef.collection('interviews').doc(interviewId);
      
      await interviewRef.set({
        interviewId,
        intervieweeId: `ai_user_${uuidv4().substring(0, 8)}`,
        answerInterviewId: uuidv4(),
        createdAt: FieldValue.serverTimestamp(),
        questionCount: interviewData.messages.filter((m: any) => m.sender !== 'user').length,
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
      const messageBatch = adminDb.batch();
      
      for (const message of interviewData.messages) {
        const messageRef = messagesRef.doc(message.messageId);
        messageBatch.set(messageRef, message);
      }
      
      await messageBatch.commit();

      results.push({
        interviewId,
        persona: interviewData.userInfo,
        messageCount: interviewData.messages.length
      });
      
      console.log(`Created interview ${i + 1}/60: ${persona.occupation}`);
    }

    // テーマの統計を更新
    await themeRef.update({
      collectInterviewsCount: 60,
      lastInterviewDate: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: '60件のAI使用に関するインタビューデータを生成しました',
      themeId,
      results,
      totalInterviews: 60
    });

  } catch (error) {
    console.error('Error creating AI interview data:', error);
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
      themeName: 'AIの使用',
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