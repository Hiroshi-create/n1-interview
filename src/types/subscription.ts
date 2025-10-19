/**
 * サブスクリプション関連の型定義
 */

export interface PlanLimits {
  interview_monthly: number;
  interview_concurrent: number;
  interview_duration_seconds: number;
  theme_max: number;
  user_max: number;
  export_monthly: number;
  report_individual_monthly: number;
  report_summary_monthly: number;
  clustering_monthly: number;
  data_retention_days: number;
  api_calls_per_day?: number;        // APIレート制限（追加）
  storage_gb?: number;                // ストレージ容量（追加）
}

export interface SubscriptionPlan {
  name: string;
  limits: PlanLimits;
  features?: string[];                 // プランの機能リスト
  price?: number;                      // 価格
  description?: string;                 // プランの説明
  popular?: boolean;                    // 人気プランフラグ
  customLimits?: Partial<PlanLimits>;  // 組織ごとのカスタム制限
}

export interface SubscriptionLimits {
  [planId: string]: SubscriptionPlan;
}

export interface UsageData {
  month: string;
  interviews: number;
  exports: number;
  reports_individual: number;
  reports_summary: number;
  clustering: number;
  themes: number;
  users: number;
  last_updated: any; // Firebase Timestamp
  metadata?: Record<string, any>;      // 追加のメタデータ
}

export interface ConcurrentUsage {
  interviews: number;
  last_updated: any; // Firebase Timestamp
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  planName?: string;
  percentage?: number;                 // 使用率
  willResetAt?: Date;                  // リセット予定日
}

export type MetricType = 
  | 'interview_monthly'
  | 'interview_concurrent'
  | 'interview_duration_seconds'
  | 'theme_max'
  | 'user_max'
  | 'export_monthly'
  | 'report_individual_monthly'
  | 'report_summary_monthly'
  | 'clustering_monthly'
  | 'data_retention_days'
  | 'api_calls_per_day'
  | 'storage_gb';

export interface LimitError {
  error: 'usage_limit_exceeded';
  message: string;
  details: {
    feature: string;
    limit: number;
    current: number;
    remaining: number;
    upgradeUrl: string;
  };
}

// ============ 新しい型定義の追加 ============

/**
 * 使用統計の詳細情報
 */
export interface UsageStats {
  organizationId: string;
  planId: string;
  planName: string;
  currentUsage: Record<string, number>;
  limits: Record<string, number>;
  percentages: Record<string, number>;
  lastReset: Date;
  nextReset: Date;
  history?: UsageHistoryEntry[];
  alerts?: UsageAlert[];
  trends?: UsageTrend[];
}

/**
 * 使用履歴エントリ
 */
export interface UsageHistoryEntry {
  id: string;
  timestamp: Date;
  feature: string;
  action: 'increment' | 'decrement' | 'reset';
  amount: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * 使用量アラート
 */
export interface UsageAlert {
  id: string;
  feature: string;
  threshold: number;
  currentPercentage: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * 使用量の傾向分析
 */
export interface UsageTrend {
  feature: string;
  period: 'daily' | 'weekly' | 'monthly';
  trend: 'increasing' | 'stable' | 'decreasing';
  averageUsage: number;
  projectedUsage: number;
  willExceedAt?: Date;
}

/**
 * サブスクリプションステータス
 */
export interface SubscriptionStatus {
  organizationId: string;
  currentPlan: SubscriptionPlan;
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended';
  billingCycle: 'monthly' | 'yearly' | 'custom';
  nextBillingDate: Date;
  paymentMethod?: string;
  autoRenew: boolean;
  trialEndsAt?: Date;
  cancellationDate?: Date;
  suspensionReason?: string;
}

/**
 * 通知設定
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  thresholds: number[]; // パーセンテージ（例: [50, 80, 90, 100]）
  recipients: NotificationRecipient[];
  webhookUrl?: string;
  slackWebhookUrl?: string;
  emailTemplate?: string;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'in-app';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationRecipient {
  id: string;
  type: 'user' | 'role' | 'email';
  value: string;
  preferences?: {
    minSeverity: 'info' | 'warning' | 'critical';
    features?: string[];
  };
}

/**
 * カスタム制限ルール
 */
export interface CustomRule {
  id: string;
  name: string;
  description: string;
  type: 'time_based' | 'user_based' | 'conditional' | 'rate_limit' | 'quota';
  active: boolean;
  priority: number;
  config: CustomRuleConfig;
  appliesTo: string[]; // 適用される機能のリスト
  createdAt: Date;
  createdBy: string;
  modifiedAt?: Date;
  modifiedBy?: string;
}

export interface CustomRuleConfig {
  // Time-based rules
  blockedHours?: number[];
  blockedDays?: string[];
  timezone?: string;
  allowedTimeRanges?: TimeRange[];
  
  // User-based rules
  allowedUsers?: string[];
  blockedUsers?: string[];
  userGroups?: string[];
  requiredRoles?: string[];
  
  // Conditional rules
  condition?: string; // JavaScript式として評価
  parameters?: Record<string, any>;
  
  // Rate limit rules
  maxRequests?: number;
  timeWindow?: number; // 秒単位
  burstLimit?: number;
  
  // Quota rules
  quotaAmount?: number;
  quotaPeriod?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  quotaScope?: 'user' | 'organization' | 'global';
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  days?: string[]; // ['monday', 'tuesday', ...]
}

/**
 * プラン移行管理
 */
export interface PlanMigration {
  id: string;
  organizationId: string;
  fromPlan: string;
  toPlan: string;
  scheduledAt: Date;
  effectiveAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  rollbackPlan?: string;
  migrationSteps?: MigrationStep[];
  metadata?: Record<string, any>;
  error?: string;
}

export interface MigrationStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * 使用量クォータ
 */
export interface UsageQuota {
  feature: string;
  allocated: number;
  used: number;
  reserved: number;
  available: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'none';
  expiresAt?: Date;
  autoRenew: boolean;
  overageAllowed: boolean;
  overageRate?: number;
}

/**
 * 課金情報
 */
export interface BillingInfo {
  organizationId: string;
  customerId: string;
  subscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  discount?: BillingDiscount;
  invoices?: Invoice[];
  paymentMethods?: PaymentMethod[];
  balance: number;
  currency: string;
}

export interface BillingDiscount {
  coupon: string;
  percentOff?: number;
  amountOff?: number;
  duration: 'forever' | 'once' | 'repeating';
  durationInMonths?: number;
  validUntil?: Date;
}

export interface Invoice {
  id: string;
  date: Date;
  amount: number;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  items: InvoiceItem[];
  pdfUrl?: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity: number;
  unitPrice: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'invoice';
  isDefault: boolean;
  details: Record<string, any>;
}

/**
 * 機能フラグ
 */
export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number;
  enabledForOrganizations?: string[];
  disabledForOrganizations?: string[];
  metadata?: Record<string, any>;
  conditions?: FeatureFlagCondition[];
}

export interface FeatureFlagCondition {
  type: 'plan' | 'organization' | 'user' | 'date' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

/**
 * API レスポンス用の型
 */
export interface SubscriptionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  usage?: UsageCheckResult;
  suggestions?: string[];
}