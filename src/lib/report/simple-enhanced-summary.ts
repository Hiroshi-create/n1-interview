/**
 * シンプルで高品質なサマリーレポート生成
 * 60件の個別レポートから効率的に詳細なサマリーを生成
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

/**
 * シンプルな高品質サマリー生成
 */
export async function generateSimpleEnhancedSummary(
  themeName: string,
  reports: IndividualReport[],
  options: {
    useGPT4?: boolean;
  } = {}
): Promise<{
  report: string;
  features: any[];
  metadata: any;
}> {
  const { useGPT4 = false } = options;

  logger.info('simple-enhanced-summary: 生成開始', {
    totalReports: reports.length,
    useGPT4
  });

  try {
    // Step 1: レポートから重要情報を抽出
    const summaries = extractReportSummaries(reports);
    
    // Step 2: ペルソナ分析
    const personaAnalysis = analyzePersonas(reports);
    
    // Step 3: キーテーマの抽出
    const keyThemes = extractKeyThemes(summaries);
    
    // Step 4: 統計情報の生成
    const statistics = generateStatistics(reports);
    
    // Step 5: 最終レポート生成（複数セクション）- 大幅拡張版
    const finalReport = await generateExpandedFinalReport(
      themeName,
      {
        summaries,
        personaAnalysis,
        keyThemes,
        statistics,
        rawReports: reports
      },
      reports.length,
      useGPT4
    );
    
    // Step 6: 特徴の構造化
    const features = structureFeatures(keyThemes, personaAnalysis);
    
    return {
      report: finalReport,
      features,
      metadata: {
        totalReports: reports.length,
        reportLength: finalReport.length,
        uniquePersonas: personaAnalysis.personas.size,
        keyThemesCount: keyThemes.length,
        qualityScore: calculateQualityScore(finalReport)
      }
    };
    
  } catch (error) {
    logger.error('simple-enhanced-summary: エラー', error as Error);
    throw error;
  }
}

/**
 * 各レポートから要約を抽出
 */
function extractReportSummaries(reports: IndividualReport[]): string[] {
  return reports.map(report => {
    const persona = `${report.userInfo.occupation || '不明'}（${report.userInfo.age || '?'}・${report.userInfo.gender || '?'}）`;
    
    // レポートから重要部分を抽出（各セクションの最初の部分）
    const lines = report.report.split('\n');
    const importantLines: string[] = [];
    let inImportantSection = false;
    
    lines.forEach(line => {
      if (line.includes('主要な発見') || line.includes('要望') || line.includes('結論')) {
        inImportantSection = true;
      }
      if (inImportantSection && line.trim() && importantLines.length < 10) {
        importantLines.push(line);
      }
      if (line.startsWith('#') && importantLines.length > 5) {
        inImportantSection = false;
      }
    });
    
    // 重要部分がない場合は冒頭を使用
    const summary = importantLines.length > 0 
      ? importantLines.join(' ').substring(0, 1000)
      : report.report.substring(0, 1000);
    
    return `【${persona}】${summary}`;
  });
}

/**
 * ペルソナ分析
 */
function analyzePersonas(reports: IndividualReport[]): any {
  const personas = new Map<string, any>();
  
  reports.forEach(report => {
    const occupation = report.userInfo.occupation || '不明';
    
    if (!personas.has(occupation)) {
      personas.set(occupation, {
        count: 0,
        ages: [],
        genders: [],
        reportLengths: []
      });
    }
    
    const persona = personas.get(occupation)!;
    persona.count++;
    persona.ages.push(report.userInfo.age || '不明');
    persona.genders.push(report.userInfo.gender || '不明');
    persona.reportLengths.push(report.report.length);
  });
  
  // 上位ペルソナを取得
  const topPersonas = Array.from(personas.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      count: data.count,
      averageReportLength: Math.round(
        data.reportLengths.reduce((a: number, b: number) => a + b, 0) / data.reportLengths.length
      )
    }));
  
  return {
    personas,
    topPersonas
  };
}

/**
 * キーテーマの抽出
 */
