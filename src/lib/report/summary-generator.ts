/**
 * 大量の個別レポートから堅牢なサマリーレポートを生成
 * チャンク分割、段階的集約、情報保持を最適化
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface IndividualReport {
  report: string;
  userInfo: {
    age?: string;
    gender?: string;
    occupation?: string;
  };
  interviewId: string;
}

interface ExtractedInsight {
  category: string;
  content: string;
  personas: string[];
  frequency: number;
  quotes?: string[];
}

interface ChunkSummary {
  insights: ExtractedInsight[];
  personas: Map<string, number>;
  keyThemes: string[];
  reportIds: string[];
}

/**
 * 大量レポートからサマリーを生成（メイン関数）
 */
export async function generateRobustSummary(
  themeName: string,
  reports: IndividualReport[],
  options: {
    useGPT4?: boolean;
    chunkSize?: number;
    maxRetries?: number;
  } = {}
): Promise<{
  report: string;
  features: any[];
  metadata: any;
}> {
  const {
    useGPT4 = false,
    chunkSize = 10, // 一度に処理するレポート数
    maxRetries = 3
  } = options;

  logger.info('summary-generator: サマリー生成開始', {
    totalReports: reports.length,
    chunkSize,
    useGPT4
  });

  try {
    // Step 1: レポートから重要情報を抽出
    const extractedData = await extractKeyInformation(reports, chunkSize, useGPT4);
    
    // Step 2: 抽出した情報を統合・分析
    const consolidatedInsights = consolidateInsights(extractedData);
    
    // Step 3: 最終的なサマリーレポートを生成
    const finalReport = await generateFinalReport(
      themeName,
      consolidatedInsights,
      reports.length,
      useGPT4
    );
    
    // Step 4: 特徴を構造化
    const features = structureFeatures(consolidatedInsights);
    
    return {
      report: finalReport,
      features,
      metadata: {
        totalReports: reports.length,
        processedChunks: Math.ceil(reports.length / chunkSize),
        extractedInsights: consolidatedInsights.insights.length,
        uniquePersonas: consolidatedInsights.personas.size
      }
    };
    
  } catch (error) {
    logger.error('summary-generator: エラー', error as Error);
    throw error;
  }
}

/**
 * Step 1: レポートから重要情報を抽出（チャンク処理）
 */
async function extractKeyInformation(
  reports: IndividualReport[],
  chunkSize: number,
  useGPT4: boolean
): Promise<ChunkSummary[]> {
  const chunks: IndividualReport[][] = [];
  
  // レポートをチャンクに分割
  for (let i = 0; i < reports.length; i += chunkSize) {
    chunks.push(reports.slice(i, i + chunkSize));
  }
  
  logger.info('summary-generator: チャンク分割完了', {
    totalChunks: chunks.length,
    chunkSize
  });
  
  const chunkSummaries: ChunkSummary[] = [];
  
  // 各チャンクを並列処理（ただし同時実行数を制限）
  const maxConcurrent = 3;
  for (let i = 0; i < chunks.length; i += maxConcurrent) {
    const batch = chunks.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(chunk => 
      extractChunkInsights(chunk, useGPT4)
    );
    
    const batchResults = await Promise.all(batchPromises);
    chunkSummaries.push(...batchResults);
    
    logger.info('summary-generator: バッチ処理完了', {
      processedChunks: Math.min(i + maxConcurrent, chunks.length),
      totalChunks: chunks.length
    });
  }
  
  return chunkSummaries;
}

/**
 * チャンクごとの洞察抽出
 */
async function extractChunkInsights(
  chunk: IndividualReport[],
  useGPT4: boolean
): Promise<ChunkSummary> {
  // 各レポートから構造化データを抽出
  const extractionPrompt = createExtractionPrompt(chunk);
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `あなたは優秀なデータアナリストです。複数のレポートから重要な洞察を抽出し、構造化された形式で出力してください。
以下の形式でJSONとして出力してください：
{
  "insights": [
    {
      "category": "カテゴリ名",
      "content": "具体的な内容",
      "personas": ["関連するペルソナ"],
      "frequency": 言及回数,
      "quotes": ["代表的な引用"]
    }
  ],
  "keyThemes": ["主要テーマ1", "主要テーマ2"],
  "commonRequests": ["共通要望1", "共通要望2"]
}`
      },
      { role: "user", content: extractionPrompt }
    ],
    model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo-16k",
    temperature: 0.3, // 低めの温度で一貫性を確保
    max_tokens: 2000
    // response_format削除: JSON形式の制約がレスポンスを短くしてしまうため
  });
  
  const response = completion.choices[0].message.content || '';
  let parsedData;
  
  try {
    // JSONマーカーを探す
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const jsonStr = response.substring(jsonStart, jsonEnd + 1);
      parsedData = JSON.parse(jsonStr);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (error) {
    logger.warn('summary-generator: JSON解析エラー、テキスト解析フォールバック');
    // テキストから情報を抽出するフォールバック
    parsedData = extractFromText(response, chunk);
  }
  
  // ペルソナ情報を集計
  const personas = new Map<string, number>();
  chunk.forEach(r => {
    const occupation = r.userInfo.occupation || '不明';
    personas.set(occupation, (personas.get(occupation) || 0) + 1);
  });
  
  // 構造化されたインサイトに変換
  const insights: ExtractedInsight[] = (parsedData.insights || []).map((item: any) => ({
    category: item.category || '未分類',
    content: item.content || '',
    personas: item.personas || [],
    frequency: item.frequency || 1,
    quotes: item.quotes || []
  }));
  
  return {
    insights,
    personas,
    keyThemes: parsedData.keyThemes || [],
    reportIds: chunk.map(r => r.interviewId)
  };
}

