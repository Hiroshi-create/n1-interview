/**
 * 使用量追跡システム
 * 組織ごとの機能使用量を記録・管理
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { UsageData, ConcurrentUsage, MetricType } from '@/types/subscription';

export class UsageTracker {
  /**
   * 現在の月を取得（YYYY-MM形式）
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 使用量を増やす（月間カウンター）
   */
  async incrementUsage(
    organizationId: string, 
    metric: string, 
    amount: number = 1
  ): Promise<void> {
    try {
      if (!organizationId) {
        logger.warn('UsageTracker: organizationId is required');
        return;
      }

      const usageRef = adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('current');

      const currentMonth = this.getCurrentMonth();
      
      // トランザクションで安全に更新
      await adminDb.runTransaction(async (transaction) => {
        const usageDoc = await transaction.get(usageRef);
        const data = usageDoc.data() as UsageData | undefined;
        
        // 月が変わっていたらリセット
        if (data?.month !== currentMonth) {
          transaction.set(usageRef, {
            month: currentMonth,
            interviews: 0,
            exports: 0,
            reports_individual: 0,
            reports_summary: 0,
            clustering: 0,
            themes: 0,
            users: 0,
            last_updated: FieldValue.serverTimestamp()
          });
        }
        
        // 指定されたメトリクスをインクリメント
        transaction.update(usageRef, {
          [metric]: FieldValue.increment(amount),
          last_updated: FieldValue.serverTimestamp()
        });
      });

      logger.debug('UsageTracker: Usage incremented', { 
        organizationId, 
        metric, 
        amount 
      });
    } catch (error) {
      logger.error('UsageTracker: Failed to increment usage', error as Error, {
        organizationId,
        metric,
        amount
      });
      throw error;
    }
  }

  /**
   * 使用量を取得
   */
  async getUsage(
    organizationId: string, 
    metric: string
  ): Promise<number> {
    try {
      if (!organizationId) {
        return 0;
      }

      const usageDoc = await adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('current')
        .get();

      if (!usageDoc.exists) {
        return 0;
      }
      
      const data = usageDoc.data() as UsageData;
      const currentMonth = this.getCurrentMonth();
      
      // 月が変わった場合は0を返す
      if (data?.month !== currentMonth) {
        await this.resetMonthlyUsage(organizationId);
        return 0;
      }
      
      return data?.[metric] || 0;
    } catch (error) {
      logger.error('UsageTracker: Failed to get usage', error as Error, {
        organizationId,
        metric
      });
      return 0;
    }
  }

  /**
   * 全使用量データを取得
   */
  async getAllUsage(organizationId: string): Promise<UsageData | null> {
    try {
      if (!organizationId) {
        return null;
      }

      const usageDoc = await adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('current')
        .get();

      if (!usageDoc.exists) {
        await this.resetMonthlyUsage(organizationId);
        return await this.getAllUsage(organizationId);
      }

      const data = usageDoc.data() as UsageData;
      const currentMonth = this.getCurrentMonth();

      // 月が変わった場合はリセット
      if (data?.month !== currentMonth) {
        await this.resetMonthlyUsage(organizationId);
        return await this.getAllUsage(organizationId);
      }

      return data;
    } catch (error) {
      logger.error('UsageTracker: Failed to get all usage', error as Error, {
        organizationId
      });
      return null;
    }
  }

  /**
   * 月次使用量をリセット
   */
  async resetMonthlyUsage(organizationId: string): Promise<void> {
    try {
      if (!organizationId) {
        return;
      }

      const usageRef = adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('current');

      const resetData: UsageData = {
        month: this.getCurrentMonth(),
        interviews: 0,
        exports: 0,
        reports_individual: 0,
        reports_summary: 0,
        clustering: 0,
        themes: 0,
        users: 0,
        last_updated: FieldValue.serverTimestamp() as any
      };

      await usageRef.set(resetData);

      logger.info('UsageTracker: Monthly usage reset', { organizationId });
    } catch (error) {
      logger.error('UsageTracker: Failed to reset monthly usage', error as Error, {
        organizationId
      });
      throw error;
    }
  }

  /**
   * 同時実行数を増やす
   */
  async incrementConcurrent(
    organizationId: string, 
    metric: string
  ): Promise<number> {
    try {
      if (!organizationId) {
        return 0;
      }

      const ref = adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('concurrent');

      // トランザクションで安全に更新
      const newValue = await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(ref);
        const current = doc.data()?.[metric] || 0;
        const newVal = current + 1;
        
        transaction.set(ref, {
          [metric]: newVal,
          last_updated: FieldValue.serverTimestamp()
        }, { merge: true });
        
        return newVal;
      });

      logger.debug('UsageTracker: Concurrent incremented', {
        organizationId,
        metric,
        newValue
      });

      return newValue;
    } catch (error) {
      logger.error('UsageTracker: Failed to increment concurrent', error as Error, {
        organizationId,
        metric
      });
      throw error;
    }
  }

  /**
   * 同時実行数を減らす
   */
  async decrementConcurrent(
    organizationId: string, 
    metric: string
  ): Promise<number> {
    try {
      if (!organizationId) {
        return 0;
      }

      const ref = adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('concurrent');

      // トランザクションで安全に更新（0未満にならないように）
      const newValue = await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(ref);
        const current = doc.data()?.[metric] || 0;
        const newVal = Math.max(0, current - 1);
        
        transaction.set(ref, {
          [metric]: newVal,
          last_updated: FieldValue.serverTimestamp()
        }, { merge: true });
        
        return newVal;
      });

      logger.debug('UsageTracker: Concurrent decremented', {
        organizationId,
        metric,
        newValue
      });

      return newValue;
    } catch (error) {
      logger.error('UsageTracker: Failed to decrement concurrent', error as Error, {
        organizationId,
        metric
      });
      // エラーが発生しても処理を継続（同時実行数の不整合を防ぐ）
      return 0;
    }
  }

  /**
   * 同時実行数を取得
   */
  async getConcurrent(
    organizationId: string, 
    metric: string
  ): Promise<number> {
    try {
      if (!organizationId) {
        return 0;
      }

      const doc = await adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('concurrent')
        .get();

      return doc.data()?.[metric] || 0;
    } catch (error) {
      logger.error('UsageTracker: Failed to get concurrent', error as Error, {
        organizationId,
        metric
      });
      return 0;
    }
  }

  /**
   * 同時実行数をリセット（エラー復旧用）
   */
  async resetConcurrent(
    organizationId: string, 
    metric: string
  ): Promise<void> {
    try {
      if (!organizationId) {
        return;
      }

      const ref = adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('usage')
        .doc('concurrent');

      await ref.set({
        [metric]: 0,
        last_updated: FieldValue.serverTimestamp()
      }, { merge: true });

      logger.info('UsageTracker: Concurrent reset', {
        organizationId,
        metric
      });
    } catch (error) {
      logger.error('UsageTracker: Failed to reset concurrent', error as Error, {
        organizationId,
        metric
      });
    }
  }
}