function extractKeyThemes(summaries: string[]): string[] {
  const allText = summaries.join(' ');
  const themes: Map<string, number> = new Map();
  
  // 重要キーワードとその出現回数をカウント
  const keywords = [
    'AI', '自動化', '効率', 'セキュリティ', 'プライバシー',
    'コスト', '価格', 'UI', 'UX', '統合', 'カスタマイズ',
    '倫理', '透明性', 'データ', '分析', 'リアルタイム',
    'クラウド', 'API', '機械学習', 'サポート'
  ];
  
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = allText.match(regex) || [];
    if (matches.length > 0) {
      themes.set(keyword, matches.length);
    }
  });
  
  // 頻出順にソート
  return Array.from(themes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme, count]) => `${theme}（${count}回言及）`);
}

/**
 * 統計情報の生成
 */
function generateStatistics(reports: IndividualReport[]): any {
  const stats = {
    totalReports: reports.length,
    totalCharacters: 0,
    averageReportLength: 0,
    personaDistribution: new Map<string, number>(),
    ageDistribution: new Map<string, number>(),
    genderDistribution: new Map<string, number>()
  };
  
  reports.forEach(report => {
    stats.totalCharacters += report.report.length;
    
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
  
  stats.averageReportLength = Math.round(stats.totalCharacters / reports.length);
  
  return stats;
}

/**
 * 拡張版最終レポート生成 - より詳細で包括的な内容
 */
async function generateExpandedFinalReport(
  themeName: string,
  data: any,
  totalReports: number,
  useGPT4: boolean
): Promise<string> {
  const { summaries, personaAnalysis, keyThemes, statistics, rawReports } = data;
  
  // セクション1: エグゼクティブサマリー（拡張版）
  const executiveSummary = await generateSection(
    'エグゼクティブサマリー',
    `${themeName}に関する${totalReports}件のインタビュー分析結果の包括的な要約を2000-2500文字で作成してください。
主要テーマ: ${keyThemes.slice(0, 7).join('、')}
主要ペルソナ: ${personaAnalysis.topPersonas.slice(0, 7).map((p: any) => p.name).join('、')}

以下の内容を必ず含めて詳細に記述してください：
1. 最重要の発見5点（各200文字以上で具体的に）
2. 全体的な傾向と市場の状況（300文字以上）
3. ペルソナ間の詳細な共通点と相違点（400文字以上）
4. ビジネスへの具体的な示唆とROI予測（300文字以上）
5. 競合環境と差別化ポイント（200文字以上）

具体的な数値やパーセンテージを多用し、実例を挙げてください。`,
    useGPT4,
    2500
  );
  
  // セクション2: 調査概要
  const methodology = generateMethodologySection(statistics, personaAnalysis);
  
  // セクション3: 主要な発見（全データから生成）
  const keyFindings = await generateSection(
    '主要な発見事項',
    `以下のサマリーから主要な発見事項を3000-3500文字で極めて詳細に整理してください。
各発見について以下を必ず含めてください：
1. 具体的なエビデンス（数値・引用含む）
2. ビジネスインパクトの定量評価
3. 実装優先度とタイムライン
4. 期待されるROIまたは効果
5. リスクと対策

サマリーデータ：
${summaries.slice(0, 30).join('\n')}`,
    useGPT4,
    3500
  );
  
  // セクション4: ペルソナ分析
  const personaSection = generatePersonaSection(personaAnalysis);
  
  // セクション5: テーマ別分析（拡張版）
  const thematicAnalysis = await generateSection(
    'テーマ別分析',
    `以下のキーテーマについて極めて詳細な分析を2500-3000文字で提供してください。
各テーマについて以下を必ず含めてください：
1. テーマの背景と市場での重要性（200文字以上）
2. 具体的な要求仕様と機能要件（300文字以上）
3. 実装の技術的課題と解決策（200文字以上）
4. 競合他社の対応状況（150文字以上）
5. 実装優先度とKPI（150文字以上）

キーテーマ：
${keyThemes.join('\n')}`,
    useGPT4,
    3000
  );
  
  // セクション6: 統計的洞察
  const statisticalInsights = generateStatisticalSection(statistics);
  
  // 追加セクション: 詳細なペルソナ別ニーズ分析
  const detailedPersonaNeeds = await generateSection(
    'ペルソナ別詳細ニーズ分析',
    `以下のペルソナグループごとに、詳細なニーズと要望を2000-2500文字で分析してください。
各ペルソナについて以下を含めてください：
1. 現在の課題と痛点（200文字以上）
2. 期待する解決策（200文字以上）
3. 予算感と購買決定要因（150文字以上）
4. 競合製品の評価（150文字以上）
5. 導入障壁と懸念事項（150文字以上）

主要ペルソナ：
${personaAnalysis.topPersonas.slice(0, 5).map((p: any) => 
  `${p.name}（${p.count}名）- 平均レポート長: ${p.averageReportLength}文字`
).join('\n')}

参考データ：
${summaries.slice(0, 20).join('\n').substring(0, 3000)}`,
    useGPT4,
    2500
  );
  
  // 追加セクション: 市場機会分析
  const marketOpportunities = await generateSection(
    '市場機会と成長ポテンシャル',
    `${themeName}に関する市場機会を1500-2000文字で詳細に分析してください。
以下を必ず含めてください：
1. 未満足ニーズと市場ギャップ（300文字）
2. 成長ポテンシャルの定量評価（300文字）
3. 参入障壁とリスク分析（300文字）
4. 早期参入の優位性（300文字）
5. 推定市場規模とシェア目標（300文字）

キーテーマ: ${keyThemes.slice(0, 8).join('、')}
総インタビュー数: ${totalReports}件`,
    useGPT4,
    2000
  );
  
  // セクション7: 推奨事項（詳細版）
  const recommendations = await generateSection(
    '戦略的推奨事項',
    `${themeName}に関して、以下の情報に基づいて極めて具体的な推奨事項を3500-4000文字で作成してください。

以下の構成で詳細に作成：
1. 即座に実施すべきアクション（Quick Wins）- 5項目以上、各150文字
2. 短期施策（3-6ヶ月）- 4項目以上、各200文字
3. 中期施策（6-12ヶ月）- 3項目以上、各250文字
4. 長期戦略（1年以上）- 3項目以上、各250文字

各項目に必ず含める内容：
- 具体的なアクション内容
- 必要なリソース（人員・予算）
- 定量的KPIと測定方法
- 期待される効果（数値目標含む）
- リスクと対策
- 成功事例または参考事例

主要課題: ${keyThemes.slice(0, 5).join('、')}
対象ペルソナ: ${personaAnalysis.topPersonas.slice(0, 5).map((p: any) => p.name).join('、')}`,
    useGPT4,
    4000
  );
  
  // セクション8: 結論（包括版）
  const conclusion = await generateSection(
    '結論と今後の展望',
    `${themeName}に関する分析の包括的な結論を2000-2500文字でまとめてください。

以下の内容を詳細に含めてください：
1. 最も重要な発見の詳細な要約（400文字）
2. ビジネスへの短期・中期・長期的影響（400文字）
3. 成功のための重要成功要因（CSF）とKPI（400文字）
4. 市場トレンドと今後3年間の展望（400文字）
5. 競合優位性の構築方法（300文字）
6. 次のステップと具体的な行動計画（300文字）
7. 経営層への提言（200文字）`,
    useGPT4,
    2500
  );
  
  // レポートの組み立て（大幅拡張版）
  const report = `# ${themeName} - 包括的インタビュー分析レポート

## エグゼクティブサマリー
${executiveSummary}

${methodology}

## 主要な発見事項
${keyFindings}

${personaSection}

## ペルソナ別詳細ニーズ分析
${detailedPersonaNeeds}

## テーマ別分析
${thematicAnalysis}

## 市場機会と成長ポテンシャル
${marketOpportunities}

${statisticalInsights}

## 戦略的推奨事項
${recommendations}

## 結論と今後の展望
${conclusion}

---
*このレポートは${totalReports}件のインタビューデータを基に、最新のAI分析技術を用いて自動生成されました。*
*生成日時: ${new Date().toLocaleString('ja-JP')}*`;
  
  return report;
}

/**
 * セクション生成（GPT使用）
 */
async function generateSection(
  title: string,
  prompt: string,
  useGPT4: boolean,
  maxTokens: number = 1000
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "簡潔で洞察に富んだビジネスレポートを作成してください。"
        },
        { role: "user", content: prompt }
      ],
      model: useGPT4 ? "gpt-4-turbo-preview" : "gpt-3.5-turbo-16k",
      temperature: 0.8, // Slightly higher for more creative and detailed responses
      max_tokens: maxTokens,
      presence_penalty: 0.2, // Encourage diverse content
      frequency_penalty: 0.1 // Reduce repetition
    });
    
    return completion.choices[0].message.content || '';
  } catch (error) {
    logger.error(`セクション生成エラー: ${title}`, error as Error);
    return `[${title}の生成に失敗しました]`;
  }
}

