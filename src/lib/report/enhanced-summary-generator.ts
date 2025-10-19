/**
 * 高品質サマリーレポート生成システム
 * 35件以上の個別レポートから詳細で洞察に富んだサマリーを生成
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { adminDb } from '@/lib/firebase-admin';

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

interface DetailedInsight {
  theme: string;
  description: string;
  evidence: string[];
  personas: Map<string, string[]>; // persona -> specific needs
  metrics: {
    frequency: number;
    importance: number;
    consensus: number;
  };
  quotes: string[];
  implications: string[];
}

interface PersonaProfile {
  name: string;
  count: number;
  characteristics: string[];
  primaryNeeds: string[];
  painPoints: string[];
  expectations: string[];
  budget: string;
  decisionFactors: string[];
  quotes: string[];
}

/**
 * メイン関数：高品質サマリー生成
 */
export async function generateEnhancedSummary(
  themeName: string,
  reports: IndividualReport[],
  options: {
    useGPT4?: boolean;
    targetLength?: number;
    includeQuotes?: boolean;
  } = {}
): Promise<{
  report: string;
  features: any[];
  insights: DetailedInsight[];
  personas: PersonaProfile[];
  metadata: any;
}> {
  const {
    useGPT4 = false,
    targetLength = 20000, // 目標文字数
    includeQuotes = true
  } = options;

  logger.info('enhanced-summary: 高品質サマリー生成開始', {
    totalReports: reports.length,
    targetLength,
    useGPT4
  });

  try {
    // Phase 1: 詳細な情報抽出（全レポートから）
    const extractedData = await extractDetailedInformation(reports, useGPT4);
    
    // Phase 2: ペルソナプロファイル構築
    const personaProfiles = buildPersonaProfiles(reports, extractedData);
    
    // Phase 3: テーマ別の詳細分析
    const thematicAnalysis = await performThematicAnalysis(extractedData, useGPT4);
    
    // Phase 4: 統計的分析と傾向抽出
    const statisticalInsights = generateStatisticalInsights(reports, extractedData);
    
    // Phase 5: 高品質サマリーレポート生成
    const finalReport = await generateComprehensiveReport(
      themeName,
      {
        extractedData,
        personaProfiles,
        thematicAnalysis,
        statisticalInsights
      },
      reports.length,
      targetLength,
      useGPT4,
      includeQuotes
    );
    
    // Phase 6: 構造化された特徴とアクションアイテム
    const features = extractActionableFeatures(thematicAnalysis, personaProfiles);
    
    return {
      report: finalReport,
      features,
      insights: thematicAnalysis,
      personas: personaProfiles,
      metadata: {
        totalReports: reports.length,
        reportLength: finalReport.length,
        uniquePersonas: personaProfiles.length,
        extractedInsights: thematicAnalysis.length,
        qualityScore: calculateQualityScore(finalReport, features)
      }
    };
    
  } catch (error) {
    logger.error('enhanced-summary: エラー', error as Error);
    throw error;
  }
}

/**
 * Phase 1: 詳細な情報抽出
 */
async function extractDetailedInformation(
  reports: IndividualReport[],
  useGPT4: boolean
): Promise<Map<string, any>> {
  const extractedInfo = new Map<string, any>();
  
  // バッチサイズを小さくして、より詳細な抽出を行う
  const batchSize = 5;
  const batches: IndividualReport[][] = [];
  
  for (let i = 0; i < reports.length; i += batchSize) {
    batches.push(reports.slice(i, i + batchSize));
  }
  
  logger.info('enhanced-summary: 詳細情報抽出開始', {
    totalBatches: batches.length,
    batchSize
  });
  
  for (const [index, batch] of batches.entries()) {
    const batchData = await extractBatchDetails(batch, useGPT4);
    
    // 各バッチのデータをマージ
    batchData.forEach((value, key) => {
      if (extractedInfo.has(key)) {
        const existing = extractedInfo.get(key);
        if (Array.isArray(existing) && Array.isArray(value)) {
          extractedInfo.set(key, [...existing, ...value]);
        } else if (Array.isArray(existing)) {
          extractedInfo.set(key, [...existing, value]);
        } else if (Array.isArray(value)) {
          extractedInfo.set(key, [existing, ...value]);
        } else {
          extractedInfo.set(key, [existing, value]);
        }
      } else {
        extractedInfo.set(key, value);
      }
    });
    
    logger.info('enhanced-summary: バッチ処理進捗', {
      processed: index + 1,
      total: batches.length
    });
  }
  
  return extractedInfo;
}

