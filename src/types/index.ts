/**
 * 統合型定義ファイル
 * プロジェクト全体で使用する型定義を一元管理
 */

// Re-export all types from individual files
export type { User } from '../stores/User';
export type { Theme } from '../stores/Theme';
export type { Client } from '../stores/Client';
export type { Interviews } from '../stores/Interviews';
export type { Message } from '../stores/Message';
export type { IndividualReport } from '../stores/IndividualReport';
export type { ClusteringData } from '../stores/ClusteringData';
export type { GuestUser } from '../stores/GuestUser';
export type { LipSync } from '../stores/LipSync';
export type { ManageThemes } from '../stores/ManageThemes';
export type { SelectedSubscription } from '../stores/SelectedSubscription';
export type { SubscriptionPlans } from '../stores/SubscriptionPlans';
export type { SummryReport as SummaryReport } from '../stores/SummryReport';
export type { Tenants } from '../stores/Tenants';
export type { AnswerInterviews } from '../stores/AnswerInterviews';

// Common interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  code?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

// Auth related types
export interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

// Interview related types
export interface InterviewPhase {
  template: string;
  text: string;
  isChecked: boolean;
  type: 'two_choices' | 'free_response' | 'one_choice' | 'interview_complete';
}

export interface InterviewMessage {
  text: string;
  audio: string;
  lipsync: any;
  facialExpression: string;
  animation: string;
}

// API Request/Response types
export interface CreateThemeRequest {
  theme: string;
  deadline: string;
  isPublic: boolean;
  interviewDurationMin: number;
  maximumNumberOfInterviews: number;
}

export interface CreateInterviewRequest {
  themeId: string;
  userId: string;
  isOperationCheck?: boolean;
}

export interface TranscribeRequest {
  file: File;
  themeId: string;
}

export interface InterviewServerRequest {
  message: string;
  selectThemeName: string;
  interviewRefPath: string;
  phases: InterviewPhase[];
  isInterviewEnded: boolean;
}

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    users: number;
    storage: number;
    interviews: number;
  };
}

// Report types
export interface ReportData {
  id: string;
  createdAt: Date;
  themeId: string;
  interviewIds: string[];
  summary: string;
  insights: string[];
  visualizations: any[];
}