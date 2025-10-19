/**
 * 統合サブスクリプションマネージャー
 * プラン管理、使用量追跡、制限チェックを統合した高レベルインターフェース
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { LimitChecker } from './limit-checker';
import { UsageTracker } from './usage-tracker';
import { logger } from '@/lib/logger';
import { 
  SubscriptionPlan, 
  UsageCheckResult,
  UsageStats,
  PlanLimits,
  SubscriptionStatus,
  NotificationConfig,
  CustomRule
} from '@/types/subscription';

interface ManagerConfig {
  enableNotifications?: boolean;
  enableAnalytics?: boolean;
  enableCaching?: boolean;
  cacheExpiry?: number; // minutes
}

interface CachedData<T> {
  data: T;
  expiresAt: number;
}

export class SubscriptionManager {
  private limitChecker: LimitChecker;
  private usageTracker: UsageTracker;
  private cache: Map<string, CachedData<any>>;
  private config: ManagerConfig;
  private notificationHandlers: Map<string, (data: any) => Promise<void>>;

  constructor(config: ManagerConfig = {}) {
    this.limitChecker = new LimitChecker();
    this.usageTracker = new UsageTracker();
    this.cache = new Map();
    this.config = {
      enableNotifications: true,
      enableAnalytics: true,
      enableCaching: true,
      cacheExpiry: 5, // 5 minutes default
      ...config
    };
    this.notificationHandlers = new Map();
  }

  /**
   * 統合的な使用可能チェック
   * キャッシュ、通知、アナリティクスを含む
   */
  async canUseFeature(
    organizationId: string,
    feature: string,
    options: {
      amount?: number;
      checkConcurrent?: boolean;
      notifyOnLimit?: boolean;
      customRules?: CustomRule[];
    } = {}
  ): Promise<{
    allowed: boolean;
    reason?: string;
    usage?: UsageCheckResult;
    suggestions?: string[];
  }> {
    try {
      // キャッシュチェック
      const cacheKey = `canUse_${organizationId}_${feature}`;
      if (this.config.enableCaching) {
        const cached = this.getFromCache<UsageCheckResult>(cacheKey);
        if (cached) {
          return {
            allowed: cached.allowed,
            usage: cached
          };
        }
      }

      // カスタムルールのチェック
      if (options.customRules) {
        const customResult = await this.checkCustomRules(
          organizationId,
          feature,
          options.customRules
        );
        if (!customResult.allowed) {
          return customResult;
        }
      }

      // 基本的な制限チェック
      const usage = options.checkConcurrent
        ? await this.limitChecker.canUseConcurrent(organizationId, feature)
        : await this.limitChecker.canUse(organizationId, feature);

      // キャッシュに保存
      if (this.config.enableCaching) {
        this.setCache(cacheKey, usage);
      }

      // 制限に近い場合の通知
      if (this.config.enableNotifications && options.notifyOnLimit) {
        await this.checkAndNotify(organizationId, feature, usage);
      }

      // アナリティクス記録
      if (this.config.enableAnalytics) {
        await this.recordAnalytics(organizationId, feature, usage);
      }

      // アップグレード提案の生成
      const suggestions = !usage.allowed 
        ? await this.generateUpgradeSuggestions(organizationId, feature)
        : undefined;

      return {
        allowed: usage.allowed,
        reason: !usage.allowed ? this.generateLimitReason(feature, usage) : undefined,
        usage,
        suggestions
      };
    } catch (error) {
      logger.error('SubscriptionManager: Feature check failed', error as Error, {
        organizationId,
        feature
      });
      
      // エラー時はデフォルトで許可（ビジネスを止めない）
      return {
        allowed: true,
        reason: 'Error occurred, allowing by default'
      };
    }
  }

  /**
   * 使用量を記録（トランザクション対応）
   */
  async recordUsage(
    organizationId: string,
    feature: string,
    amount: number = 1,
    options: {
      concurrent?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      if (options.concurrent) {
        await this.usageTracker.incrementConcurrent(organizationId, feature);
      } else {
        await this.usageTracker.incrementUsage(organizationId, feature, amount);
      }

      // メタデータの記録
      if (options.metadata) {
        await this.recordUsageMetadata(organizationId, feature, options.metadata);
      }

      // キャッシュの無効化
      this.invalidateCache(`canUse_${organizationId}_${feature}`);
    } catch (error) {
      logger.error('SubscriptionManager: Failed to record usage', error as Error, {
        organizationId,
        feature,
        amount
      });
      throw error;
    }
  }

  /**
   * 使用量の解放（同時実行数など）
   */
  async releaseUsage(
    organizationId: string,
    feature: string
  ): Promise<void> {
    try {
      await this.usageTracker.decrementConcurrent(organizationId, feature);
      this.invalidateCache(`canUse_${organizationId}_${feature}`);
    } catch (error) {
      logger.error('SubscriptionManager: Failed to release usage', error as Error, {
        organizationId,
        feature
      });
      throw error;
    }
  }

  /**
   * 組織の完全な使用統計を取得
   */
  async getUsageStats(
    organizationId: string,
    options: {
      includeHistory?: boolean;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<UsageStats> {
    try {
      const cacheKey = `stats_${organizationId}`;
      if (this.config.enableCaching && !options.includeHistory) {
        const cached = this.getFromCache<UsageStats>(cacheKey);
        if (cached) return cached;
      }

      // 現在のプラン情報
      const planInfo = await this.limitChecker.getPlanInfo(organizationId);
      
      // 全メトリクスの使用量を取得
      const metrics = [
        'interviews', 'themes', 'reports', 'exports',
        'concurrent_interviews', 'api_calls'
      ];
      
      const currentUsage: Record<string, number> = {};
      const limits: Record<string, number> = {};
      const percentages: Record<string, number> = {};

      for (const metric of metrics) {
        const usage = await this.limitChecker.canUse(organizationId, metric);
        currentUsage[metric] = usage.current;
        limits[metric] = usage.limit;
        percentages[metric] = usage.limit > 0 
          ? Math.round((usage.current / usage.limit) * 100)
          : 0;
      }

      // 履歴データの取得（オプション）
      let history = undefined;
      if (options.includeHistory) {
        history = await this.getUsageHistory(
          organizationId,
          options.dateRange
        );
      }

      const stats: UsageStats = {
        organizationId,
        planId: planInfo?.planId || 'free',
        planName: planInfo?.planName || '無料プラン',
        currentUsage,
        limits,
        percentages,
        lastReset: new Date(),
        nextReset: this.getNextResetDate(),
        history
      };

      if (this.config.enableCaching && !options.includeHistory) {
        this.setCache(cacheKey, stats);
      }

      return stats;
    } catch (error) {
      logger.error('SubscriptionManager: Failed to get usage stats', error as Error, {
        organizationId
      });
      throw error;
    }
  }

  /**
   * プラン変更処理
   */
  async changePlan(
    organizationId: string,
    newPlanId: string,
    options: {
      immediate?: boolean;
      resetUsage?: boolean;
      notifyUsers?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    previousPlan: string;
    newPlan: string;
    effectiveDate: Date;
  }> {
    try {
      const clientRef = adminDb.collection('clients').doc(organizationId);
      const clientDoc = await clientRef.get();
      
      if (!clientDoc.exists) {
        throw new Error('Organization not found');
      }

      const currentData = clientDoc.data()!;
      const previousPlan = currentData.subscriptionProductId || 'free';

      // プラン変更の記録
      await adminDb.runTransaction(async (transaction) => {
        // プラン更新
        transaction.update(clientRef, {
          subscriptionProductId: newPlanId,
          previousSubscriptionProductId: previousPlan,
          planChangedAt: FieldValue.serverTimestamp(),
          planChangeEffectiveDate: options.immediate 
            ? FieldValue.serverTimestamp()
            : Timestamp.fromDate(this.getNextBillingCycle())
        });

        // プラン変更履歴の記録
        const historyRef = clientRef.collection('planHistory').doc();
        transaction.set(historyRef, {
          from: previousPlan,
          to: newPlanId,
          changedAt: FieldValue.serverTimestamp(),
          changedBy: 'system', // TODO: 実際のユーザーIDを使用
          reason: 'plan_upgrade',
          immediate: options.immediate
        });

        // 使用量のリセット（オプション）
        if (options.resetUsage) {
          const usageRef = clientRef.collection('usage').doc('current');
          const usageSubDocs = await usageRef.listCollections();
          for (const collection of usageSubDocs) {
            const docs = await collection.get();
            docs.forEach(doc => {
              transaction.delete(doc.ref);
            });
          }
        }
      });

      // キャッシュのクリア
      this.clearCache();

      // 通知送信
      if (options.notifyUsers && this.config.enableNotifications) {
        await this.notifyPlanChange(organizationId, previousPlan, newPlanId);
      }

      return {
        success: true,
        previousPlan,
        newPlan: newPlanId,
        effectiveDate: options.immediate ? new Date() : this.getNextBillingCycle()
      };
    } catch (error) {
      logger.error('SubscriptionManager: Failed to change plan', error as Error, {
        organizationId,
        newPlanId
      });
      throw error;
    }
  }

  /**
   * 動的なプラン設定の読み込み・更新
   */
  async updatePlanLimits(
    planId: string,
    limits: Partial<PlanLimits>
  ): Promise<void> {
    try {
      const planRef = adminDb.collection('subscriptionPlans').doc(planId);
      
      await planRef.set({
        limits,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      // キャッシュのクリア
      this.clearCache();

      logger.info('SubscriptionManager: Plan limits updated', {
        planId,
        limits
      });
    } catch (error) {
      logger.error('SubscriptionManager: Failed to update plan limits', error as Error, {
        planId,
        limits
      });
      throw error;
    }
  }

  /**
   * カスタム制限ルールの追加
   */
  async addCustomRule(
    organizationId: string,
    rule: CustomRule
  ): Promise<void> {
    try {
      const rulesRef = adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('customRules')
        .doc(rule.id);

      await rulesRef.set({
        ...rule,
        createdAt: FieldValue.serverTimestamp(),
        active: true
      });

      logger.info('SubscriptionManager: Custom rule added', {
        organizationId,
        ruleId: rule.id
      });
    } catch (error) {
      logger.error('SubscriptionManager: Failed to add custom rule', error as Error, {
        organizationId,
        rule
      });
      throw error;
    }
  }

  /**
   * 通知ハンドラーの登録
   */
  registerNotificationHandler(
    event: string,
    handler: (data: any) => Promise<void>
  ): void {
    this.notificationHandlers.set(event, handler);
  }

  // ==================== Private Methods ====================

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    const expiresAt = Date.now() + (this.config.cacheExpiry! * 60 * 1000);
    this.cache.set(key, { data, expiresAt });
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private async checkCustomRules(
    organizationId: string,
    feature: string,
    rules: CustomRule[]
  ): Promise<{ allowed: boolean; reason?: string }> {
    for (const rule of rules) {
      if (rule.type === 'time_based') {
        const now = new Date();
        const hour = now.getHours();
        if (rule.config.blockedHours?.includes(hour)) {
          return {
            allowed: false,
            reason: `この機能は${hour}時台は利用できません`
          };
        }
      } else if (rule.type === 'user_based') {
        // ユーザーベースのルール実装
        // TODO: 実装
      } else if (rule.type === 'conditional') {
        // 条件付きルール実装
        // TODO: 実装
      }
    }
    
    return { allowed: true };
  }

  private async checkAndNotify(
    organizationId: string,
    feature: string,
    usage: UsageCheckResult
  ): Promise<void> {
    if (usage.limit <= 0) return;
    
    const percentage = (usage.current / usage.limit) * 100;
    
    // 80%、90%、100%で通知
    const thresholds = [80, 90, 100];
    for (const threshold of thresholds) {
      if (percentage >= threshold && percentage < threshold + 10) {
        await this.sendNotification(organizationId, 'usage_warning', {
          feature,
          threshold,
          current: usage.current,
          limit: usage.limit
        });
        break;
      }
    }
  }

  private async sendNotification(
    organizationId: string,
    event: string,
    data: any
  ): Promise<void> {
    const handler = this.notificationHandlers.get(event);
    if (handler) {
      try {
        await handler({ organizationId, ...data });
      } catch (error) {
        logger.error('SubscriptionManager: Notification failed', error as Error, {
          event,
          data
        });
      }
    }
  }

  private async recordAnalytics(
    organizationId: string,
    feature: string,
    usage: UsageCheckResult
  ): Promise<void> {
    try {
      const analyticsRef = adminDb
        .collection('analytics')
        .doc('usage')
        .collection(organizationId)
        .doc();

      await analyticsRef.set({
        feature,
        timestamp: FieldValue.serverTimestamp(),
        allowed: usage.allowed,
        current: usage.current,
        limit: usage.limit,
        percentage: usage.limit > 0 ? (usage.current / usage.limit) * 100 : 0
      });
    } catch (error) {
      // アナリティクスのエラーは無視（メイン処理に影響させない）
      logger.debug('SubscriptionManager: Analytics recording failed', {
        error: (error as Error).message
      });
    }
  }

  private async recordUsageMetadata(
    organizationId: string,
    feature: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const metadataRef = adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usageMetadata')
        .doc();

      await metadataRef.set({
        feature,
        metadata,
        timestamp: FieldValue.serverTimestamp()
      });
    } catch (error) {
      logger.debug('SubscriptionManager: Metadata recording failed', {
        error: (error as Error).message
      });
    }
  }

  private generateLimitReason(
    feature: string,
    usage: UsageCheckResult
  ): string {
    if (usage.limit === 0) {
      return `この機能は現在のプランでは利用できません`;
    }
    
    if (usage.current >= usage.limit) {
      return `${feature}の利用上限（${usage.limit}）に達しています`;
    }
    
    return `制限により利用できません`;
  }

  private async generateUpgradeSuggestions(
    organizationId: string,
    feature: string
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // 現在のプランを取得
    const planInfo = await this.limitChecker.getPlanInfo(organizationId);
    const currentPlanId = planInfo?.planId || 'free';
    
    // アップグレード可能なプランを提案
    const upgradePlans = {
      'free': ['ベーシックプラン', 'プロプラン'],
      'prod_basic': ['プロプラン', 'エンタープライズプラン'],
      'prod_pro': ['エンタープライズプラン']
    };
    
    const available = upgradePlans[currentPlanId] || [];
    if (available.length > 0) {
      suggestions.push(`${available[0]}にアップグレードすると、より多くの${feature}が利用できます`);
    }
    
    // 使用量のリセット日を提案
    const nextReset = this.getNextResetDate();
    suggestions.push(`次回リセット日: ${nextReset.toLocaleDateString('ja-JP')}`);
    
    return suggestions;
  }

  private async getUsageHistory(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any[]> {
    try {
      let query = adminDb
        .collection('analytics')
        .doc('usage')
        .collection(organizationId)
        .orderBy('timestamp', 'desc');

      if (dateRange) {
        query = query
          .where('timestamp', '>=', Timestamp.fromDate(dateRange.start))
          .where('timestamp', '<=', Timestamp.fromDate(dateRange.end));
      } else {
        query = query.limit(100);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('SubscriptionManager: Failed to get usage history', error as Error);
      return [];
    }
  }

  private getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  private getNextBillingCycle(): Date {
    // 次の課金サイクル（月初）を返す
    return this.getNextResetDate();
  }

  private async notifyPlanChange(
    organizationId: string,
    fromPlan: string,
    toPlan: string
  ): Promise<void> {
    await this.sendNotification(organizationId, 'plan_changed', {
      fromPlan,
      toPlan,
      effectiveDate: new Date()
    });
  }
}

// シングルトンインスタンスのエクスポート
export const subscriptionManager = new SubscriptionManager();