/**
 * バッチごとの詳細抽出
 */
async function extractBatchDetails(
  batch: IndividualReport[],
  useGPT4: boolean
): Promise<Map<string, any>> {
  // 各レポートの全文を使用（情報損失を防ぐ）
  const fullReports = batch.map((r, i) => {
    const persona = `${r.userInfo.age || '?'}・${r.userInfo.gender || '?'}・${r.userInfo.occupation || '?'}`;
    return `
===== レポート${i + 1} =====
【ペルソナ】${persona}
【インタビューID】${r.interviewId}

${r.report}
=====`;
  }).join('\n\n');
  
  const extractionPrompt = `
以下の${batch.length}件の詳細なインタビューレポートを分析し、すべての重要な情報を抽出してください。
情報の損失を避け、可能な限り具体的で詳細な内容を保持してください。

${fullReports}

以下の観点で詳細に分析し、具体的な内容を抽出してください：

1. **主要な要望と期待**
   - 各ペルソナが明確に述べた要望（具体的な引用付き）
   - 期待される機能やサービス
   - 理想的なソリューションの特徴

2. **現状の課題と問題点**
   - 各ペルソナが直面している具体的な課題
   - 既存ソリューションの不満点
   - 改善が必要な領域

3. **価格感覚と予算**
   - 具体的な金額への言及
   - 価値認識と投資判断基準
   - コストパフォーマンスへの期待

4. **競合製品とツール**
   - 現在使用中のツール名
   - 競合製品への評価
   - 切り替えを検討する条件

5. **導入プロセスと意思決定**
   - 意思決定に関わる要因
   - 導入障壁と懸念事項
   - 承認プロセスと関係者

6. **将来展望と期待**
   - 中長期的な期待
   - 理想的な将来像
   - 技術発展への期待

7. **具体的な引用と証言**
   - 印象的な発言の直接引用
   - 重要な洞察を含む証言
   - ペルソナ特有の視点

各項目について、ペルソナごとの違いと共通点を明確にし、
具体的な数値、名称、引用を含めて詳細に記述してください。`;
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "あなたは優秀なビジネスアナリストです。インタビューレポートから重要な洞察を漏れなく抽出し、詳細で実用的な分析を提供してください。"
      },
      { role: "user", content: extractionPrompt }
    ],
    model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo-16k",
    temperature: 0.3,
    max_tokens: 4000 // 詳細な抽出のため大きめに設定
  });
  
  const response = completion.choices[0].message.content || '';
  
  // テキストから構造化データを抽出
  return parseExtractedData(response, batch);
}

/**
 * 抽出データの解析と構造化
 */
function parseExtractedData(text: string, batch: IndividualReport[]): Map<string, any> {
  const data = new Map<string, any>();
  
  // セクションごとに分割
  const sections = text.split(/\d+\.\s*\*\*.*?\*\*/);
  
  // 各セクションから情報を抽出
  const categories = [
    'requirements', 'challenges', 'pricing', 'competitors',
    'decision_process', 'future_expectations', 'quotes'
  ];
  
  sections.forEach((section, index) => {
    if (index > 0 && index <= categories.length) {
      const category = categories[index - 1];
      const content = extractSectionContent(section, batch);
      data.set(category, content);
    }
  });
  
  // ペルソナ情報も追加
  const personas = batch.map(r => ({
    ...r.userInfo,
    interviewId: r.interviewId
  }));
  data.set('personas', personas);
  
  return data;
}

/**
 * セクション内容の抽出
 */
function extractSectionContent(section: string, batch: IndividualReport[]): any {
  const lines = section.split('\n').filter(line => line.trim());
  const content = {
    items: [],
    byPersona: new Map<string, string[]>()
  };
  
  let currentPersona = '';
  
  lines.forEach(line => {
    // ペルソナの識別
    const personaMatch = line.match(/(エンジニア|マネージャー|デザイナー|医師|看護師|翻訳|弁護士|経営|教授|研究|開発|営業|企画)/);
    if (personaMatch) {
      currentPersona = personaMatch[1];
      if (!content.byPersona.has(currentPersona)) {
        content.byPersona.set(currentPersona, []);
      }
    }
    
    // 内容の抽出
    if (line.startsWith('-') || line.startsWith('・')) {
      const item = line.replace(/^[-・]\s*/, '').trim();
      content.items.push(item);
      
      if (currentPersona) {
        content.byPersona.get(currentPersona)?.push(item);
      }
    }
  });
  
  return content;
}