/**
 * 抽出プロンプトの作成（情報を最大限保持）
 */
function createExtractionPrompt(chunk: IndividualReport[]): string {
  const reportsText = chunk.map((r, i) => {
    const persona = `${r.userInfo.age || '?'}・${r.userInfo.gender || '?'}・${r.userInfo.occupation || '?'}`;
    
    // レポートから重要部分を抽出（最初と主要セクション）
    const sections = extractReportSections(r.report);
    
    return `
【レポート${i + 1}】
ペルソナ: ${persona}
${sections}`;
  }).join('\n---\n');
  
  return `以下の${chunk.length}件のレポートから、重要な洞察を抽出してください。
各レポートの主要な発見、要望、課題を漏れなく抽出し、構造化してください。

${reportsText}

必ず以下の観点を含めて分析してください：
1. 共通して言及される機能や要望
2. ペルソナごとの特徴的なニーズ
3. 価格やコストに関する言及
4. セキュリティやプライバシーへの懸念
5. 既存の課題や改善要望
6. 競合製品への言及
7. 導入障壁や懸念事項`;
}

/**
 * テキストから情報を抽出（フォールバック用）
 */
function extractFromText(text: string, chunk: IndividualReport[]): any {
  const insights: ExtractedInsight[] = [];
  const keyThemes: string[] = [];
  
  // チャンクのレポートから直接洞察を抽出
  chunk.forEach(report => {
    const persona = report.userInfo.occupation || '不明';
    
    // 各レポートから重要なキーワードを抽出
    const importantPatterns = [
      /期待|要望|希望/g,
      /課題|問題|懸念/g,
      /価格|コスト|予算/g,
      /セキュリティ|プライバシー/g,
      /AI|自動化|効率/g
    ];
    
    importantPatterns.forEach(pattern => {
      const matches = report.report.match(pattern);
      if (matches && matches.length > 0) {
        const category = pattern.source.split('|')[0];
        insights.push({
          category,
          content: `${persona}の${category}に関する言及`,
          personas: [persona],
          frequency: matches.length,
          quotes: []
        });
      }
    });
  });
  
  return {
    insights: insights.slice(0, 10),
    keyThemes: ['AI活用', '効率化', 'セキュリティ'],
    commonRequests: []
  };
}

/**
 * レポートから主要セクションを抽出
 */
function extractReportSections(report: string): string {
  const lines = report.split('\n');
  const sections: string[] = [];
  let currentSection = '';
  let isImportantSection = false;
  
  const importantHeaders = [
    '主要な発見',
    '要望',
    '課題',
    '価格',
    '競合',
    '結論',
    '推奨',
    'ニーズ',
    '期待'
  ];
  
  for (const line of lines) {
    // セクションヘッダーを検出
    if (line.startsWith('#') || line.startsWith('##')) {
      if (currentSection && isImportantSection) {
        sections.push(currentSection.substring(0, 500)); // 各セクション最大500文字
      }
      
      isImportantSection = importantHeaders.some(h => line.includes(h));
      currentSection = line + '\n';
    } else if (isImportantSection) {
      currentSection += line + '\n';
    }
  }
  
  if (currentSection && isImportantSection) {
    sections.push(currentSection.substring(0, 500));
  }
  
  // セクションが見つからない場合は冒頭を使用
  if (sections.length === 0) {
    sections.push(report.substring(0, 800));
  }
  
  return sections.join('\n');
}

/**
 * Step 2: 洞察を統合
 */
function consolidateInsights(chunkSummaries: ChunkSummary[]): {
  insights: ExtractedInsight[];
  personas: Map<string, number>;
  keyThemes: string[];
} {
  const consolidatedInsights = new Map<string, ExtractedInsight>();
  const allPersonas = new Map<string, number>();
  const themeFrequency = new Map<string, number>();
  
  // すべてのチャンクサマリーを統合
  for (const summary of chunkSummaries) {
    // インサイトを統合（同じカテゴリ・内容のものはマージ）
    for (const insight of summary.insights) {
      const key = `${insight.category}:${insight.content.substring(0, 50)}`;
      
      if (consolidatedInsights.has(key)) {
        const existing = consolidatedInsights.get(key)!;
        existing.frequency += insight.frequency;
        existing.personas = [...new Set([...existing.personas, ...insight.personas])];
        if (insight.quotes) {
          existing.quotes = [...(existing.quotes || []), ...insight.quotes].slice(0, 5);
        }
      } else {
        consolidatedInsights.set(key, { ...insight });
      }
    }
    
    // ペルソナを統合
    summary.personas.forEach((count, persona) => {
      allPersonas.set(persona, (allPersonas.get(persona) || 0) + count);
    });
    
    // テーマを統合
    summary.keyThemes.forEach(theme => {
      themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1);
    });
  }
  
  // 頻度順にソート
  const sortedInsights = Array.from(consolidatedInsights.values())
    .sort((a, b) => b.frequency - a.frequency);
  
  const topThemes = Array.from(themeFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme]) => theme);
  
  return {
    insights: sortedInsights,
    personas: allPersonas,
    keyThemes: topThemes
  };
}

