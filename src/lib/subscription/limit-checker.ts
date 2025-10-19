/**
 * サブスクリプション制限チェッカー
 * プランに基づいた機能制限の確認
 */

import { adminDb } from '@/lib/firebase-admin';
import { UsageTracker } from './usage-tracker';
import { logger } from '@/lib/logger';
import subscriptionLimitsJson from '@/config/subscription-limits.json';
import { 
  SubscriptionLimits, 
  UsageCheckResult, 
  MetricType 
} from '@/types/subscription';

const subscriptionLimits = subscriptionLimitsJson as SubscriptionLimits;

export class LimitChecker {
  private usageTracker = new UsageTracker();

  /**
   * 組織のプランIDを取得
   */
  private async getPlanId(organizationId: string): Promise<string> {
    try {
      const clientDoc = await adminDb
        .collection('clients')
        .doc(organizationId)
        .get();

      const clientData = clientDoc.data();
      const productId = clientData?.subscriptionProductId;
      
      // プランIDが存在しない、または設定にない場合は無料プラン
      if (!productId || !subscriptionLimits[productId]) {
        logger.debug('LimitChecker: No valid plan found, using free plan', {
          organizationId,
          productId
        });
        return 'free';
      }

      return productId;
    } catch (error) {
      logger.error('LimitChecker: Failed to get plan ID', error as Error, {
        organizationId
      });
      return 'free';
    }
  }

  /**
   * プランの制限値を取得
   */
  async getPlanLimit(
    organizationId: string, 
    metric: MetricType
  ): Promise<number> {
    try {
      const planId = await this.getPlanId(organizationId);
      const plan = subscriptionLimits[planId];
      
      if (!plan) {
        logger.warn('LimitChecker: Plan not found', { planId });
        return 0;
      }

      const limit = plan.limits[metric];
      
      if (limit === undefined) {
        logger.warn('LimitChecker: Metric not found in plan', { 
          planId, 
          metric 
        });
        return 0;
      }

      return limit;
    } catch (error) {
      logger.error('LimitChecker: Failed to get plan limit', error as Error, {
        organizationId,
        metric
      });
      return 0;
    }
  }

  /**
   * 使用可能かチェック（月間制限）
   */
  async canUse(
    organizationId: string, 
    metric: string
  ): Promise<UsageCheckResult> {
    try {
      if (!organizationId) {
        // 組織がない場合は無制限
        return {
          allowed: true,
          current: 0,
          limit: -1,
          remaining: -1
        };
      }

      const planId = await this.getPlanId(organizationId);
      const plan = subscriptionLimits[planId];
      const limit = await this.getPlanLimit(organizationId, metric as MetricType);
      
      // 無制限の場合
      if (limit === -1) {
        return {
          allowed: true,
          current: 0,
          limit: -1,
          remaining: -1,
          planName: plan?.name
        };
      }

      // 制限が0の場合（機能が使用不可）
      if (limit === 0) {
        return {
          allowed: false,
          current: 0,
          limit: 0,
          remaining: 0,
          planName: plan?.name
        };
      }

      const current = await this.usageTracker.getUsage(organizationId, metric);
      const remaining = limit - current;

      return {
        allowed: remaining > 0,
        current,
        limit,
        remaining: Math.max(0, remaining),
        planName: plan?.name
      };
    } catch (error) {
      logger.error('LimitChecker: Failed to check usage', error as Error, {
        organizationId,
        metric
      });
      
      // エラー時は安全側に倒す（制限なし）
      return {
        allowed: true,
        current: 0,
        limit: -1,
        remaining: -1
      };
    }
  }

  /**
   * 同時実行数チェック
   */
  async canUseConcurrent(
    organizationId: string, 
    metric: string
  ): Promise<UsageCheckResult> {
    try {
      if (!organizationId) {
        // 組織がない場合は無制限
        return {
          allowed: true,
          current: 0,
          limit: -1,
          remaining: -1
        };
      }

      const planId = await this.getPlanId(organizationId);
      const plan = subscriptionLimits[planId];
      const limit = await this.getPlanLimit(organizationId, metric as MetricType);
      
      // 無制限の場合
      if (limit === -1) {
        return {
          allowed: true,
          current: 0,
          limit: -1,
          remaining: -1,
          planName: plan?.name
        };
      }

      const current = await this.usageTracker.getConcurrent(organizationId, metric);
      const remaining = limit - current;

      return {
        allowed: remaining > 0,
        current,
        limit,
        remaining: Math.max(0, remaining),
        planName: plan?.name
      };
    } catch (error) {
      logger.error('LimitChecker: Failed to check concurrent', error as Error, {
        organizationId,
        metric
      });
      
      // エラー時は安全側に倒す（制限なし）
      return {
        allowed: true,
        current: 0,
        limit: -1,
        remaining: -1
      };
    }
  }

  /**
   * 複数のメトリクスを一括チェック
   */
  async checkMultiple(
    organizationId: string,
    metrics: string[]
  ): Promise<Record<string, UsageCheckResult>> {
    try {
      const results: Record<string, UsageCheckResult> = {};
      
      // 並列でチェック
      await Promise.all(
        metrics.map(async (metric) => {
          results[metric] = await this.canUse(organizationId, metric);
        })
      );
      
      return results;
    } catch (error) {
      logger.error('LimitChecker: Failed to check multiple', error as Error, {
        organizationId,
        metrics
      });
      
      // エラー時は空のオブジェクトを返す
      return {};
    }
  }

  /**
   * インタビュー時間制限を取得（秒）
   */
  async getInterviewDurationLimit(organizationId: string): Promise<number> {
    try {
      if (!organizationId) {
        return -1; // 無制限
      }

      const limit = await this.getPlanLimit(
        organizationId, 
        'interview_duration_seconds'
      );
      
      return limit;
    } catch (error) {
      logger.error('LimitChecker: Failed to get interview duration limit', error as Error, {
        organizationId
      });
      return -1; // エラー時は無制限
    }
  }

  /**
   * データ保存期間を取得（日数）
   */
  async getDataRetentionDays(organizationId: string): Promise<number> {
    try {
      if (!organizationId) {
        return -1; // 無制限
      }

      const limit = await this.getPlanLimit(
        organizationId, 
        'data_retention_days'
      );
      
      return limit;
    } catch (error) {
      logger.error('LimitChecker: Failed to get data retention days', error as Error, {
        organizationId
      });
      return -1; // エラー時は無制限
    }
  }

  /**
   * プラン情報を取得
   */
  async getPlanInfo(organizationId: string): Promise<{
    planId: string;
    planName: string;
    limits: Record<string, number>;
  } | null> {
    try {
      const planId = await this.getPlanId(organizationId);
      const plan = subscriptionLimits[planId];
      
      if (!plan) {
        return null;
      }

      return {
        planId,
        planName: plan.name,
        limits: plan.limits
      };
    } catch (error) {
      logger.error('LimitChecker: Failed to get plan info', error as Error, {
        organizationId
      });
      return null;
    }
  }
}