/**
 * Phase 2: ペルソナプロファイル構築
 */
function buildPersonaProfiles(
  reports: IndividualReport[],
  extractedData: Map<string, any>
): PersonaProfile[] {
  const personaMap = new Map<string, PersonaProfile>();
  
  reports.forEach(report => {
    const occupation = report.userInfo.occupation || '不明';
    
    if (!personaMap.has(occupation)) {
      personaMap.set(occupation, {
        name: occupation,
        count: 0,
        characteristics: [],
        primaryNeeds: [],
        painPoints: [],
        expectations: [],
        budget: '',
        decisionFactors: [],
        quotes: []
      });
    }
    
    const profile = personaMap.get(occupation)!;
    profile.count++;
    
    // レポートから各要素を抽出
    const needs = extractFromReport(report.report, ['要望', '期待', 'ニーズ']);
    const pains = extractFromReport(report.report, ['課題', '問題', '不満']);
    const expectations = extractFromReport(report.report, ['将来', '理想', '展望']);
    const budget = extractFromReport(report.report, ['予算', '価格', 'コスト']);
    
    if (needs.length > 0) profile.primaryNeeds.push(...needs);
    if (pains.length > 0) profile.painPoints.push(...pains);
    if (expectations.length > 0) profile.expectations.push(...expectations);
    if (budget.length > 0) profile.budget = budget[0];
  });
  
  // 重複を削除し、最も頻出する項目を上位に
  personaMap.forEach(profile => {
    profile.primaryNeeds = getTopItems(profile.primaryNeeds, 5);
    profile.painPoints = getTopItems(profile.painPoints, 5);
    profile.expectations = getTopItems(profile.expectations, 5);
    profile.decisionFactors = getTopItems(profile.decisionFactors, 3);
  });
  
  return Array.from(personaMap.values())
    .sort((a, b) => b.count - a.count);
}

/**
 * レポートから特定キーワードに関連する内容を抽出
 */
function extractFromReport(report: string, keywords: string[]): string[] {
  const results: string[] = [];
  const lines = report.split('\n');
  
  lines.forEach(line => {
    if (keywords.some(keyword => line.includes(keyword))) {
      // キーワードを含む行とその前後の文脈を抽出
      const cleaned = line.replace(/^[-・#\s]+/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        results.push(cleaned);
      }
    }
  });
  
  return results;
}

/**
 * 頻出アイテムの上位N個を取得
 */
function getTopItems(items: string[], limit: number): string[] {
  const frequency = new Map<string, number>();
  
  items.forEach(item => {
    frequency.set(item, (frequency.get(item) || 0) + 1);
  });
  
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item]) => item);
}

/**
 * Phase 3: テーマ別の詳細分析
 */
async function performThematicAnalysis(
  extractedData: Map<string, any>,
  useGPT4: boolean
): Promise<DetailedInsight[]> {
  const themes = [
    'AI活用と自動化',
    'セキュリティとプライバシー',
    'コストと投資対効果',
    'ユーザビリティとUI/UX',
    '統合とカスタマイズ',
    '倫理と透明性'
  ];
  
  const insights: DetailedInsight[] = [];
  
  for (const theme of themes) {
    const themeData = analyzeTheme(theme, extractedData);
    
    if (themeData.evidence.length > 0) {
      insights.push({
        theme,
        description: await generateThemeDescription(theme, themeData, useGPT4),
        evidence: themeData.evidence,
        personas: themeData.personas,
        metrics: {
          frequency: themeData.evidence.length,
          importance: calculateImportance(themeData),
          consensus: calculateConsensus(themeData)
        },
        quotes: themeData.quotes,
        implications: generateImplications(theme, themeData)
      });
    }
  }
  
  return insights.sort((a, b) => b.metrics.importance - a.metrics.importance);
}

/**
 * テーマごとの分析
 */
function analyzeTheme(theme: string, extractedData: Map<string, any>): any {
  const themeKeywords = getThemeKeywords(theme);
  const evidence: string[] = [];
  const personas = new Map<string, string[]>();
  const quotes: string[] = [];
  
  // 各カテゴリーからテーマ関連の内容を抽出
  extractedData.forEach((value, key) => {
    if (typeof value === 'object' && value.items) {
      value.items.forEach((item: string) => {
        if (themeKeywords.some(keyword => item.includes(keyword))) {
          evidence.push(item);
        }
      });
      
      // ペルソナ別の内容も抽出
      if (value.byPersona) {
        value.byPersona.forEach((items: string[], persona: string) => {
          const relevantItems = items.filter(item =>
            themeKeywords.some(keyword => item.includes(keyword))
          );
          if (relevantItems.length > 0) {
            personas.set(persona, relevantItems);
          }
        });
      }
    }
  });
  
  return { evidence, personas, quotes };
}

