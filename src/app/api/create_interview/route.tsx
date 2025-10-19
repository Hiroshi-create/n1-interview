import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { DocumentReference, DocumentData } from 'firebase-admin/firestore';
import { LimitChecker } from '@/lib/subscription/limit-checker';
import { UsageTracker } from '@/lib/subscription/usage-tracker';
import { getOrganizationId, createLimitError, getFeatureDisplayName } from '@/lib/subscription/helpers';
import { logger } from '@/lib/logger';

interface RequestBody {
  intervieweeId: string;
  themeRefPath: string;
}

interface ServerAnswerInterviews {
  createdAt: FieldValue;
  interviewReference: DocumentReference<DocumentData>;
}

export async function POST(request: Request) {
  let organizationId: string | null = null;
  let concurrentIncremented = false;
  const usageTracker = new UsageTracker();
  let intervieweeId: string | undefined;
  let themeRefPath: string | undefined;

  try {
    ({ intervieweeId, themeRefPath } = await request.json() as RequestBody);

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
      logger.debug('create_interview: 既存のインタビューを返却', {
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

    // ========== サブスクリプション制限チェック開始 ==========
    // 組織IDを取得
    organizationId = await getOrganizationId(intervieweeId);
    
    if (organizationId) {
      const limitChecker = new LimitChecker();
      
      // 1. 月間インタビュー数チェック
      const monthlyCheck = await limitChecker.canUse(organizationId, 'interviews');
      if (!monthlyCheck.allowed) {
        logger.warn('create_interview: 月間インタビュー制限超過', {
          organizationId,
          current: monthlyCheck.current,
          limit: monthlyCheck.limit
        });
        return NextResponse.json(
          createLimitError(
            '月間インタビュー回数',
            monthlyCheck.limit,
            monthlyCheck.current,
            monthlyCheck.remaining
          ),
          { status: 429 }
        );
      }

      // 2. 同時実行数チェック
      const concurrentCheck = await limitChecker.canUseConcurrent(organizationId, 'interviews');
      if (!concurrentCheck.allowed) {
        logger.warn('create_interview: 同時実行数制限超過', {
          organizationId,
          current: concurrentCheck.current,
          limit: concurrentCheck.limit
        });
        return NextResponse.json({
          error: 'concurrent_limit_exceeded',
          message: `同時実行インタビュー数の上限に達しています（${concurrentCheck.current}/${concurrentCheck.limit}）`,
          details: {
            feature: '同時実行インタビュー',
            limit: concurrentCheck.limit,
            current: concurrentCheck.current,
            upgradeUrl: '/client-view/subscriptions'
          }
        }, { status: 429 });
      }

      // 3. インタビュー時間制限を取得（後で使用するため）
      const durationLimit = await limitChecker.getInterviewDurationLimit(organizationId);
      if (durationLimit !== -1 && themeData.interviewDurationMin) {
        const durationMinutes = Math.floor(durationLimit / 60);
        if (themeData.interviewDurationMin > durationMinutes) {
          logger.warn('create_interview: インタビュー時間制限超過', {
            organizationId,
            requestedMinutes: themeData.interviewDurationMin,
            limitMinutes: durationMinutes
          });
          return NextResponse.json({
            error: 'duration_limit_exceeded',
            message: `このプランではインタビュー時間は最大${durationMinutes}分までです`,
            details: {
              feature: 'インタビュー時間',
              requestedMinutes: themeData.interviewDurationMin,
              limitMinutes: durationMinutes,
              upgradeUrl: '/client-view/subscriptions'
            }
          }, { status: 429 });
        }
      }

      logger.info('create_interview: 制限チェック通過', {
        organizationId,
        monthlyRemaining: monthlyCheck.remaining,
        concurrentRemaining: concurrentCheck.remaining
      });
    } else {
      logger.debug('create_interview: 組織なしユーザー（制限なし）', {
        intervieweeId
      });
    }
    // ========== サブスクリプション制限チェック終了 ==========

    // 新規インタビュー作成処理
    const interviewId = uuidv4();
    const answerInterviewId = uuidv4();

    // ========== 使用量カウントアップ（事前） ==========
    // 同時実行数を先にインクリメント（失敗時はfinallyでデクリメント）
    if (organizationId) {
      concurrentIncremented = true;
      await usageTracker.incrementConcurrent(organizationId, 'interviews');
      logger.debug('create_interview: 同時実行数をインクリメント', {
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

    // ========== 使用量カウントアップ（成功時） ==========
    if (organizationId) {
      await usageTracker.incrementUsage(organizationId, 'interviews');
      logger.info('create_interview: インタビュー作成成功・使用量記録', {
        organizationId,
        interviewId,
        intervieweeId
      });
    }

    // 使用量情報を取得
    let usageInfo = null;
    if (organizationId) {
      const limitChecker = new LimitChecker();
      const usageCheck = await limitChecker.canUse(organizationId, 'interviews');
      usageInfo = {
        monthlyUsed: usageCheck.current,
        monthlyLimit: usageCheck.limit
      };
    }

    return NextResponse.json({ 
      success: true, 
      interviewId: interviewId,
      interviewRefPath: interviewDocRef.path,
      exists: false,
      // 制限情報も返す（UIで表示可能）
      ...(usageInfo && { usage: usageInfo })
    });

  } catch (error) {
    logger.error('create_interview: インタビューの作成中にエラーが発生しました', error as Error, {
      intervieweeId: intervieweeId,
      organizationId: organizationId
    });

    // エラー時に同時実行数をデクリメント
    if (concurrentIncremented && organizationId) {
      try {
        await usageTracker.decrementConcurrent(organizationId, 'interviews');
        logger.debug('create_interview: エラー時の同時実行数デクリメント', {
          organizationId
        });
      } catch (decrementError) {
        logger.error('create_interview: 同時実行数のデクリメントに失敗', decrementError as Error, {
          organizationId
        });
      }
    }

    return NextResponse.json({ error: 'インタビューの作成に失敗しました' }, { status: 500 });
  }
}
