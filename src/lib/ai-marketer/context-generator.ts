/**
 * AI Marketer用のコンテキスト生成モジュール
 */

import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import type { AIContext } from '@/types/ai-marketer';

/**
 * サマリーレポートからAIコンテキストを生成
 */
export class ContextGenerator {
  private themeId: string;
  
  constructor(themeId: string) {
    this.themeId = themeId;
  }

  /**
   * 完全なコンテキストを生成
   */
  async generateContext(): Promise<AIContext> {
    try {
      logger.info('ContextGenerator: コンテキスト生成開始', { themeId: this.themeId });

      // サマリーレポートを取得
      const summaryReport = await this.fetchSummaryReport();
      if (!summaryReport) {
        throw new Error('サマリーレポートが見つかりません');
      }

      // テーマ情報を取得
      const themeDoc = await adminDb.doc(`themes/${this.themeId}`).get();
      const themeData = themeDoc.data();
      if (!themeData) {
        throw new Error('テーマ情報が見つかりません');
      }

      // レポートから重要な情報を抽出
      const keyPoints = this.extractKeyPoints(summaryReport.report);
      const summary = this.createSummary(summaryReport.report);
      const statistics = this.extractStatistics(summaryReport);

      const context: AIContext = {
        themeId: this.themeId,
        themeName: themeData.theme || 'テーマ名不明',
        summaryReport: {
          full: summaryReport.report,
          summary,
          keyPoints
        },
        statistics,
        features: summaryReport.features || [],
        timestamp: new Date()
      };

      logger.info('ContextGenerator: コンテキスト生成完了', {
        themeId: this.themeId,
        keyPointsCount: keyPoints.length,
        summaryLength: summary.length
      });

      return context;
    } catch (error) {
      logger.error('ContextGenerator: エラー', error as Error);
      throw error;
    }
  }

  /**
   * サマリーレポートを取得
   */
  private async fetchSummaryReport(): Promise<any> {
    const summaryReportRef = adminDb.collection(`themes/${this.themeId}/summaryReport`);
    const snapshot = await summaryReportRef.get();
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0].data();
  }

  /**
   * レポートから重要ポイントを抽出
   */
  private extractKeyPoints(report: string): string[] {
    const keyPoints: string[] = [];
    const lines = report.split('\n');
    
    // セクション見出しと重要な段落を抽出
    lines.forEach((line, index) => {
      // 見出し行を検出
      if (line.startsWith('##') && !line.startsWith('###')) {
        const heading = line.replace(/^#+\s*/, '').trim();
        if (heading && !heading.includes('概要') && !heading.includes('結論')) {
          keyPoints.push(heading);
        }
      }
      
      // 数値を含む重要な行を検出
      if (line.includes('%') || line.match(/\d+名/) || line.match(/\d+件/)) {
        const trimmed = line.trim();
        if (trimmed.length > 20 && trimmed.length < 200) {
          keyPoints.push(trimmed);
        }
      }
      
      // 箇条書きの重要項目
      if (line.match(/^[-・]\s*(.+)/) && line.length > 30) {
        const content = line.replace(/^[-・]\s*/, '').trim();
        if (content.includes('重要') || content.includes('必要') || content.includes('期待')) {
          keyPoints.push(content);
        }
      }
    });
    
    // 重複を除去して最大20個まで
    return [...new Set(keyPoints)].slice(0, 20);
  }

  /**
   * レポートの要約を作成
   */
  private createSummary(report: string): string {
    // レポートの最初の部分と主要セクションを抽出
    const lines = report.split('\n');
    const summaryLines: string[] = [];
    let currentSection = '';
    let sectionCount = 0;
    
    for (const line of lines) {
      // セクション見出し
      if (line.startsWith('##') && !line.startsWith('###')) {
        currentSection = line;
        if (sectionCount < 3) {
          summaryLines.push(line);
          sectionCount++;
        }
      }
      // 各セクションの最初の段落を含める
      else if (currentSection && line.trim().length > 50 && summaryLines.length < 30) {
        summaryLines.push(line);
        currentSection = ''; // 次のセクションまでスキップ
      }
    }
    
    // 最大2000文字に制限
    const summary = summaryLines.join('\n');
    return summary.length > 2000 ? summary.substring(0, 2000) + '...' : summary;
  }

  /**
   * 統計情報を抽出
   */
  private extractStatistics(summaryReport: any): AIContext['statistics'] {
    const report = summaryReport.report || '';
    const features = summaryReport.features || [];
    
    // ペルソナ分布を取得
    const personaDistribution = summaryReport.personaDistribution || [];
    const totalInterviews = summaryReport.totalInterviews || 0;
    
    const personas = personaDistribution.map((p: any) => ({
      name: p.persona || p.name || '不明',
      count: p.count || 0,
      percentage: totalInterviews > 0 ? Math.round((p.count / totalInterviews) * 100) : 0
    }));
    
    // キーテーマを特徴から抽出
    const keyThemes = features
      .filter((f: any) => f.mentionCount > 0)
      .map((f: any) => ({
        theme: f.title,
        mentions: f.mentionCount || 0
      }))
      .sort((a: any, b: any) => b.mentions - a.mentions)
      .slice(0, 10);
    
    return {
      totalInterviews,
      totalReportLength: report.length,
      personas,
      keyThemes
    };
  }

  /**
   * 特定のトピックに関連する情報を抽出
   */
  async extractTopicContext(topic: string): Promise<string[]> {
    try {
      const fullContext = await this.generateContext();
      const relevantPoints: string[] = [];
      
      // トピックに関連するキーポイントを検索
      const topicLower = topic.toLowerCase();
      
      fullContext.summaryReport.keyPoints.forEach(point => {
        if (point.toLowerCase().includes(topicLower)) {
          relevantPoints.push(point);
        }
      });
      
      // 特徴から関連情報を検索
      fullContext.features.forEach(feature => {
        if (feature.title.toLowerCase().includes(topicLower) ||
            feature.details.toLowerCase().includes(topicLower)) {
          relevantPoints.push(`${feature.title}: ${feature.details}`);
        }
      });
      
      return relevantPoints.slice(0, 5); // 最大5個まで
    } catch (error) {
      logger.error('extractTopicContext: エラー', error as Error);
      return [];
    }
  }
}