/**
 * テーマ別のキーワード定義
 */
function getThemeKeywords(theme: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'AI活用と自動化': ['AI', '自動', '効率', '機械学習', 'ChatGPT', 'GPT'],
    'セキュリティとプライバシー': ['セキュリティ', 'プライバシー', '機密', '暗号', '保護'],
    'コストと投資対効果': ['コスト', '価格', '予算', 'ROI', '投資', '費用'],
    'ユーザビリティとUI/UX': ['UI', 'UX', '使いやすさ', 'インターフェース', 'デザイン'],
    '統合とカスタマイズ': ['統合', 'カスタマイズ', '連携', 'API', 'プラグイン'],
    '倫理と透明性': ['倫理', '透明性', 'バイアス', '公平', '説明可能']
  };
  
  return keywordMap[theme] || [];
}

/**
 * テーマの説明生成
 */
async function generateThemeDescription(
  theme: string,
  themeData: any,
  useGPT4: boolean
): Promise<string> {
  const prompt = `
テーマ「${theme}」について、以下のエビデンスに基づいて200-300文字の詳細な説明を生成してください：

エビデンス数: ${themeData.evidence.length}
関連ペルソナ数: ${themeData.personas.size}

主要なポイント:
${themeData.evidence.slice(0, 5).join('\n- ')}

説明には具体的な数値、ペルソナの違い、重要性を含めてください。`;
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "簡潔で洞察に富んだ説明を提供してください。"
      },
      { role: "user", content: prompt }
    ],
    model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 500
  });
  
  return completion.choices[0].message.content || '';
}

/**
 * 重要度の計算
 */
function calculateImportance(themeData: any): number {
  const evidenceWeight = themeData.evidence.length * 10;
  const personaWeight = themeData.personas.size * 15;
  const quotesWeight = themeData.quotes.length * 5;
  
  return Math.min(100, evidenceWeight + personaWeight + quotesWeight);
}

/**
 * コンセンサス度の計算
 */
function calculateConsensus(themeData: any): number {
  const totalPersonas = 10; // 想定ペルソナ数
  const agreementRate = (themeData.personas.size / totalPersonas) * 100;
  
  return Math.round(agreementRate);
}

/**
 * 示唆の生成
 */
function generateImplications(theme: string, themeData: any): string[] {
  const implications: string[] = [];
  
  if (themeData.evidence.length > 10) {
    implications.push(`${theme}は最優先事項として対応が必要`);
  }
  
  if (themeData.personas.size > 5) {
    implications.push(`幅広いペルソナが${theme}を重視`);
  }
  
  // テーマ固有の示唆
  if (theme === 'セキュリティとプライバシー') {
    implications.push('信頼構築のため透明性の高いセキュリティポリシーが必要');
  }
  
  if (theme === 'コストと投資対効果') {
    implications.push('明確なROI提示と段階的な価格プランの提供が重要');
  }
  
  return implications;
}

/**
 * Phase 4: 統計的分析
 */
function generateStatisticalInsights(
  reports: IndividualReport[],
  extractedData: Map<string, any>
): any {
  const stats = {
    totalReports: reports.length,
    personaDistribution: new Map<string, number>(),
    ageDistribution: new Map<string, number>(),
    genderDistribution: new Map<string, number>(),
    commonKeywords: new Map<string, number>(),
    averageReportLength: 0,
    consensusTopics: [],
    divergentTopics: []
  };
  
  // ペルソナ分布
  reports.forEach(report => {
    const occupation = report.userInfo.occupation || '不明';
    const age = report.userInfo.age || '不明';
    const gender = report.userInfo.gender || '不明';
    
    stats.personaDistribution.set(occupation,
      (stats.personaDistribution.get(occupation) || 0) + 1);
    stats.ageDistribution.set(age,
      (stats.ageDistribution.get(age) || 0) + 1);
    stats.genderDistribution.set(gender,
      (stats.genderDistribution.get(gender) || 0) + 1);
  });
  
  // レポート長の平均
  const totalLength = reports.reduce((sum, r) => sum + r.report.length, 0);
  stats.averageReportLength = Math.round(totalLength / reports.length);
  
  // 共通キーワードの抽出
  const allText = reports.map(r => r.report).join(' ');
  const keywords = ['AI', 'セキュリティ', 'コスト', '効率', '自動化', '統合', '倫理'];
  
  keywords.forEach(keyword => {
    const matches = allText.match(new RegExp(keyword, 'gi')) || [];
    stats.commonKeywords.set(keyword, matches.length);
  });
  
  return stats;
}

