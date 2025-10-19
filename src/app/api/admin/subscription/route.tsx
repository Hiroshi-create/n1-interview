import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { SubscriptionManager } from '@/lib/subscription/subscription-manager';
import { logger } from '@/lib/logger';
import { 
  SubscriptionResponse, 
  UsageStats, 
  NotificationConfig,
  CustomRule,
  PlanMigration,
  BillingInfo
} from '@/types/subscription';

const subscriptionManager = new SubscriptionManager();

/**
 * 管理者用サブスクリプション管理API
 * GET: 使用統計の取得
 * POST: プラン変更
 * PUT: 設定更新
 * DELETE: サブスクリプション削除
 */

/**
 * GET: 組織の使用統計を取得
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const dateRangeStart = searchParams.get('startDate');
    const dateRangeEnd = searchParams.get('endDate');
    const action = searchParams.get('action');

    // 認証チェック
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 管理者権限チェック
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.isAdmin && userData?.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // アクションに応じた処理
    switch (action) {
      case 'stats':
        // 使用統計の取得
        if (!organizationId) {
          return NextResponse.json(
            { error: 'Organization ID required' },
            { status: 400 }
          );
        }

        const options: any = { includeHistory };
        if (dateRangeStart && dateRangeEnd) {
          options.dateRange = {
            start: new Date(dateRangeStart),
            end: new Date(dateRangeEnd)
          };
        }

        const stats = await subscriptionManager.getUsageStats(
          organizationId,
          options
        );

        return NextResponse.json<SubscriptionResponse<UsageStats>>({
          success: true,
          data: stats
        });

      case 'all-organizations':
        // 全組織の概要（スーパー管理者のみ）
        if (!userData?.isSuperAdmin) {
          return NextResponse.json(
            { error: 'Super admin access required' },
            { status: 403 }
          );
        }

        const organizations = await getAllOrganizationsStats();
        return NextResponse.json({
          success: true,
          data: organizations
        });

      case 'alerts':
        // アラートの取得
        if (!organizationId) {
          return NextResponse.json(
            { error: 'Organization ID required' },
            { status: 400 }
          );
        }

        const alerts = await getOrganizationAlerts(organizationId);
        return NextResponse.json({
          success: true,
          data: alerts
        });

      case 'billing':
        // 課金情報の取得
        if (!organizationId) {
          return NextResponse.json(
            { error: 'Organization ID required' },
            { status: 400 }
          );
        }

        const billing = await getBillingInfo(organizationId);
        return NextResponse.json({
          success: true,
          data: billing
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Admin Subscription API: GET error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: プラン変更・カスタムルール追加
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, organizationId, ...params } = body;

    // 認証チェック
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 管理者権限チェック
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.isAdmin && userData?.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'change-plan':
        // プラン変更
        const { newPlanId, immediate, resetUsage, notifyUsers } = params;
        
        if (!newPlanId) {
          return NextResponse.json(
            { error: 'New plan ID required' },
            { status: 400 }
          );
        }

        const result = await subscriptionManager.changePlan(
          organizationId,
          newPlanId,
          { immediate, resetUsage, notifyUsers }
        );

        logger.info('Admin: Plan changed', {
          organizationId,
          from: result.previousPlan,
          to: result.newPlan,
          by: userId
        });

        return NextResponse.json({
          success: true,
          data: result
        });

      case 'add-custom-rule':
        // カスタムルール追加
        const { rule } = params;
        
        if (!rule) {
          return NextResponse.json(
            { error: 'Rule configuration required' },
            { status: 400 }
          );
        }

        await subscriptionManager.addCustomRule(organizationId, rule);

        logger.info('Admin: Custom rule added', {
          organizationId,
          ruleId: rule.id,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Custom rule added successfully'
        });

      case 'reset-usage':
        // 使用量リセット
        const { metrics } = params;
        
        await resetOrganizationUsage(organizationId, metrics);

        logger.info('Admin: Usage reset', {
          organizationId,
          metrics,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Usage reset successfully'
        });

      case 'schedule-migration':
        // プラン移行のスケジュール
        const migration: PlanMigration = params.migration;
        
        await schedulePlanMigration(organizationId, migration);

        logger.info('Admin: Migration scheduled', {
          organizationId,
          migration,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Migration scheduled successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Admin Subscription API: POST error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT: 設定更新（通知設定、プラン制限など）
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, organizationId, ...params } = body;

    // 認証チェック
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 管理者権限チェック
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'update-plan-limits':
        // プラン制限の更新（スーパー管理者のみ）
        if (!userData?.isSuperAdmin) {
          return NextResponse.json(
            { error: 'Super admin access required' },
            { status: 403 }
          );
        }

        const { planId, limits } = params;
        await subscriptionManager.updatePlanLimits(planId, limits);

        logger.info('Admin: Plan limits updated', {
          planId,
          limits,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Plan limits updated successfully'
        });

      case 'update-notification-config':
        // 通知設定の更新
        const notificationConfig: NotificationConfig = params.config;
        
        await updateNotificationConfig(organizationId, notificationConfig);

        logger.info('Admin: Notification config updated', {
          organizationId,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Notification configuration updated'
        });

      case 'acknowledge-alert':
        // アラートの確認
        const { alertId } = params;
        
        await acknowledgeAlert(organizationId, alertId, userId);

        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged'
        });

      case 'update-custom-rule':
        // カスタムルールの更新
        const { ruleId, updates } = params;
        
        await updateCustomRule(organizationId, ruleId, updates);

        logger.info('Admin: Custom rule updated', {
          organizationId,
          ruleId,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Custom rule updated successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Admin Subscription API: PUT error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: カスタムルール削除、アラート削除など
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const organizationId = searchParams.get('organizationId');
    const targetId = searchParams.get('targetId');

    // 認証チェック
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 管理者権限チェック
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    if (!organizationId || !targetId) {
      return NextResponse.json(
        { error: 'Organization ID and target ID required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'delete-custom-rule':
        await deleteCustomRule(organizationId, targetId);

        logger.info('Admin: Custom rule deleted', {
          organizationId,
          ruleId: targetId,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Custom rule deleted successfully'
        });

      case 'delete-alert':
        await deleteAlert(organizationId, targetId);

        return NextResponse.json({
          success: true,
          message: 'Alert deleted successfully'
        });

      case 'cancel-migration':
        await cancelMigration(organizationId, targetId);

        logger.info('Admin: Migration cancelled', {
          organizationId,
          migrationId: targetId,
          by: userId
        });

        return NextResponse.json({
          success: true,
          message: 'Migration cancelled successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Admin Subscription API: DELETE error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ==================== Helper Functions ====================

async function getAllOrganizationsStats() {
  const snapshot = await adminDb.collection('clients').get();
  const organizations = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const stats = await subscriptionManager.getUsageStats(doc.id);
    
    organizations.push({
      id: doc.id,
      name: data.name,
      plan: data.subscriptionProductId || 'free',
      status: data.status || 'active',
      stats: {
        interviews: stats.currentUsage.interviews || 0,
        themes: stats.currentUsage.themes || 0,
        users: data.userCount || 0
      },
      percentageUsed: Math.max(...Object.values(stats.percentages))
    });
  }

  return organizations;
}

async function getOrganizationAlerts(organizationId: string) {
  const alertsRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('alerts');
  
  const snapshot = await alertsRef
    .where('acknowledged', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function getBillingInfo(organizationId: string): Promise<BillingInfo | null> {
  const clientDoc = await adminDb
    .collection('clients')
    .doc(organizationId)
    .get();

  const clientData = clientDoc.data();
  if (!clientData) return null;

  // Stripeからの情報取得（実装例）
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // const subscription = await stripe.subscriptions.retrieve(clientData.stripeSubscriptionId);

  return {
    organizationId,
    customerId: clientData.stripeCustomerId || '',
    subscriptionId: clientData.stripeSubscriptionId || '',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    cancelAtPeriodEnd: false,
    balance: 0,
    currency: 'JPY'
  };
}

async function resetOrganizationUsage(
  organizationId: string,
  metrics?: string[]
) {
  const usageRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('usage')
    .doc('current');

  if (metrics && metrics.length > 0) {
    // 特定のメトリクスのみリセット
    const updates: Record<string, any> = {};
    for (const metric of metrics) {
      updates[`${metric}.count`] = 0;
      updates[`${metric}.lastReset`] = new Date();
    }
    await usageRef.update(updates);
  } else {
    // 全メトリクスリセット
    const collections = await usageRef.listCollections();
    for (const collection of collections) {
      const docs = await collection.get();
      for (const doc of docs.docs) {
        await doc.ref.delete();
      }
    }
  }
}

async function schedulePlanMigration(
  organizationId: string,
  migration: Partial<PlanMigration>
) {
  const migrationRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('migrations')
    .doc();

  await migrationRef.set({
    ...migration,
    id: migrationRef.id,
    organizationId,
    status: 'pending',
    scheduledAt: new Date(),
    createdAt: new Date()
  });
}

async function updateNotificationConfig(
  organizationId: string,
  config: NotificationConfig
) {
  const configRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('settings')
    .doc('notifications');

  await configRef.set(config, { merge: true });
}

async function acknowledgeAlert(
  organizationId: string,
  alertId: string,
  userId: string
) {
  const alertRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('alerts')
    .doc(alertId);

  await alertRef.update({
    acknowledged: true,
    acknowledgedBy: userId,
    acknowledgedAt: new Date()
  });
}

async function updateCustomRule(
  organizationId: string,
  ruleId: string,
  updates: Partial<CustomRule>
) {
  const ruleRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('customRules')
    .doc(ruleId);

  await ruleRef.update({
    ...updates,
    modifiedAt: new Date()
  });
}

async function deleteCustomRule(
  organizationId: string,
  ruleId: string
) {
  const ruleRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('customRules')
    .doc(ruleId);

  await ruleRef.delete();
}

async function deleteAlert(
  organizationId: string,
  alertId: string
) {
  const alertRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('alerts')
    .doc(alertId);

  await alertRef.delete();
}

async function cancelMigration(
  organizationId: string,
  migrationId: string
) {
  const migrationRef = adminDb
    .collection('clients')
    .doc(organizationId)
    .collection('migrations')
    .doc(migrationId);

  await migrationRef.update({
    status: 'cancelled',
    cancelledAt: new Date()
  });
}