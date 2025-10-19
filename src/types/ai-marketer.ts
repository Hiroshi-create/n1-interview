/**
 * AI Marketer 関連の型定義
 */

import { Timestamp } from 'firebase/firestore';

/**
 * チャットセッション
 */
export interface ChatSession {
  sessionId: string;
  themeId: string;
  userId: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  metadata: {
    themeName: string;
    totalInterviews: number;
    reportSummary: string; // サマリーレポートの要約（最初の1000文字）
    keyFindings: string[]; // 主要な発見事項
    personas: string[]; // 主要ペルソナリスト
  };
  status: 'active' | 'archived';
}

/**
 * チャットメッセージ
 */
export interface ChatMessage {
  messageId: string;
  sessionId: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Timestamp | Date;
  metadata?: {
    tokens?: number;
    model?: string;
    context?: string[];
    processingTime?: number;
    error?: string;
  };
  read?: boolean;
}

/**
 * AI コンテキスト
 */
export interface AIContext {
  themeId: string;
  themeName: string;
  summaryReport: {
    full: string;
    summary: string;
    keyPoints: string[];
  };
  statistics: {
    totalInterviews: number;
    totalReportLength: number;
    personas: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
    keyThemes: Array<{
      theme: string;
      mentions: number;
    }>;
  };
  features: Array<{
    title: string;
    priority: number;
    details: string;
  }>;
  timestamp: Date;
}

/**
 * チャットリクエスト
 */
export interface ChatRequest {
  sessionId?: string;
  themeId: string;
  userId: string;
  message: string;
  context?: {
    includeFullReport?: boolean;
    focusArea?: 'marketing' | 'psychology' | 'strategy' | 'general';
  };
}

/**
 * チャットレスポンス
 */
export interface ChatResponse {
  messageId: string;
  sessionId: string;
  response: string;
  suggestions?: string[]; // 次の質問の提案
  references?: Reference[]; // 参照したデータ
  metadata?: {
    model: string;
    tokens: number;
    processingTime: number;
  };
}

/**
 * 参照情報
 */
export interface Reference {
  type: 'report' | 'statistic' | 'persona' | 'feature';
  title: string;
  content: string;
  relevance: number; // 0-1の関連性スコア
}

/**
 * セッション作成リクエスト
 */
export interface CreateSessionRequest {
  themeId: string;
  userId: string;
  themeName: string;
}

/**
 * セッションレスポンス
 */
export interface SessionResponse {
  sessionId: string;
  session: ChatSession;
  recentMessages?: ChatMessage[];
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}