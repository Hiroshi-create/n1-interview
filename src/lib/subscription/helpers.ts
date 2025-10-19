/**
 * サブスクリプション管理のヘルパー関数
 */

import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { LimitError } from '@/types/subscription';

/**
 * ユーザーIDから組織IDを取得
 */
export async function getOrganizationId(userId: string): Promise<string | null> {
  try {
    if (!userId) {
      return null;
    }

    const userDoc = await adminDb
      .collection('users')
      .doc(userId)
      .get();
    
    if (!userDoc.exists) {
      logger.warn('getOrganizationId: User not found', { userId });
      return null;
    }

    const userData = userDoc.data();
    
    // 組織に属していない場合
    if (!userData?.inOrganization || !userData?.organizationId) {
      logger.debug('getOrganizationId: User not in organization', { userId });
      return null;
    }
    
    return userData.organizationId;
  } catch (error) {
    logger.error('getOrganizationId: Failed to get organization ID', error as Error, {
      userId
    });
    return null;
  }
}

/**
 * 制限エラーオブジェクトを作成
 */
export function createLimitError(
  feature: string, 
  limit: number, 
  current: number,
  remaining: number = 0
): LimitError {
  const message = limit === 0 
    ? `この機能は現在のプランではご利用いただけません`
    : `${feature}の使用制限に達しました（${current}/${limit}）`;

  return {
    error: 'usage_limit_exceeded',
    message,
    details: {
      feature,
      limit,
      current,
      remaining,
      upgradeUrl: '/client-view/subscriptions'
    }
  };
}

/**
 * 機能名を日本語に変換
 */
export function getFeatureDisplayName(metric: string): string {
  const displayNames: Record<string, string> = {
    interview_monthly: '月間インタビュー回数',
    interview_concurrent: '同時実行インタビュー数',
    interview_duration_seconds: 'インタビュー時間',
    theme_max: 'テーマ作成数',
    user_max: '組織内ユーザー数',
    export_monthly: '月間エクスポート回数',
    report_individual_monthly: '月間個別レポート生成回数',
    report_summary_monthly: '月間サマリーレポート生成回数',
    clustering_monthly: '月間クラスタリング分析回数',
    data_retention_days: 'データ保存期間',
    interviews: 'インタビュー',
    exports: 'エクスポート',
    reports_individual: '個別レポート',
    reports_summary: 'サマリーレポート',
    clustering: 'クラスタリング分析',
    themes: 'テーマ',
    users: 'ユーザー'
  };

  return displayNames[metric] || metric;
}

/**
 * 時間制限を人間が読める形式に変換
 */
export function formatDuration(seconds: number): string {
  if (seconds === -1) {
    return '無制限';
  }
  
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}分${remainingSeconds}秒`
      : `${minutes}分`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0) {
    return `${hours}時間${remainingMinutes}分`;
  }
  
  return `${hours}時間`;
}

/**
 * 使用率をパーセンテージで取得
 */
export function getUsagePercentage(current: number, limit: number): number {
  if (limit === -1 || limit === 0) {
    return 0;
  }
  
  const percentage = (current / limit) * 100;
  return Math.min(100, Math.round(percentage));
}

/**
 * 使用率に基づいた警告レベルを取得
 */
export function getUsageWarningLevel(
  current: number, 
  limit: number
): 'normal' | 'warning' | 'danger' | 'exceeded' {
  if (limit === -1) {
    return 'normal';
  }
  
  const percentage = getUsagePercentage(current, limit);
  
  if (percentage >= 100) {
    return 'exceeded';
  }
  if (percentage >= 90) {
    return 'danger';
  }
  if (percentage >= 70) {
    return 'warning';
  }
  
  return 'normal';
}

/**
 * 残り使用可能数のメッセージを生成
 */
export function getRemainingMessage(
  feature: string,
  remaining: number,
  limit: number
): string {
  const featureName = getFeatureDisplayName(feature);
  
  if (limit === -1) {
    return `${featureName}: 無制限`;
  }
  
  if (remaining <= 0) {
    return `${featureName}の使用制限に達しました`;
  }
  
  if (remaining === 1) {
    return `${featureName}はあと1回使用できます`;
  }
  
  if (remaining <= 5) {
    return `${featureName}はあと${remaining}回使用できます（残りわずか）`;
  }
  
  return `${featureName}はあと${remaining}回使用できます`;
}

/**
 * プラン名を取得（productIdから）
 */
export function getPlanDisplayName(productId: string | null): string {
  if (!productId) {
    return '無料プラン';
  }

  const planNames: Record<string, string> = {
    'free': '無料プラン',
    'prod_basic': 'ベーシック',
    'prod_pro': 'プロ',
    'prod_enterprise': 'エンタープライズ'
  };

  return planNames[productId] || productId;
}

/**
 * 使用量データのサニタイズ（不正な値を修正）
 */
export function sanitizeUsageData(data: any): any {
  const sanitized = { ...data };
  
  // 数値フィールドのサニタイズ
  const numericFields = [
    'interviews', 
    'exports', 
    'reports_individual', 
    'reports_summary', 
    'clustering', 
    'themes', 
    'users'
  ];
  
  numericFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      const value = sanitized[field];
      // 負の値を0に修正
      if (typeof value === 'number' && value < 0) {
        sanitized[field] = 0;
      }
      // 数値でない場合は0に設定
      if (typeof value !== 'number') {
        sanitized[field] = 0;
      }
    }
  });
  
  return sanitized;
}