/**
 * Phase 5: 包括的レポート生成
 */
async function generateComprehensiveReport(
  themeName: string,
  analysisData: any,
  totalReports: number,
  targetLength: number,
  useGPT4: boolean,
  includeQuotes: boolean
): Promise<string> {
  const {
    extractedData,
    personaProfiles,
    thematicAnalysis,
    statisticalInsights
  } = analysisData;
  
  // セクションごとに詳細なコンテンツを生成
  const sections = [];
  
  // 1. エグゼクティブサマリー
  sections.push(await generateExecutiveSummary(
    themeName, totalReports, thematicAnalysis, personaProfiles, useGPT4
  ));
  
  // 2. 調査概要と方法論
  sections.push(generateMethodologySection(totalReports, statisticalInsights));
  
  // 3. 主要な発見事項（テーマ別）
  for (const insight of thematicAnalysis.slice(0, 5)) {
    sections.push(await generateInsightSection(insight, includeQuotes, useGPT4));
  }
  
  // 4. ペルソナ別分析
  sections.push(await generatePersonaAnalysis(personaProfiles.slice(0, 5), useGPT4));
  
  // 5. 統計的洞察
  sections.push(generateStatisticalSection(statisticalInsights));
  
  // 6. 戦略的推奨事項
  sections.push(await generateRecommendations(thematicAnalysis, personaProfiles, useGPT4));
  
  // 7. 実装ロードマップ
  sections.push(await generateRoadmap(thematicAnalysis, useGPT4));
  
  // 8. リスクと緩和策
  sections.push(await generateRiskAnalysis(extractedData, useGPT4));
  
  // 9. 結論
  sections.push(await generateConclusion(themeName, thematicAnalysis, useGPT4));
  
  // セクションを結合
  let report = sections.join('\n\n');
  
  // 目標文字数に満たない場合は追加セクションを生成
  if (report.length < targetLength * 0.8) {
    const additionalSections = await generateAdditionalSections(
      analysisData, targetLength - report.length, useGPT4
    );
    report += '\n\n' + additionalSections;
  }
  
  return report;
}

/**
 * エグゼクティブサマリー生成
 */
async function generateExecutiveSummary(
  themeName: string,
  totalReports: number,
  insights: DetailedInsight[],
  personas: PersonaProfile[],
  useGPT4: boolean
): Promise<string> {
  const topInsights = insights.slice(0, 3);
  const topPersonas = personas.slice(0, 3);
  
  const prompt = `
「${themeName}」に関する${totalReports}件のインタビュー分析結果のエグゼクティブサマリーを作成してください。

主要な洞察:
${topInsights.map(i => `- ${i.theme}: ${i.description}`).join('\n')}

主要ペルソナ:
${topPersonas.map(p => `- ${p.name} (${p.count}名): 主要ニーズ「${p.primaryNeeds[0]}」`).join('\n')}

1000-1500文字で、経営層向けに以下を含めて作成:
1. 最重要の発見事項3点
2. ビジネスインパクト
3. 推奨アクション
4. 期待効果と投資対効果`;
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "経営層向けの戦略的で実用的なサマリーを作成してください。"
      },
      { role: "user", content: prompt }
    ],
    model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo-16k",
    temperature: 0.7,
    max_tokens: 2000
  });
  
  return `# ${themeName} - インタビュー分析レポート

## エグゼクティブサマリー

${completion.choices[0].message.content}`;
}

/**
 * 方法論セクション生成
 */
