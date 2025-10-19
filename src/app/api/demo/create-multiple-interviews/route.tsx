import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

// 異なるペルソナのインタビューデータ
const interviewPersonas = [
  {
    id: '02bdc61b-c5fb-4cab-9446-6d3b7360f5d1',
    userInfo: {
      age: '20代',
      gender: '女性',
      occupation: 'UIデザイナー'
    },
    messages: [
      { sender: 'bot', text: 'こんにちは！本日は新製品開発に関するインタビューにご協力いただきありがとうございます。まず、普段どのような製品やサービスをよく利用されていますか？' },
      { sender: 'user', text: 'デザインツールとしてFigmaやAdobe Creative Cloudを毎日使っています。あとはPinterestやBehanceで情報収集をしています。' },
      { sender: 'bot', text: 'デザインツールをメインに使われているんですね。現在のワークフローで不便に感じることはありますか？' },
      { sender: 'user', text: 'デザインファイルのバージョン管理が大変です。クライアントとのフィードバックのやり取りも、メールやSlackに分散してしまって追跡が難しいんです。' },
      { sender: 'bot', text: 'なるほど、バージョン管理とフィードバック管理が課題なんですね。理想的にはどんな機能があると良いですか？' },
      { sender: 'user', text: 'デザインファイルに直接コメントできて、その履歴が全て残るような統合プラットフォームがあればいいですね。AIがデザインの改善提案をしてくれたりすると更に良いです。' },
      { sender: 'bot', text: '価格についてはどうお考えですか？' },
      { sender: 'user', text: 'フリーランスなので、月額2,000円以下だと嬉しいです。年間契約で割引があるとなお良いですね。' },
      { sender: 'bot', text: 'ありがとうございます。セキュリティ面で重視することはありますか？' },
      { sender: 'user', text: 'クライアントの機密情報を扱うので、アクセス権限の細かい設定は必須です。NDAに対応できるセキュリティレベルが欲しいです。' }
    ]
  },
  {
    id: '03cdc71c-d6fc-5dbc-a547-7e4c8471g6e2',
    userInfo: {
      age: '40代',
      gender: '男性',
      occupation: 'プロダクトマネージャー'
    },
    messages: [
      { sender: 'bot', text: 'こんにちは！新製品開発についてお聞かせください。普段使用されているツールは何ですか？' },
      { sender: 'user', text: 'JIRA、Confluence、Slackを中心に、Google WorkspaceとMiroも活用しています。' },
      { sender: 'bot', text: '多くのツールを使われていますね。統合したい部分はありますか？' },
      { sender: 'user', text: 'ロードマップ管理とKPI追跡が別々のツールになっているのが非効率です。経営層への報告資料作成に時間がかかりすぎています。' },
      { sender: 'bot', text: 'レポート作成の自動化などがあれば便利でしょうか？' },
      { sender: 'user', text: 'はい、ダッシュボードで常に最新の状況が見られて、必要に応じてエクスポートできる機能が欲しいです。予算との連動もできれば理想的です。' },
      { sender: 'bot', text: '予算はどの程度を想定されていますか？' },
      { sender: 'user', text: 'チーム全体で月額10万円程度なら承認を得やすいです。ROIが明確に示せることが重要です。' },
      { sender: 'bot', text: '導入の決定プロセスについて教えてください。' },
      { sender: 'user', text: '私が提案して、CTOと CFOの承認が必要です。3ヶ月のトライアル期間で効果測定をしてから本格導入を決めます。' },
      { sender: 'bot', text: '他に重要な要件はありますか？' },
      { sender: 'user', text: 'グローバルチームなので多言語対応は必須です。タイムゾーンを考慮した非同期コラボレーション機能も重要ですね。' }
    ]
  },
  {
    id: '04ddd82d-e7fd-6ecd-b658-8f5d9582h7f3',
    userInfo: {
      age: '30代',
      gender: '女性',
      occupation: 'マーケティングマネージャー'
    },
    messages: [
      { sender: 'bot', text: 'マーケティング業務での新製品へのニーズについてお聞かせください。' },
      { sender: 'user', text: 'HubSpot、Google Analytics、各種SNS管理ツールを使っていますが、データが分散していて統合的な分析が難しいです。' },
      { sender: 'bot', text: 'データ統合が課題なんですね。具体的にどんな分析をしたいですか？' },
      { sender: 'user', text: 'カスタマージャーニー全体を一つの画面で見たいです。どのチャネルがROIが高いか、リアルタイムで把握したいんです。' },
      { sender: 'bot', text: 'AIを活用した機能についてはどうお考えですか？' },
      { sender: 'user', text: 'キャンペーンの自動最適化や、次のアクションの提案をしてくれるAIがあれば素晴らしいです。競合分析も自動化したいですね。' },
      { sender: 'bot', text: '価格感についてはいかがですか？' },
      { sender: 'user', text: '成果に応じた料金体系だと説得しやすいです。基本料金＋成果報酬のような形が理想的です。' },
      { sender: 'bot', text: 'データのプライバシーについてはどうお考えですか？' },
      { sender: 'user', text: 'GDPRやCCPAに準拠していることは絶対条件です。顧客データの取り扱いには最大限の注意が必要です。' }
    ]
  },
  {
    id: '05eee93e-f8ge-7fde-c769-9g6ea693i8g4',
    userInfo: {
      age: '50代',
      gender: '男性',
      occupation: '経営者'
    },
    messages: [
      { sender: 'bot', text: '経営者の視点から、新しいビジネスツールへの期待をお聞かせください。' },
      { sender: 'user', text: '正直、ツールが多すぎて全体像が見えません。経営判断に必要な情報だけを簡潔に見たいです。' },
      { sender: 'bot', text: 'シンプルさが重要なんですね。具体的にはどんな情報ですか？' },
      { sender: 'user', text: '売上、コスト、利益率、顧客満足度、従業員エンゲージメント。これらのKPIが一目で分かるダッシュボードが欲しいです。' },
      { sender: 'bot', text: 'レポート機能についてはどうでしょうか？' },
      { sender: 'user', text: '取締役会用の資料が自動生成できれば最高です。グラフや予測も含めて、プレゼンテーション資料として使えるものが良いです。' },
      { sender: 'bot', text: '投資対効果についてはどうお考えですか？' },
      { sender: 'user', text: '初期投資は大きくても構いません。長期的に業務効率が30%以上改善するなら、年間1000万円でも投資する価値があります。' },
      { sender: 'bot', text: 'セキュリティや信頼性についてはいかがですか？' },
      { sender: 'user', text: '上場企業なので、監査に対応できるレベルのセキュリティとログ管理が必須です。SLAも99.9%以上を求めます。' }
    ]
  },
  {
    id: '06fff04f-g9hf-8gef-d87a-ah7fb7a4j9h5',
    userInfo: {
      age: '20代',
      gender: '男性',
      occupation: 'スタートアップ創業者'
    },
    messages: [
      { sender: 'bot', text: 'スタートアップでの製品開発ツールについてお聞かせください。' },
      { sender: 'user', text: '予算が限られているので、無料または安価なツールを組み合わせています。GitHub、Notion、Discordがメインです。' },
      { sender: 'bot', text: 'コスト重視なんですね。機能面での要望はありますか？' },
      { sender: 'user', text: 'スケールしても使い続けられることが重要です。最初は5人でも、100人になっても対応できる柔軟性が欲しいです。' },
      { sender: 'bot', text: 'スタートアップ特有のニーズはありますか？' },
      { sender: 'user', text: 'ピボットが簡単にできることです。プロジェクト構造を柔軟に変更できて、過去のデータも活用できることが大切です。' },
      { sender: 'bot', text: '価格モデルについてはどうお考えですか？' },
      { sender: 'user', text: 'フリーミアムモデルが理想的です。基本機能は無料で、成長に応じて機能を追加できる形が良いです。' },
      { sender: 'bot', text: '他のスタートアップとの連携についてはどうですか？' },
      { sender: 'user', text: 'エコシステムが重要です。他のツールとのAPI連携が充実していて、開発者コミュニティが活発だと嬉しいです。' }
    ]
  },
  {
    id: '07ggg15g-haig-9hfg-e98b-bi8gc8b5kah6',
    userInfo: {
      age: '30代',
      gender: '非公開',
      occupation: 'データサイエンティスト'
    },
    messages: [
      { sender: 'bot', text: 'データ分析の観点から、新製品への要望をお聞かせください。' },
      { sender: 'user', text: 'JupyterとGitHub、AWS、Tableau を使っていますが、実験管理とモデルのバージョン管理が煩雑です。' },
      { sender: 'bot', text: 'MLOps的な機能が必要ということですか？' },
      { sender: 'user', text: 'はい、モデルの学習、評価、デプロイまでを一元管理したいです。A/Bテストの結果も統合的に見たいです。' },
      { sender: 'bot', text: 'チーム協業についてはどうでしょうか？' },
      { sender: 'user', text: 'ビジネス側の人にも分かりやすく結果を共有できることが重要です。技術的な詳細を隠して、インサイトだけを伝えられる機能が欲しいです。' },
      { sender: 'bot', text: 'コンピューティングリソースについてはどうお考えですか？' },
      { sender: 'user', text: 'オンデマンドでGPUを使えて、使った分だけ課金される形が理想的です。年間予算は500万円程度です。' },
      { sender: 'bot', text: 'データのセキュリティについて重要な点は？' },
      { sender: 'user', text: '個人情報を扱うので、差分プライバシーや暗号化は必須です。監査ログも重要です。' }
    ]
  },
  {
    id: '08hhh26h-ibjh-aigh-f0ac-cj9hd9c6lbi7',
    userInfo: {
      age: '40代',
      gender: '女性',
      occupation: 'カスタマーサクセスマネージャー'
    },
    messages: [
      { sender: 'bot', text: 'カスタマーサクセスの観点から、製品への要望をお聞かせください。' },
      { sender: 'user', text: 'Salesforce、Zendesk、Intercomを使っていますが、顧客の全体像が見えにくいです。' },
      { sender: 'bot', text: '顧客データの統合が課題なんですね。' },
      { sender: 'user', text: 'はい、顧客の利用状況、サポート履歴、契約情報を一箇所で見て、プロアクティブにサポートしたいです。' },
      { sender: 'bot', text: '自動化についてはどうお考えですか？' },
      { sender: 'user', text: 'チャーンリスクの自動検知と、推奨アクションの提示があると助かります。顧客への自動メール配信も欲しいです。' },
      { sender: 'bot', text: '価格についてはどうでしょうか？' },
      { sender: 'user', text: '顧客数ベースの課金だと予算管理しやすいです。月額5万円〜10万円の範囲が妥当だと思います。' },
      { sender: 'bot', text: '顧客とのコミュニケーションで重視することは？' },
      { sender: 'user', text: 'パーソナライゼーションです。各顧客に合わせたコミュニケーションができる機能が必要です。' }
    ]
  },
  {
    id: '09iii37i-jckj-bjhi-g1bd-dkaie0d7mcj8',
    userInfo: {
      age: '30代',
      gender: '男性',
      occupation: 'DevOpsエンジニア'
    },
    messages: [
      { sender: 'bot', text: 'インフラ管理の観点から、新製品への要望をお聞かせください。' },
      { sender: 'user', text: 'Kubernetes、Terraform、Prometheus、Grafanaなど、ツールが多すぎて管理が大変です。' },
      { sender: 'bot', text: '統合的な管理プラットフォームが必要ということですか？' },
      { sender: 'user', text: 'はい、インフラのコード化から監視、アラート、自動復旧まで一元管理したいです。' },
      { sender: 'bot', text: 'コスト最適化についてはどうでしょうか？' },
      { sender: 'user', text: 'クラウドコストの可視化と最適化提案は必須です。無駄なリソースを自動で検出して削減したいです。' },
      { sender: 'bot', text: 'セキュリティについて重要な点は？' },
      { sender: 'user', text: 'ゼロトラストアーキテクチャに対応していることと、コンプライアンスチェックの自動化が重要です。' },
      { sender: 'bot', text: '価格モデルの希望は？' },
      { sender: 'user', text: 'ノードベースかリソース使用量ベースの課金が分かりやすいです。月額20万円程度なら承認を得やすいです。' }
    ]
  },
  {
    id: '10jjj48j-kdlk-ckij-h2ce-elbj1e8ndka9',
    userInfo: {
      age: '20代',
      gender: '女性',
      occupation: 'コンテンツクリエイター'
    },
    messages: [
      { sender: 'bot', text: 'コンテンツ制作における新製品への要望をお聞かせください。' },
      { sender: 'user', text: 'YouTube、Instagram、TikTok、ブログ、全てのプラットフォームを別々に管理するのが大変です。' },
      { sender: 'bot', text: '一元管理ツールが必要なんですね。' },
      { sender: 'user', text: 'はい、投稿スケジュール、アナリティクス、収益管理を一つのダッシュボードで見たいです。' },
      { sender: 'bot', text: 'AI機能についてはどうお考えですか？' },
      { sender: 'user', text: 'トレンド予測やコンテンツアイデアの提案、最適な投稿時間の分析をAIがしてくれると嬉しいです。' },
      { sender: 'bot', text: '編集機能についてはどうでしょうか？' },
      { sender: 'user', text: '簡単な編集はツール内でできると便利です。サムネイル作成やキャプション生成もあると良いですね。' },
      { sender: 'bot', text: '価格についてはどうお考えですか？' },
      { sender: 'user', text: '個人なので月額1,000円〜3,000円が限界です。収益が増えたらアップグレードできる仕組みが良いです。' },
      { sender: 'bot', text: 'コラボレーション機能は必要ですか？' },
      { sender: 'user', text: 'はい、編集者やカメラマンとのファイル共有と承認ワークフローがあると助かります。' }
    ]
  }
];

