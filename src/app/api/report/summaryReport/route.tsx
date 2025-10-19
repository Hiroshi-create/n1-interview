import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { generateRobustSummary } from '@/lib/report/summary-generator';
import { generateEnhancedSummary } from '@/lib/report/enhanced-summary-generator';
import { generateSimpleEnhancedSummary } from '@/lib/report/simple-enhanced-summary';

// OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface RequestBody {
  themeId: string;
  themeName: string;
  forceRegenerate?: boolean;
  useGPT4?: boolean;
}

interface FeatureGroup {
  title: string;
  priority: number;
  details: string;
  mentionCount: number;
  personas: string[];
  quotes: string[];
}

/**
 * サマリーレポートを生成
 * POST /api/report/summaryReport
 */
export async function POST(req: NextRequest) {
  try {
    const { themeId, themeName, forceRegenerate = false, useGPT4 = false }: RequestBody = await req.json();
    
    if (!themeId || !themeName) {
      return NextResponse.json({ 
        error: 'テーマIDとテーマ名が必要です' 
      }, { status: 400 });
    }

    logger.info('summaryReport API: リクエスト受信', {
      themeId,
      themeName,
      forceRegenerate,
      useGPT4
    });

    // 既存のサマリーレポートをチェック
    const themeRef = adminDb.doc(`themes/${themeId}`);
    const summaryReportRef = themeRef.collection('summaryReport');
    const existingReports = await summaryReportRef.get();
    
    if (!existingReports.empty && !forceRegenerate) {
      const existingReport = existingReports.docs[0].data();
      logger.info('summaryReport API: 既存レポート返却', { themeId });
      return NextResponse.json({
        report: existingReport.report,
        reportId: existingReport.summaryReportId,
        features: existingReport.features,
        cached: true
      });
    }

    // すべてのインタビューの個別レポートを取得
    const interviewsRef = themeRef.collection('interviews');
    const interviewsSnapshot = await interviewsRef.get();
    
    if (interviewsSnapshot.empty) {
      return NextResponse.json({ 
        error: 'インタビューが見つかりません' 
      }, { status: 404 });
    }

    // 個別レポートとユーザー情報を収集
    const individualReports: { report: string; userInfo: any; interviewId: string }[] = [];
    
    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewData = interviewDoc.data();
      const reportRef = interviewDoc.ref.collection('individualReport');
      const reportSnapshot = await reportRef.get();
      
      if (!reportSnapshot.empty) {
        const reportData = reportSnapshot.docs[0].data();
        individualReports.push({
          report: reportData.report,
          userInfo: interviewData.userInfo || {},
          interviewId: interviewDoc.id
        });
      }
    }

    if (individualReports.length < 3) {
      return NextResponse.json({ 
        error: `サマリー生成には最低3件のレポートが必要です（現在: ${individualReports.length}件）` 
      }, { status: 400 });
    }

    logger.info('summaryReport API: レポート収集完了', {
      themeId,
      reportCount: individualReports.length
    });

    // ペルソナ情報の集計
    const personaMap = new Map<string, number>();
    individualReports.forEach(r => {
      const occupation = r.userInfo.occupation || '不明';
      personaMap.set(occupation, (personaMap.get(occupation) || 0) + 1);
    });

    // 全てのケースで高品質版サマリー生成を使用
    let summaryResult;
    
    // 3件以上のレポートがある場合は高品質版を使用
    if (individualReports.length >= 3) {
      logger.info('summaryReport API: 高品質サマリー生成を使用', {
        reportCount: individualReports.length
      });
      
      // 高品質版を全てのケースで使用
      summaryResult = await generateSimpleEnhancedSummary(
        themeName,
        individualReports,
        {
          useGPT4
        }
      );
    } else {
      // 3件未満の場合のみ既存の堅牢版を使用（エラー回避のため）
      logger.info('summaryReport API: 少数レポートのため堅牢版を使用', {
        reportCount: individualReports.length
      });
      
      summaryResult = await generateRobustSummary(
        themeName,
        individualReports,
        {
          useGPT4,
          chunkSize: individualReports.length,
          maxRetries: 3
        }
      );
    }

    const generatedReport = summaryResult.report;
    const features = summaryResult.features;
    
    logger.info('summaryReport API: サマリー生成完了', {
      themeId,
      method: individualReports.length >= 3 ? 'enhanced' : 'robust',
      reportLength: generatedReport.length,
      metadata: summaryResult.metadata
    });
    
    if (!generatedReport) {
      throw new Error('レポート生成に失敗しました');
    }

    // Firestoreに保存
    const summaryReportId = uuidv4();
    const summaryReportData = {
      summaryReportId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      themeId,
      themeName,
      totalInterviews: individualReports.length,
      features,
      report: generatedReport,
      personaDistribution: Array.from(personaMap.entries()).map(([k, v]) => ({ persona: k, count: v }))
    };

    // 既存レポートがある場合は削除
    if (!existingReports.empty) {
      const batch = adminDb.batch();
      existingReports.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // 新しいレポートを保存
    await summaryReportRef.doc(summaryReportId).set(summaryReportData);

    // テーマドキュメントを更新
    await themeRef.update({
      summaryReportCreated: true,
      summaryReportId,
      lastSummaryUpdate: FieldValue.serverTimestamp()
    });

    logger.info('summaryReport API: レポート生成成功', {
      themeId,
      reportId: summaryReportId,
      featureCount: features.length
    });

    return NextResponse.json({
      report: generatedReport,
      reportId: summaryReportId,
      features,
      totalInterviews: individualReports.length,
      generated: true
    });

  } catch (error) {
    logger.error('summaryReport API: エラー', error as Error);
    return NextResponse.json({ 
      error: 'サマリーレポートの生成に失敗しました',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

/**
 * サマリーレポート生成用のプロンプトを作成
 */
function createSummaryPrompt(themeName: string, reports: any[]): string {
  // 各レポートから重要な情報を抽出（最初の300文字のみ使用してトークン削減）
  const reportsText = reports.map((r, i) => {
    const persona = `${r.userInfo.age || '年齢不明'}・${r.userInfo.gender || '性別不明'}・${r.userInfo.occupation || '職業不明'}`;
    // キーワードを抽出して要約を効率化
    const reportSummary = r.report.substring(0, 300);
    return `【${i + 1}】${persona}: ${reportSummary}...`;
  }).join('\n');

  // ペルソナグループを事前に抽出
  const personaGroups = new Map<string, number>();
  reports.forEach(r => {
    const occupation = r.userInfo.occupation || '不明';
    personaGroups.set(occupation, (personaGroups.get(occupation) || 0) + 1);
  });
  const topPersonas = Array.from(personaGroups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([persona]) => persona);

  return `
${reportsText}

上記${reports.length}件のインタビューを詳細に分析し、以下の構成で包括的なサマリーレポートを作成してください。
各セクションには具体的で洞察に富んだ内容を記載し、インタビュー内容から得られた発見を詳しく説明してください。

# ${themeName} - インタビュー結果サマリー

## 調査概要
- 実施インタビュー数: ${reports.length}件
- ペルソナ分布: ${Array.from(personaGroups.entries()).map(([k, v]) => `${k}(${v}名)`).join('、')}
- インタビュー全体から見える主要な傾向と特徴を詳しく分析し、3-4行で説明してください

## 求められている特徴・機能

### 情報の統合と一元管理
- 複数のユーザーから共通して挙げられた情報分散の課題について、インタビュー内容から具体的に分析してください
- どのペルソナが特に重視しているか、その理由と背景を詳しく説明してください
- 統合プラットフォームへの具体的な期待と要望の詳細を記載してください

### AIによる自動化と効率化
- AI機能への期待と具体的な活用シーンをインタビュー内容から抽出し詳しく説明してください
- 自動化したい業務やプロセスの具体例を複数挙げてください
- 各ペルソナごとのAI活用への期待の違いと共通点を分析してください

### セキュリティとプライバシー
- データ保護への要求レベルと具体的な要件を詳述してください
- コンプライアンス要件（GDPR、個人情報保護など）への対応必要性について説明してください
- アクセス権限管理やデータ暗号化への具体的な要望を記載してください

### 価格とコストパフォーマンス
- 各ペルソナの予算感と価格への期待を具体的な金額で説明してください
- 料金体系への要望（月額制、従量制、フリーミアムなど）の詳細を分析してください
- ROIや費用対効果への期待と投資判断基準について説明してください

### カスタマイズと柔軟性
- パーソナライゼーション機能への具体的な要望を記載してください
- スケーラビリティと拡張性への期待について説明してください
- 既存ツールとの連携要件と統合の必要性を分析してください

## ペルソナ別の特徴的な要望

### ${topPersonas[0] || 'ソフトウェアエンジニア'}
- このグループ特有の技術的要件や機能要望を具体的に3-4点挙げてください
- 優先する価値（効率性、自動化、技術的先進性など）について説明してください
- 予算感と導入プロセスの特徴を分析してください

### ${topPersonas[1] || 'プロダクトマネージャー'}
- このグループの業務課題と解決への期待を具体的に説明してください
- 重視する機能と評価ポイントの詳細を記載してください
- 意思決定プロセスと承認フローの特徴を分析してください

### ${topPersonas[2] || 'マーケティングマネージャー'}
- このグループ固有のニーズと要望の詳細を説明してください
- 競合製品との比較で重視する点を分析してください
- 導入後の成功イメージと期待効果を記載してください

## 価格感覚の分析
- 全体的な予算レンジ: インタビューから得られた最低価格から最高価格まで具体的な金額を記載してください
- ペルソナごとの価格感覚の違いと共通点を詳しく分析してください
- 価格に見合う価値として期待される機能やサービスを説明してください
- 支払い方法や契約形態への具体的な要望を記載してください

## 重要な発見事項
- 共通して見られた最重要課題Top3とその詳細な説明を記載してください
- 予想外の発見や新しい気づきを2-3点具体的に説明してください
- 競合製品では満たされていない潜在的ニーズの発見を記載してください
- 市場機会とビジネスチャンスの可能性について分析してください

## 推奨アクション
- 最優先で実装すべき機能Top3とその選定理由を説明してください
- プライマリーターゲットの明確化と市場アプローチ戦略を提案してください
- 段階的な製品開発ロードマップの概要を記載してください
- 価格戦略とビジネスモデルの提案を詳しく説明してください

## 結論
- 製品の方向性: インタビュー全体から導き出される明確な方向性を説明してください
- 重要成功要因: 成功のための最重要要因3つを具体的に記載してください
- 差別化ポイント: 競合と差別化できる主要ポイントを分析してください
- 今後の展望: 短期・長期での目標と追加調査の必要性について説明してください
`;
}

/**
 * レポートから特徴を抽出（改善版）
 */
function extractFeatures(report: string, individualReports: any[]): FeatureGroup[] {
  const features: FeatureGroup[] = [];
  const lines = report.split('\n');
  
  let currentFeature: FeatureGroup | null = null;
  let priority = 1;
  let inFeaturesSection = false;
  let currentSection = '';
  
  lines.forEach((line, index) => {
    // セクションの判定
    if (line.includes('## 求められている特徴・機能')) {
      inFeaturesSection = true;
      currentSection = 'features';
    } else if (line.startsWith('## ') && !line.includes('求められている特徴')) {
      inFeaturesSection = false;
      currentSection = '';
      // 最後の特徴を保存
      if (currentFeature && currentFeature.details.trim()) {
        features.push(currentFeature);
        currentFeature = null;
      }
    }
    
    // 特徴セクション内の### で始まる行を特徴として認識
    if (inFeaturesSection && line.startsWith('### ')) {
      // 前の特徴を保存
      if (currentFeature && currentFeature.details.trim()) {
        features.push(currentFeature);
      }
      
      const title = line.replace('### ', '').trim();
      currentFeature = {
        title,
        priority: priority++,
        details: '',
        mentionCount: 0,
        personas: [],
        quotes: []
      };
    } else if (currentFeature && line.startsWith('- ')) {
      // 詳細を追加
      currentFeature.details += line + '\n';
    }
  });
  
  // 最後の特徴を追加
  if (currentFeature && (currentFeature as FeatureGroup).details && (currentFeature as FeatureGroup).details.trim()) {
    features.push(currentFeature as FeatureGroup);
  }
  
  // メンションカウントとペルソナを集計
  features.forEach(feature => {
    // キーワードベースでカウント
    const keywords = extractKeywords(feature.title);
    
    individualReports.forEach(r => {
      const reportLower = r.report.toLowerCase();
      const hasKeyword = keywords.some(keyword => 
        reportLower.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        feature.mentionCount++;
        const persona = r.userInfo.occupation || '不明';
        if (!feature.personas.includes(persona)) {
          feature.personas.push(persona);
        }
        
        // 関連する引用を抽出（最初の100文字）
        const sentences = r.report.split('。');
        for (const sentence of sentences) {
          if (keywords.some(kw => sentence.toLowerCase().includes(kw.toLowerCase()))) {
            const quote = sentence.substring(0, 100) + '...';
            if (feature.quotes.length < 3) { // 最大3つの引用
              feature.quotes.push(quote);
            }
            break;
          }
        }
      }
    });
  });
  
  return features.filter(f => f.details.trim() !== ''); // 内容がある特徴のみ返す
}

/**
 * タイトルからキーワードを抽出
 */
function extractKeywords(title: string): string[] {
  // 基本的なキーワード抽出
  const keywords = [title];
  
  // 特定のキーワードマッピング
  const keywordMap: { [key: string]: string[] } = {
    '情報の統合と一元管理': ['統合', '一元管理', '情報', 'プラットフォーム'],
    'AIによる自動化と効率化': ['AI', '自動化', '効率化', '人工知能', 'ChatGPT'],
    'セキュリティとプライバシー': ['セキュリティ', 'プライバシー', '暗号化', 'GDPR', '個人情報'],
    '価格とコストパフォーマンス': ['価格', 'コスト', '料金', '予算', '月額'],
    'カスタマイズと柔軟性': ['カスタマイズ', '柔軟性', 'パーソナライズ', 'スケール']
  };
  
  Object.entries(keywordMap).forEach(([key, values]) => {
    if (title.includes(key)) {
      keywords.push(...values);
    }
  });
  
  return [...new Set(keywords)]; // 重複を除去
}

/**
 * サマリーレポートを取得
 * GET /api/report/summaryReport?themeId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const themeId = searchParams.get('themeId');
    
    if (!themeId) {
      return NextResponse.json({ 
        error: 'テーマIDが必要です' 
      }, { status: 400 });
    }

    const themeRef = adminDb.doc(`themes/${themeId}`);
    const summaryReportRef = themeRef.collection('summaryReport');
    const snapshot = await summaryReportRef.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        exists: false,
        message: 'サマリーレポートが見つかりません' 
      }, { status: 404 });
    }

    const reportData = snapshot.docs[0].data();
    
    return NextResponse.json({
      exists: true,
      report: reportData.report,
      reportId: reportData.summaryReportId,
      features: reportData.features,
      totalInterviews: reportData.totalInterviews,
      personaDistribution: reportData.personaDistribution,
      createdAt: reportData.createdAt
    });

  } catch (error) {
    logger.error('summaryReport GET: エラー', error as Error);
    return NextResponse.json({ 
      error: 'サマリーレポートの取得に失敗しました' 
    }, { status: 500 });
  }
}