/**
 * 方法論セクション生成
 */
function generateMethodologySection(statistics: any, personaAnalysis: any): string {
  const personaList = personaAnalysis.topPersonas
    .map((p: any) => `${p.name}(${p.count}名)`)
    .join('、');
  
  const ageList = Array.from(statistics.ageDistribution.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([age, count]) => `${age}: ${count}名`)
    .join('、');
  
  return `## 調査概要と方法論

### 調査規模
- **総インタビュー数**: ${statistics.totalReports}件
- **総文字数**: ${statistics.totalCharacters.toLocaleString()}文字
- **平均レポート長**: ${statistics.averageReportLength.toLocaleString()}文字

### ペルソナ分布
${personaList}

### 年齢分布
${ageList}

### 分析手法
1. 全${statistics.totalReports}件のインタビューレポートの詳細分析
2. ペルソナ別のニーズと課題の抽出
3. テーマ別の横断的分析
4. 統計的傾向の把握`;
}

/**
 * ペルソナセクション生成
 */
function generatePersonaSection(personaAnalysis: any): string {
  let section = '## ペルソナ別分析\n\n';
  
  personaAnalysis.topPersonas.slice(0, 5).forEach((persona: any) => {
    section += `### ${persona.name} (${persona.count}名)\n`;
    section += `- **回答者数**: ${persona.count}名\n`;
    section += `- **平均レポート長**: ${persona.averageReportLength.toLocaleString()}文字\n`;
    section += `- **特徴**: ${persona.name}特有のニーズと課題\n\n`;
  });
  
  return section;
}