/**
 * 複数のデモインタビューを作成
 * GET /api/demo/create-multiple-interviews
 */
export async function GET(request: NextRequest) {
  const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
  
  logger.info('複数のデモインタビューデータ作成開始', { themeId, count: interviewPersonas.length });
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  try {
    // テーマドキュメントを確認/作成
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
    
    // 各ペルソナのインタビューを作成
    for (const persona of interviewPersonas) {
      try {
        const interviewRef = adminDb.doc(`themes/${themeId}/interviews/${persona.id}`);
        
        // インタビュードキュメントを作成
        await interviewRef.set({
          interviewId: persona.id,
          startTime: Timestamp.fromDate(new Date('2025-01-14T10:00:00')),
          endTime: Timestamp.fromDate(new Date('2025-01-14T10:30:00')),
          duration: 1800,
          interviewCollected: true,
          reportCreated: false,
          temporaryId: null,
          confirmedUserId: `user-${persona.id.substring(0, 8)}`,
          userInfo: persona.userInfo,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        
        // メッセージを作成
        const messagesRef = interviewRef.collection('messages');
        const batch = adminDb.batch();
        
        persona.messages.forEach((message, index) => {
          const messageId = uuidv4();
          const messageRef = messagesRef.doc(messageId);
          const timestamp = new Date('2025-01-14T10:00:00');
          timestamp.setMinutes(timestamp.getMinutes() + index * 2);
          
          batch.set(messageRef, {
            messageId: messageId,
            type: 'interview',
            sender: message.sender,
            text: message.text,
            createdAt: Timestamp.fromDate(timestamp)
          });
        });
        
        await batch.commit();
        
        results.push({
          id: persona.id,
          userInfo: persona.userInfo,
          messageCount: persona.messages.length,
          status: 'success'
        });
        
        successCount++;
        logger.info(`インタビュー作成成功: ${persona.id}`, { userInfo: persona.userInfo });
        
      } catch (error) {
        errorCount++;
        results.push({
          id: persona.id,
          userInfo: persona.userInfo,
          status: 'error',
          error: (error as Error).message
        });
        logger.error(`インタビュー作成エラー: ${persona.id}`, error as Error);
      }
    }
    
    logger.info('複数インタビューデータ作成完了', { 
      total: interviewPersonas.length,
      success: successCount,
      error: errorCount
    });
    
    return NextResponse.json({
      success: true,
      message: `${successCount}個のインタビューデータを作成しました`,
      summary: {
        total: interviewPersonas.length,
        success: successCount,
        error: errorCount
      },
      results: results,
      themeInfo: {
        themeId: themeId,
        theme: '新製品開発のためのユーザーインタビュー',
        path: `themes/${themeId}`
      }
    });
    
  } catch (error) {
    logger.error('複数インタビューデータ作成エラー', error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'インタビューデータの作成に失敗しました',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * 作成されたインタビューのレポートを一括生成
 * POST /api/demo/create-multiple-interviews
 */
export async function POST(request: NextRequest) {
  const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
  
  try {
    const { generateReports = false } = await request.json();
    
    if (!generateReports) {
      return NextResponse.json({
        success: true,
        message: 'レポート生成をスキップしました'
      });
    }
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // 各インタビューのレポートを生成
    for (const persona of interviewPersonas) {
      try {
        const reportResponse = await fetch(`${request.nextUrl.origin}/api/report/individualReport`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: '新製品開発のためのユーザーインタビュー',
            interviewRefPath: `themes/${themeId}/interviews/${persona.id}`,
            forceRegenerate: false,
            useGPT4: false
          }),
        });
        
        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          results.push({
            interviewId: persona.id,
            reportId: reportData.reportId,
            status: 'success'
          });
          successCount++;
        } else {
          const error = await reportResponse.text();
          results.push({
            interviewId: persona.id,
            status: 'error',
            error: error
          });
          errorCount++;
        }
        
        // APIレート制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          interviewId: persona.id,
          status: 'error',
          error: (error as Error).message
        });
        errorCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${successCount}個のレポートを生成しました`,
      summary: {
        total: interviewPersonas.length,
        success: successCount,
        error: errorCount
      },
      results: results
    });
    
  } catch (error) {
    logger.error('レポート一括生成エラー', error as Error);
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