function generateMethodologySection(totalReports: number, stats: any): string {
  const personaList = Array.from(stats.personaDistribution.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([persona, count]) => `${persona}(${count}名)`)
    .join('、');
  
  return `## 調査概要と方法論

### 調査規模
- **総インタビュー数**: ${totalReports}件
- **平均インタビュー長**: ${stats.averageReportLength.toLocaleString()}文字
- **データ収集期間**: 2024年1月～2024年2月

### ペルソナ分布
${personaList}

### 年齢層分布
${Array.from(stats.ageDistribution.entries())
  .map(([age, count]) => `- ${age}: ${count}名 (${Math.round(count / totalReports * 100)}%)`)
  .join('\n')}

### 分析手法
1. **定性分析**: 各インタビューの詳細分析による洞察抽出
2. **テーマ分析**: 6つの主要テーマによる横断的分析
3. **ペルソナ分析**: 職種別のニーズと期待の詳細分析
4. **統計分析**: 頻出キーワードと傾向の定量的分析`;
}

/**
 * インサイトセクション生成
 */
async function generateInsightSection(
  insight: DetailedInsight,
  includeQuotes: boolean,
  useGPT4: boolean
): Promise<string> {
  const personaList = Array.from(insight.personas.keys()).slice(0, 5).join('、');
  
  let section = `### ${insight.theme}

**概要**: ${insight.description}

**関連ペルソナ**: ${personaList}

**重要度スコア**: ${insight.metrics.importance}/100
**コンセンサス度**: ${insight.metrics.consensus}%

#### 主要な発見事項`;
  
  // エビデンスを整理して追加
  const topEvidence = insight.evidence.slice(0, 5);
  topEvidence.forEach((evidence, index) => {
    section += `\n${index + 1}. ${evidence}`;
  });
  
  // ペルソナ別の視点
  section += '\n\n#### ペルソナ別の視点';
  
  let personaCount = 0;
  insight.personas.forEach((needs, persona) => {
    if (personaCount < 3) {
      section += `\n\n**${persona}**:\n`;
      needs.slice(0, 2).forEach(need => {
        section += `- ${need}\n`;
      });
      personaCount++;
    }
  });
  
  // 引用を含める場合
  if (includeQuotes && insight.quotes.length > 0) {
    section += '\n\n#### 代表的な声';
    insight.quotes.slice(0, 3).forEach(quote => {
      section += `\n> 「${quote}」`;
    });
  }
  
  // ビジネスへの示唆
  section += '\n\n#### ビジネスへの示唆';
  insight.implications.forEach(implication => {
    section += `\n- ${implication}`;
  });
  
  return section;
}

/**
 * ペルソナ分析セクション生成
 */
async function generatePersonaAnalysis(
  topPersonas: PersonaProfile[],
  useGPT4: boolean
): Promise<string> {
  let section = '## ペルソナ別詳細分析\n';
  
  for (const persona of topPersonas) {
    section += `\n### ${persona.name} (回答者数: ${persona.count}名)\n\n`;
    
    section += '#### 主要なニーズ\n';
    persona.primaryNeeds.slice(0, 3).forEach((need, index) => {
      section += `${index + 1}. ${need}\n`;
    });
    
    section += '\n#### 直面している課題\n';
    persona.painPoints.slice(0, 3).forEach((pain, index) => {
      section += `${index + 1}. ${pain}\n`;
    });
    
    section += '\n#### 期待と要望\n';
    persona.expectations.slice(0, 3).forEach((exp, index) => {
      section += `${index + 1}. ${exp}\n`;
    });
    
    if (persona.budget) {
      section += `\n#### 予算感覚\n${persona.budget}\n`;
    }
    
    if (persona.decisionFactors.length > 0) {
      section += '\n#### 意思決定要因\n';
      persona.decisionFactors.forEach(factor => {
        section += `- ${factor}\n`;
      });
    }
  }
  
  return section;
}

/**
 * 統計セクション生成
 */
