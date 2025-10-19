/**
 * サブスクリプション通知サービス
 * 使用量監視、アラート生成、通知送信を管理
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { 
  UsageAlert, 
  NotificationConfig, 
  NotificationChannel,
  UsageCheckResult 
} from '@/types/subscription';

interface NotificationPayload {
  organizationId: string;
  feature: string;
  threshold: number;
  current: number;
  limit: number;
  percentage: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private static instance: NotificationService;
  private notificationQueue: NotificationPayload[] = [];
  private isProcessing = false;
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  private constructor() {
    // シングルトンパターン
    this.startQueueProcessor();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 使用量をチェックして必要に応じて通知を送信
   */
  async checkAndNotify(
    organizationId: string,
    feature: string,
    usage: UsageCheckResult
  ): Promise<void> {
    try {
      // 通知設定を取得
      const config = await this.getNotificationConfig(organizationId);
      if (!config?.enabled) {
        return;
      }

      // 制限なしの場合はスキップ
      if (usage.limit <= 0) {
        return;
      }

      const percentage = Math.round((usage.current / usage.limit) * 100);
      
      // 設定された閾値をチェック
      for (const threshold of config.thresholds) {
        if (percentage >= threshold && percentage < threshold + 5) {
          // 既に同じ閾値で通知済みかチェック
          const alreadyNotified = await this.isAlreadyNotified(
            organizationId,
            feature,
            threshold
          );

          if (!alreadyNotified) {
            await this.createAndSendNotification(
              organizationId,
              feature,
              threshold,
              usage,
              config
            );
          }
          break;
        }
      }

      // 使用量の急増を検知
      await this.detectUsageSpike(organizationId, feature, usage);

    } catch (error) {
      logger.error('NotificationService: Failed to check and notify', error as Error, {
        organizationId,
        feature
      });
    }
  }

  /**
   * 通知を作成して送信
   */
  private async createAndSendNotification(
    organizationId: string,
    feature: string,
    threshold: number,
    usage: UsageCheckResult,
    config: NotificationConfig
  ): Promise<void> {
    const percentage = Math.round((usage.current / usage.limit) * 100);
    const severity = this.getSeverity(percentage);
    const message = this.generateMessage(feature, percentage, usage);

    // アラートをFirestoreに保存
    const alert: UsageAlert = {
      id: '',
      feature,
      threshold,
      currentPercentage: percentage,
      message,
      severity,
      createdAt: new Date(),
      acknowledged: false
    };

    const alertRef = await adminDb
      .collection('clients')
      .doc(organizationId)
      .collection('alerts')
      .add(alert);

    alert.id = alertRef.id;

    // 通知ペイロードを作成
    const payload: NotificationPayload = {
      organizationId,
      feature,
      threshold,
      current: usage.current,
      limit: usage.limit,
      percentage,
      severity,
      message,
      timestamp: new Date(),
      metadata: {
        alertId: alert.id,
        planName: usage.planName
      }
    };

    // 各チャンネルに通知を送信
    for (const channel of config.channels) {
      if (channel.enabled) {
        await this.sendToChannel(channel, payload, config);
      }
    }

    logger.info('NotificationService: Alert created and notifications sent', {
      organizationId,
      feature,
      threshold,
      severity
    });
  }

  /**
   * チャンネル別の通知送信
   */
  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    config: NotificationConfig
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(payload, config);
          break;
        
        case 'slack':
          await this.sendSlackNotification(payload, config);
          break;
        
        case 'webhook':
          await this.sendWebhookNotification(payload, config);
          break;
        
        case 'in-app':
          await this.sendInAppNotification(payload);
          break;
        
        default:
          logger.warn('NotificationService: Unknown channel type', {
            channelType: channel.type
          });
      }
    } catch (error) {
      logger.error('NotificationService: Failed to send to channel', error as Error, {
        channelType: channel.type,
        organizationId: payload.organizationId
      });
      
      // リトライキューに追加
      this.notificationQueue.push(payload);
    }
  }

  /**
   * メール通知の送信
   */
  private async sendEmailNotification(
    payload: NotificationPayload,
    config: NotificationConfig
  ): Promise<void> {
    // メール送信の実装（SendGrid、AWS SESなどを使用）
    // 例: SendGrid
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: config.recipients.filter(r => r.type === 'email').map(r => r.value),
      from: 'noreply@example.com',
      subject: `使用量アラート: ${payload.feature}が${payload.percentage}%に達しました`,
      html: this.generateEmailHtml(payload)
    };
    
    await sgMail.sendMultiple(msg);
    */
    
    logger.debug('NotificationService: Email notification would be sent', {
      organizationId: payload.organizationId,
      feature: payload.feature
    });
  }

  /**
   * Slack通知の送信
   */
  private async sendSlackNotification(
    payload: NotificationPayload,
    config: NotificationConfig
  ): Promise<void> {
    if (!config.slackWebhookUrl) {
      return;
    }

    const slackMessage = {
      text: `使用量アラート`,
      attachments: [{
        color: this.getSlackColor(payload.severity),
        title: `${payload.feature}の使用量が${payload.percentage}%に達しました`,
        fields: [
          {
            title: '現在の使用量',
            value: `${payload.current} / ${payload.limit}`,
            short: true
          },
          {
            title: '使用率',
            value: `${payload.percentage}%`,
            short: true
          },
          {
            title: 'プラン',
            value: payload.metadata?.planName || '不明',
            short: true
          },
          {
            title: '重要度',
            value: this.getSeverityLabel(payload.severity),
            short: true
          }
        ],
        footer: 'N1 Interview System',
        ts: Math.floor(payload.timestamp.getTime() / 1000)
      }]
    };

    try {
      const response = await fetch(config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('NotificationService: Slack notification failed', error as Error);
      throw error;
    }
  }

  /**
   * Webhook通知の送信
   */
  private async sendWebhookNotification(
    payload: NotificationPayload,
    config: NotificationConfig
  ): Promise<void> {
    if (!config.webhookUrl) {
      return;
    }

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Notification-Type': 'usage-alert'
        },
        body: JSON.stringify({
          type: 'usage_alert',
          payload
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('NotificationService: Webhook notification failed', error as Error);
      throw error;
    }
  }

  /**
   * アプリ内通知の送信
   */
  private async sendInAppNotification(
    payload: NotificationPayload
  ): Promise<void> {
    // リアルタイム通知をFirestoreに保存
    await adminDb
      .collection('clients')
      .doc(payload.organizationId)
      .collection('notifications')
      .add({
        type: 'usage_alert',
        feature: payload.feature,
        message: payload.message,
        severity: payload.severity,
        percentage: payload.percentage,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        metadata: payload.metadata
      });
  }

  /**
   * 使用量の急増を検知
   */
  private async detectUsageSpike(
    organizationId: string,
    feature: string,
    usage: UsageCheckResult
  ): Promise<void> {
    try {
      // 過去1時間の使用履歴を取得
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const historySnapshot = await adminDb
        .collection('analytics')
        .doc('usage')
        .collection(organizationId)
        .where('feature', '==', feature)
        .where('timestamp', '>=', oneHourAgo)
        .orderBy('timestamp', 'asc')
        .get();

      if (historySnapshot.size < 2) {
        return; // データ不足
      }

      const history = historySnapshot.docs.map(doc => doc.data());
      const firstUsage = history[0].current || 0;
      const currentUsage = usage.current;
      const increase = currentUsage - firstUsage;
      const increaseRate = firstUsage > 0 ? (increase / firstUsage) * 100 : 0;

      // 1時間で50%以上増加した場合はアラート
      if (increaseRate > 50) {
        await this.createSpikeAlert(
          organizationId,
          feature,
          increaseRate,
          usage
        );
      }

      // 現在のペースで制限に達する時刻を予測
      if (increase > 0 && usage.limit > 0) {
        const remainingCapacity = usage.limit - currentUsage;
        const hoursUntilLimit = remainingCapacity / increase;
        
        if (hoursUntilLimit < 24) {
          await this.createProjectionAlert(
            organizationId,
            feature,
            hoursUntilLimit,
            usage
          );
        }
      }
    } catch (error) {
      logger.debug('NotificationService: Spike detection failed', {
        error: (error as Error).message
      });
    }
  }

  /**
   * 急増アラートの作成
   */
  private async createSpikeAlert(
    organizationId: string,
    feature: string,
    increaseRate: number,
    usage: UsageCheckResult
  ): Promise<void> {
    const message = `${feature}の使用量が過去1時間で${Math.round(increaseRate)}%増加しました`;
    
    await adminDb
      .collection('clients')
      .doc(organizationId)
      .collection('alerts')
      .add({
        type: 'usage_spike',
        feature,
        message,
        severity: increaseRate > 100 ? 'critical' : 'warning',
        increaseRate,
        currentUsage: usage.current,
        limit: usage.limit,
        createdAt: FieldValue.serverTimestamp(),
        acknowledged: false
      });
  }

  /**
   * 予測アラートの作成
   */
  private async createProjectionAlert(
    organizationId: string,
    feature: string,
    hoursUntilLimit: number,
    usage: UsageCheckResult
  ): Promise<void> {
    const message = `現在のペースでは${Math.round(hoursUntilLimit)}時間後に${feature}の制限に達します`;
    
    await adminDb
      .collection('clients')
      .doc(organizationId)
      .collection('alerts')
      .add({
        type: 'usage_projection',
        feature,
        message,
        severity: hoursUntilLimit < 6 ? 'critical' : 'warning',
        projectedHours: hoursUntilLimit,
        currentUsage: usage.current,
        limit: usage.limit,
        createdAt: FieldValue.serverTimestamp(),
        acknowledged: false
      });
  }

  /**
   * 通知設定の取得
   */
  private async getNotificationConfig(
    organizationId: string
  ): Promise<NotificationConfig | null> {
    try {
      const configDoc = await adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('settings')
        .doc('notifications')
        .get();

      if (!configDoc.exists) {
        // デフォルト設定を返す
        return {
          enabled: true,
          channels: [{ type: 'in-app', enabled: true }],
          thresholds: [80, 90, 100],
          recipients: []
        };
      }

      return configDoc.data() as NotificationConfig;
    } catch (error) {
      logger.error('NotificationService: Failed to get config', error as Error);
      return null;
    }
  }

  /**
   * 既に通知済みかチェック
   */
  private async isAlreadyNotified(
    organizationId: string,
    feature: string,
    threshold: number
  ): Promise<boolean> {
    try {
      // 過去24時間以内に同じ閾値で通知済みかチェック
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const snapshot = await adminDb
        .collection('clients')
        .doc(organizationId)
        .collection('alerts')
        .where('feature', '==', feature)
        .where('threshold', '==', threshold)
        .where('createdAt', '>=', oneDayAgo)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      logger.debug('NotificationService: Failed to check notification history', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * メッセージの生成
   */
  private generateMessage(
    feature: string,
    percentage: number,
    usage: UsageCheckResult
  ): string {
    const featureName = this.getFeatureName(feature);
    
    if (percentage >= 100) {
      return `${featureName}の使用量が上限に達しました（${usage.current}/${usage.limit}）`;
    } else if (percentage >= 90) {
      return `${featureName}の使用量が90%を超えました。残り${usage.remaining}です`;
    } else if (percentage >= 80) {
      return `${featureName}の使用量が80%に達しました（${usage.current}/${usage.limit}）`;
    } else {
      return `${featureName}の使用量が${percentage}%に達しました`;
    }
  }

  /**
   * 重要度の判定
   */
  private getSeverity(percentage: number): 'info' | 'warning' | 'critical' {
    if (percentage >= 100) return 'critical';
    if (percentage >= 90) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'info';
  }

  /**
   * Slackの色を取得
   */
  private getSlackColor(severity: 'info' | 'warning' | 'critical'): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'good';
      default: return '#808080';
    }
  }

  /**
   * 重要度ラベルの取得
   */
  private getSeverityLabel(severity: 'info' | 'warning' | 'critical'): string {
    switch (severity) {
      case 'critical': return '🔴 重要';
      case 'warning': return '🟡 警告';
      case 'info': return '🔵 情報';
      default: return '情報';
    }
  }

  /**
   * 機能名の取得
   */
  private getFeatureName(feature: string): string {
    const names: Record<string, string> = {
      interviews: 'インタビュー',
      concurrent_interviews: '同時実行インタビュー',
      themes: 'テーマ',
      reports: 'レポート',
      exports: 'エクスポート',
      api_calls: 'API呼び出し'
    };
    return names[feature] || feature;
  }

  /**
   * キュープロセッサーの開始
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.notificationQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      const payload = this.notificationQueue.shift();
      
      if (payload) {
        try {
          // リトライ処理
          await this.retryNotification(payload);
        } catch (error) {
          logger.error('NotificationService: Queue processor failed', error as Error);
        }
      }

      this.isProcessing = false;
    }, 5000); // 5秒ごとに処理
  }

  /**
   * 通知のリトライ
   */
  private async retryNotification(
    payload: NotificationPayload,
    attempt: number = 1
  ): Promise<void> {
    try {
      const config = await this.getNotificationConfig(payload.organizationId);
      if (!config) return;

      // リトライ送信
      for (const channel of config.channels) {
        if (channel.enabled) {
          await this.sendToChannel(channel, payload, config);
        }
      }
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        await this.retryNotification(payload, attempt + 1);
      } else {
        logger.error('NotificationService: Max retry attempts reached', error as Error, {
          payload
        });
      }
    }
  }
}

// シングルトンインスタンスのエクスポート
export const notificationService = NotificationService.getInstance();