/**
 * Step 3: 最終レポート生成
 */
async function generateFinalReport(
  themeName: string,
  consolidatedData: any,
  totalReports: number,
  useGPT4: boolean
): Promise<string> {
  const { insights, personas, keyThemes } = consolidatedData;
  
  // トップインサイトを選択（最大20個）
  const topInsights = insights.slice(0, 20);
  
  // ペルソナ分布
  const personaDistribution = Array.from(personas.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([persona, count]) => `${persona}(${count}名)`)
    .join('、');
  
  // インサイトをカテゴリ別に整理
  const categorizedInsights = new Map<string, ExtractedInsight[]>();
  topInsights.forEach(insight => {
    if (!categorizedInsights.has(insight.category)) {
      categorizedInsights.set(insight.category, []);
    }
    categorizedInsights.get(insight.category)!.push(insight);
  });
  
  const finalPrompt = `
以下の統合された洞察データから、${themeName}に関する包括的なサマリーレポートを作成してください。

【分析対象】
- 総レポート数: ${totalReports}件
- ペルソナ分布: ${personaDistribution}
- 主要テーマ: ${keyThemes.join('、')}

【抽出された主要な洞察】
${Array.from(categorizedInsights.entries()).map(([category, insights]) => `
### ${category}
${insights.map(i => `- ${i.content} (言及数: ${i.frequency}, 関連: ${i.personas.join('、')})`).join('\n')}
`).join('\n')}

上記の情報を基に、以下の構成で詳細なサマリーレポートを作成してください：

# ${themeName} - インタビュー結果総合サマリー

## エグゼクティブサマリー
3-4段落で全体の要点をまとめてください。

## 調査概要と方法論
- 調査規模とペルソナ分布
- 分析アプローチ
- 主要な発見の概要

## 主要な発見事項と洞察

### 1. 最重要課題と要望
統合データから見える最も重要な3-5個の発見を詳述

### 2. ペルソナ別の特徴的ニーズ
各主要ペルソナグループの独自要望と共通点

### 3. 機能・サービスへの期待
具体的な機能要望とその背景

### 4. 価格感覚と投資意欲
予算レンジと価値認識の分析

### 5. 導入障壁と懸念事項
実装における課題と解決への期待

## 戦略的推奨事項

### 短期的アクション（3-6ヶ月）
すぐに着手すべき具体的な施策

### 中長期的方向性（6-12ヶ月）
持続的な成長のための戦略

## 結論
全体のまとめと今後の展望`;
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "あなたは優秀なビジネスアナリストです。データに基づいた洞察深いレポートを作成してください。"
      },
      { role: "user", content: finalPrompt }
    ],
    model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo-16k",
    temperature: 0.7,
    max_tokens: 4096
  });
  
  return completion.choices[0].message.content || '';
}

/**
 * Step 4: 特徴を構造化
 */
function structureFeatures(consolidatedData: any): any[] {
  const { insights } = consolidatedData;
  
  // カテゴリ別にグループ化
  const categories = new Map<string, any[]>();
  insights.slice(0, 15).forEach((insight: ExtractedInsight) => {
    if (!categories.has(insight.category)) {
      categories.set(insight.category, []);
    }
    categories.get(insight.category)!.push(insight);
  });
  
  // 特徴として構造化
  return Array.from(categories.entries()).map(([category, items]) => ({
    title: category,
    priority: items.reduce((sum, item) => sum + item.frequency, 0),
    details: items.map(i => i.content).join('; '),
    mentionCount: items.reduce((sum, item) => sum + item.frequency, 0),
    personas: [...new Set(items.flatMap(i => i.personas))],
    quotes: items.flatMap(i => i.quotes || []).slice(0, 3)
  })).sort((a, b) => b.priority - a.priority);
}

/**
 * エラーリトライ機能付きのAPI呼び出し
 */
async function callOpenAIWithRetry(
  messages: any[],
  model: string,
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        messages,
        model,
        temperature: 0.7,
        max_tokens: 4096
      });
      return completion;
    } catch (error: any) {
      logger.warn(`summary-generator: API呼び出し失敗 (試行 ${attempt}/${maxRetries})`, {
        error: error.message
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // 指数バックオフ
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}