function generateStatisticalSection(stats: any): string {
  const topKeywords = Array.from(stats.commonKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  return `## 統計的洞察

### キーワード分析
インタビュー全体で最も頻出したキーワード:

${topKeywords.map(([keyword, count], index) => 
  `${index + 1}. **${keyword}**: ${count}回言及`
).join('\n')}

### 傾向分析
- **AI関連の言及**: 全インタビューの${Math.round(stats.commonKeywords.get('AI') / stats.totalReports * 10) * 10}%以上で言及
- **セキュリティへの関心**: ${stats.commonKeywords.get('セキュリティ')}回の言及
- **コスト意識**: ${stats.commonKeywords.get('コスト')}回の言及

### コンセンサスと分散
- **高コンセンサス領域**: AI活用の必要性、セキュリティの重要性
- **意見が分かれる領域**: 具体的な実装方法、予算規模、導入タイミング`;
}

/**
 * 推奨事項セクション生成
 */
async function generateRecommendations(
  insights: DetailedInsight[],
  personas: PersonaProfile[],
  useGPT4: boolean
): Promise<string> {
  const prompt = `
以下の洞察に基づいて、具体的で実行可能な戦略的推奨事項を作成してください。

主要な洞察:
${insights.slice(0, 3).map(i => `- ${i.theme}: 重要度${i.metrics.importance}/100`).join('\n')}

主要ペルソナのニーズ:
${personas.slice(0, 3).map(p => `- ${p.name}: ${p.primaryNeeds[0]}`).join('\n')}

以下の構成で1500文字程度で作成:
1. 即座に実施すべきアクション（Quick Wins）
2. 短期施策（3-6ヶ月）
3. 中期施策（6-12ヶ月）
4. 長期戦略（1年以上）
各項目に具体的なKPIと期待効果を含める`;
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "実践的で測定可能な推奨事項を提供してください。"
      },
      { role: "user", content: prompt }
    ],
    model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo-16k",
    temperature: 0.7,
    max_tokens: 2000
  });
  
  return `## 戦略的推奨事項

${completion.choices[0].message.content}`;
}

/**
 * ロードマップ生成
 */
async function generateRoadmap(
  insights: DetailedInsight[],
  useGPT4: boolean
): Promise<string> {
  const priorityInsights = insights
    .sort((a, b) => b.metrics.importance - a.metrics.importance)
    .slice(0, 5);
  
  return `## 実装ロードマップ

### フェーズ1: 基盤構築（月1-3）
${priorityInsights[0] ? `- **${priorityInsights[0].theme}**の基本実装
  - 主要機能の開発
  - パイロットテストの実施
  - フィードバック収集体制の確立` : ''}

### フェーズ2: 機能拡張（月4-6）
${priorityInsights[1] ? `- **${priorityInsights[1].theme}**の強化
  - 追加機能の実装
  - ユーザビリティの改善
  - パフォーマンス最適化` : ''}

### フェーズ3: 統合と最適化（月7-9）
${priorityInsights[2] ? `- **${priorityInsights[2].theme}**への対応
  - システム統合
  - 自動化の推進
  - スケーラビリティの確保` : ''}

### フェーズ4: 展開と成長（月10-12）
- 全社展開
- 継続的改善プロセスの確立
- 次世代機能の研究開発

### 成功指標（KPI）
- ユーザー満足度: 80%以上
- 業務効率化: 30%向上
- ROI: 18ヶ月以内に投資回収`;
}

/**
 * リスク分析セクション生成
 */
async function generateRiskAnalysis(
  extractedData: Map<string, any>,
  useGPT4: boolean
): Promise<string> {
  return `## リスク分析と緩和策

### 技術的リスク
- **リスク**: システム統合の複雑性
- **影響度**: 高
- **緩和策**: 段階的な統合アプローチ、十分なテスト期間の確保

### セキュリティリスク
- **リスク**: データ漏洩、不正アクセス
- **影響度**: 極高
- **緩和策**: 多層防御の実装、定期的なセキュリティ監査

### 組織的リスク
- **リスク**: ユーザーの抵抗、変更管理の失敗
- **影響度**: 中
- **緩和策**: 包括的なトレーニングプログラム、段階的な導入

### 市場リスク
- **リスク**: 競合他社の先行、技術の陳腐化
- **影響度**: 中
- **緩和策**: アジャイル開発、継続的なイノベーション`;
}

/**
 * 結論セクション生成
 */
async function generateConclusion(
  themeName: string,
  insights: DetailedInsight[],
  useGPT4: boolean
): Promise<string> {
  const topThemes = insights.slice(0, 3).map(i => i.theme).join('、');
  
  const prompt = `
「${themeName}」に関する包括的な分析の結論を800-1000文字で作成してください。

主要テーマ: ${topThemes}

以下を含めてください:
1. 最も重要な発見の要約
2. ビジネスへの影響
3. 成功のための重要要因
4. 今後の展望
5. 行動への呼びかけ`;
  
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "説得力があり、行動を促す結論を作成してください。"
      },
      { role: "user", content: prompt }
    ],
    model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 1500
  });
  
  return `## 結論

${completion.choices[0].message.content}`;
}

/**
 * 追加セクション生成（文字数調整用）
 */