/**
 * 統計セクション生成
 */
function generateStatisticalSection(statistics: any): string {
  return `## 統計的洞察

### データ概要
- **総インタビュー数**: ${statistics.totalReports}件
- **総文字数**: ${statistics.totalCharacters.toLocaleString()}文字
- **平均レポート長**: ${statistics.averageReportLength.toLocaleString()}文字

### 性別分布
${Array.from(statistics.genderDistribution.entries())
  .map(([gender, count]) => `- ${gender}: ${count}名 (${Math.round(count / statistics.totalReports * 100)}%)`)
  .join('\n')}

### 年齢層分布
${Array.from(statistics.ageDistribution.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([age, count]) => `- ${age}: ${count}名 (${Math.round(count / statistics.totalReports * 100)}%)`)
  .join('\n')}`;
}

/**
 * 特徴の構造化
 */
function structureFeatures(keyThemes: string[], personaAnalysis: any): any[] {
  const features: any[] = [];
  
  // テーマを特徴として追加
  keyThemes.slice(0, 5).forEach((theme, index) => {
    features.push({
      title: theme.split('（')[0],
      priority: 100 - index * 10,
      details: theme,
      mentionCount: parseInt(theme.match(/\d+/)?.[0] || '0'),
      personas: personaAnalysis.topPersonas.slice(0, 3).map((p: any) => p.name)
    });
  });
  
  // ペルソナ特有の特徴も追加
  personaAnalysis.topPersonas.slice(0, 3).forEach((persona: any) => {
    features.push({
      title: `${persona.name}の特徴`,
      priority: persona.count * 2,
      details: `${persona.count}名の${persona.name}からの回答`,
      mentionCount: persona.count,
      personas: [persona.name]
    });
  });
  
  return features;
}

/**
 * 品質スコア計算
 */
function calculateQualityScore(report: string): number {
  const length = report.length;
  const sections = report.split('\n').filter(line => line.startsWith('#')).length;
  const numbers = (report.match(/\d+/g) || []).length;
  
  const lengthScore = Math.min(100, (length / 10000) * 100);
  const structureScore = Math.min(100, sections * 10);
  const specificityScore = Math.min(100, numbers * 2);
  
  return Math.round((lengthScore + structureScore + specificityScore) / 3);
}