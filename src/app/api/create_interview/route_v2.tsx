import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { DocumentReference, DocumentData } from 'firebase-admin/firestore';
import { SubscriptionManager } from '@/lib/subscription/subscription-manager';
import { getOrganizationId } from '@/lib/subscription/helpers';
import { logger } from '@/lib/logger';
import { CustomRule } from '@/types/subscription';

interface RequestBody {
  intervieweeId: string;
  themeRefPath: string;
}

interface ServerAnswerInterviews {
  createdAt: FieldValue;
  interviewReference: DocumentReference<DocumentData>;
}

// SubscriptionManagerのシングルトンインスタンス
const subscriptionManager = new SubscriptionManager({
  enableNotifications: true,
  enableAnalytics: true,
  enableCaching: true,
  cacheExpiry: 5
});

export async function POST(request: Request) {
  let organizationId: string | null = null;
  let concurrentReleaseNeeded = false;
  let intervieweeId: string | undefined;

  try {
    const requestBody: RequestBody = await request.json();
    intervieweeId = requestBody.intervieweeId;
    const themeRefPath = requestBody.themeRefPath;

    if (!intervieweeId || !themeRefPath) {
      return NextResponse.json({ error: "無効なデータです" }, { status: 400 });
    }

    const themeDocRef = adminDb.doc(themeRefPath);
    const themeDocSnap = await themeDocRef.get();
    if (!themeDocSnap.exists) {
      return NextResponse.json({ error: 'テーマドキュメントが見つかりません' }, { status: 404 });
    }
    const themeData = themeDocSnap.data() as Theme;

    const interviewsCollection = themeDocRef.collection('interviews');

    // 既存のインタビューを検索
    const querySnapshot = await interviewsCollection.where('intervieweeId', '==', intervieweeId).get();

    if (!querySnapshot.empty) {
      // 既存のインタビューがある場合は最初のドキュメントを取得
      const existingInterview = querySnapshot.docs[0];
      const existingInterviewData = existingInterview.data() as Interviews;
      logger.debug('create_interview_v2: 既存のインタビューを返却', {
        interviewId: existingInterviewData.interviewId,
        intervieweeId
      });
      return NextResponse.json({ 
        success: true, 
        interviewId: existingInterviewData.interviewId,
        interviewRefPath: existingInterview.ref.path,
        exists: true
      });
    }

    // ========== 改善されたサブスクリプション制限チェック ==========
    organizationId = await getOrganizationId(intervieweeId);
    
    if (organizationId) {
      // カスタムルールを含む包括的なチェック
      const customRules = await getCustomRules(organizationId);
      
      // 1. 月間インタビュー数チェック
      const monthlyCheck = await subscriptionManager.canUseFeature(
        organizationId,
        'interviews',
        {
          notifyOnLimit: true,
          customRules
        }
      );

      if (!monthlyCheck.allowed) {
        logger.warn('create_interview_v2: 月間インタビュー制限超過', {
          organizationId,
          reason: monthlyCheck.reason,
          usage: monthlyCheck.usage
        });
        
        return NextResponse.json({
          error: 'limit_exceeded',
          message: monthlyCheck.reason || '月間インタビュー回数の上限に達しています',
          details: {
            feature: 'interviews',
            ...monthlyCheck.usage,
            suggestions: monthlyCheck.suggestions
          }
        }, { status: 429 });
      }

      // 2. 同時実行数チェック
      const concurrentCheck = await subscriptionManager.canUseFeature(
        organizationId,
        'concurrent_interviews',
        {
          checkConcurrent: true,
          notifyOnLimit: true,
          customRules
        }
      );

      if (!concurrentCheck.allowed) {
        logger.warn('create_interview_v2: 同時実行数制限超過', {
          organizationId,
          reason: concurrentCheck.reason,
          usage: concurrentCheck.usage
        });
        
        return NextResponse.json({
          error: 'concurrent_limit_exceeded',
          message: concurrentCheck.reason || '同時実行インタビュー数の上限に達しています',
          details: {
            feature: 'concurrent_interviews',
            ...concurrentCheck.usage,
            suggestions: concurrentCheck.suggestions
          }
        }, { status: 429 });
      }

      // 3. インタビュー時間制限チェック（テーマ設定と比較）
      const durationCheck = await subscriptionManager.canUseFeature(
        organizationId,
        'interview_duration',
        {
          amount: themeData.interviewDurationMin,
          customRules
        }
      );

      if (!durationCheck.allowed) {
        logger.warn('create_interview_v2: インタビュー時間制限超過', {
          organizationId,
          requestedMinutes: themeData.interviewDurationMin,
          reason: durationCheck.reason
        });
        
        return NextResponse.json({
          error: 'duration_limit_exceeded',
          message: durationCheck.reason || `インタビュー時間が制限を超えています`,
          details: {
            feature: 'interview_duration',
            requestedMinutes: themeData.interviewDurationMin,
            ...durationCheck.usage,
            suggestions: durationCheck.suggestions
          }
        }, { status: 429 });
      }

      logger.info('create_interview_v2: 全制限チェック通過', {
        organizationId,
        intervieweeId,
        themeId: themeData.themeId
      });
    } else {
      logger.debug('create_interview_v2: 組織なしユーザー（制限なし）', {
        intervieweeId
      });
    }

    // ========== インタビュー作成処理 ==========
    const interviewId = uuidv4();
    const answerInterviewId = uuidv4();

    // 同時実行数を先にインクリメント
    if (organizationId) {
      await subscriptionManager.recordUsage(
        organizationId,
        'concurrent_interviews',
        1,
        { 
          concurrent: true,
          metadata: {
            interviewId,
            themeId: themeData.themeId,
            startedAt: new Date()
          }
        }
      );
      concurrentReleaseNeeded = true;
      logger.debug('create_interview_v2: 同時実行数をインクリメント', {
        organizationId
      });
    }

    const interviewDocRef = interviewsCollection.doc(interviewId);
    const interviewData: Interviews = {
      interviewId: interviewId,
      intervieweeId: intervieweeId,
      answerInterviewId: answerInterviewId,
      createdAt: FieldValue.serverTimestamp(),
      questionCount: 0,
      reportCreated: false,
      interviewCollected: false,
      interviewDurationMin: themeData.interviewDurationMin,
      themeId: themeData.themeId,
      temporaryId: null,
      confirmedUserId: null,
    };
    await interviewDocRef.set(interviewData);

    // users コレクションの answerInterviews 作成
    const userAnswerInterviewsCollection = adminDb.collection("users").doc(intervieweeId).collection("answerInterviews");
    const answerInterviewDocRef = userAnswerInterviewsCollection.doc(answerInterviewId);
    const answerInterviewData: ServerAnswerInterviews = {
      createdAt: FieldValue.serverTimestamp(),
      interviewReference: interviewDocRef,
    };
    await answerInterviewDocRef.set(answerInterviewData);

    // ========== 月間使用量の記録 ==========
    if (organizationId) {
      await subscriptionManager.recordUsage(
        organizationId,
        'interviews',
        1,
        {
          metadata: {
            interviewId,
            themeId: themeData.themeId,
            intervieweeId,
            createdAt: new Date()
          }
        }
      );
      
      logger.info('create_interview_v2: インタビュー作成成功・使用量記録', {
        organizationId,
        interviewId,
        intervieweeId
      });
    }

    // 使用統計情報を取得して返す
    let usageStats = null;
    if (organizationId) {
      const stats = await subscriptionManager.getUsageStats(organizationId);
      usageStats = {
        monthlyUsed: stats.currentUsage.interviews || 0,
        monthlyLimit: stats.limits.interviews || -1,
        monthlyPercentage: stats.percentages.interviews || 0,
        concurrentUsed: stats.currentUsage.concurrent_interviews || 0,
        concurrentLimit: stats.limits.concurrent_interviews || -1,
        nextReset: stats.nextReset,
        planName: stats.planName,
        // アラートがある場合は含める
        alerts: stats.alerts?.filter(a => !a.acknowledged)
      };
    }

    return NextResponse.json({ 
      success: true, 
      interviewId: interviewId,
      interviewRefPath: interviewDocRef.path,
      exists: false,
      // 詳細な使用統計を返す
      usage: usageStats
    });

  } catch (error) {
    logger.error('create_interview_v2: インタビューの作成中にエラーが発生しました', error as Error, {
      intervieweeId,
      organizationId
    });

    // エラー時に同時実行数をリリース
    if (concurrentReleaseNeeded && organizationId) {
      try {
        await subscriptionManager.releaseUsage(organizationId, 'concurrent_interviews');
        logger.debug('create_interview_v2: エラー時の同時実行数リリース', {
          organizationId
        });
      } catch (releaseError) {
        logger.error('create_interview_v2: 同時実行数のリリースに失敗', releaseError as Error, {
          organizationId
        });
      }
    }

    return NextResponse.json({ error: 'インタビューの作成に失敗しました' }, { status: 500 });
  }
}

// カスタムルールを取得するヘルパー関数
async function getCustomRules(organizationId: string): Promise<CustomRule[]> {
  try {
    const rulesSnapshot = await adminDb
      .collection('clients')
      .doc(organizationId)
      .collection('customRules')
      .where('active', '==', true)
      .orderBy('priority', 'desc')
      .get();

    return rulesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CustomRule));
  } catch (error) {
    logger.debug('create_interview_v2: カスタムルール取得エラー', {
      error: (error as Error).message
    });
    return [];
  }
}