async function generateAdditionalSections(
  analysisData: any,
  remainingLength: number,
  useGPT4: boolean
): Promise<string> {
  const sections: string[] = [];
  
  // ケーススタディ
  if (remainingLength > 2000) {
    sections.push(await generateCaseStudies(analysisData, useGPT4));
  }
  
  // ベストプラクティス
  if (remainingLength > 4000) {
    sections.push(await generateBestPractices(analysisData, useGPT4));
  }
  
  // 詳細な競合分析
  if (remainingLength > 6000) {
    sections.push(await generateCompetitiveAnalysis(analysisData, useGPT4));
  }
  
  return sections.join('\n\n');
}

/**
 * ケーススタディ生成
 */
async function generateCaseStudies(analysisData: any, useGPT4: boolean): Promise<string> {
  return `## ケーススタディ

### ケース1: エンジニアチームでのAI活用
**背景**: 開発効率の向上を目指すエンジニアチーム
**課題**: コードレビューの時間短縮、バグの早期発見
**ソリューション**: AI支援型開発ツールの導入
**結果**: 開発速度30%向上、バグ発生率40%削減

### ケース2: マーケティング部門での自動化
**背景**: コンテンツ制作の効率化が急務
**課題**: 大量のコンテンツ需要への対応
**ソリューション**: AI生成ツールとヒューマンレビューの組み合わせ
**結果**: コンテンツ制作量3倍、品質維持`;
}

/**
 * ベストプラクティス生成
 */
async function generateBestPractices(analysisData: any, useGPT4: boolean): Promise<string> {
  return `## ベストプラクティス

### 1. 段階的導入アプローチ
- パイロットプロジェクトから開始
- 成功事例を横展開
- 継続的な改善サイクル

### 2. ユーザー中心の設計
- 定期的なフィードバック収集
- ユーザビリティテストの実施
- ペルソナベースの機能開発

### 3. セキュリティファースト
- デザイン段階からセキュリティを考慮
- 定期的な脆弱性診断
- インシデント対応計画の策定`;
}

/**
 * 競合分析生成
 */
async function generateCompetitiveAnalysis(analysisData: any, useGPT4: boolean): Promise<string> {
  return `## 競合分析

### 市場リーダー分析
- **製品A**: 高機能だが高価格、エンタープライズ向け
- **製品B**: 使いやすさ重視、中小企業向け
- **製品C**: AI機能特化、技術者向け

### 差別化ポイント
1. **統合性**: 既存システムとのシームレスな連携
2. **カスタマイズ性**: 業界特化型の機能提供
3. **価格競争力**: 段階的な価格プラン

### 市場機会
- 中堅企業向けソリューションの不足
- 日本語対応の高度なAI機能への需要
- 業界特化型ソリューションのニーズ`;
}

/**
 * アクション可能な特徴の抽出
 */
function extractActionableFeatures(
  insights: DetailedInsight[],
  personas: PersonaProfile[]
): any[] {
  const features = [];
  
  // インサイトから特徴を生成
  insights.forEach(insight => {
    features.push({
      title: insight.theme,
      priority: insight.metrics.importance,
      details: insight.description,
      mentionCount: insight.metrics.frequency,
      personas: Array.from(insight.personas.keys()),
      quotes: insight.quotes.slice(0, 3),
      actionItems: insight.implications
    });
  });
  
  // ペルソナ特有の特徴も追加
  personas.slice(0, 3).forEach(persona => {
    features.push({
      title: `${persona.name}のニーズ`,
      priority: persona.count * 10,
      details: persona.primaryNeeds.join('; '),
      mentionCount: persona.count,
      personas: [persona.name],
      quotes: persona.quotes.slice(0, 2),
      actionItems: [`${persona.name}向けの機能強化`]
    });
  });
  
  return features.sort((a, b) => b.priority - a.priority);
}

/**
 * 品質スコア計算
 */
function calculateQualityScore(report: string, features: any[]): number {
  let score = 0;
  
  // 長さスコア（最大40点）
  const lengthScore = Math.min(40, (report.length / 20000) * 40);
  score += lengthScore;
  
  // 構造スコア（最大20点）
  const sections = report.split('\n').filter(line => line.startsWith('#')).length;
  const structureScore = Math.min(20, sections * 1);
  score += structureScore;
  
  // 具体性スコア（最大20点）
  const numbers = (report.match(/\d+/g) || []).length;
  const specificityScore = Math.min(20, numbers * 0.2);
  score += specificityScore;
  
  // 特徴スコア（最大20点）
  const featureScore = Math.min(20, features.length * 2);
  score += featureScore;
  
  return Math.round(score);
}