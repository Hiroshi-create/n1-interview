import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';
import { DocumentData, DocumentReference, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { LimitChecker } from '@/lib/subscription/limit-checker';
import { UsageTracker } from '@/lib/subscription/usage-tracker';
import { createLimitError, getFeatureDisplayName } from '@/lib/subscription/helpers';
import { logger } from '@/lib/logger';

interface ServerAnswerInterviews {
  createdAt: FieldValue;
  interviewReference: DocumentReference<DocumentData>;
}

interface ServerManageThemes {
  createdAt: Timestamp | FieldValue;
  themeReference: DocumentReference<DocumentData>;
}

interface RequestBody {
  theme: string;
  isCustomer: boolean;
  isTest: boolean;
  userId: string;
  duration: number;
  isPublic: boolean;
  deadline: string;
  maximumNumberOfInterviews: number;
}

export async function POST(request: Request) {
  let theme: string | undefined;
  let isCustomer: boolean | undefined;
  let isTest: boolean | undefined;
  let userId: string | undefined;
  let duration: number | undefined;
  let isPublic: boolean | undefined;
  let deadline: string | undefined;
  let maximumNumberOfInterviews: number | undefined;

  try {
    ({ theme, isCustomer, isTest, userId, duration, isPublic, deadline, maximumNumberOfInterviews } = await request.json() as RequestBody);

    if (!theme || !userId || !duration || !deadline || !maximumNumberOfInterviews) {
      return NextResponse.json({ error: "無効なデータです" }, { status: 400 });
    }

    // ユーザードキュメントから organizationId を取得
    const userDocRef = adminDb.doc(`users/${userId}`);
    const userDocSnap = await userDocRef.get();
    if (!userDocSnap.exists) {
        return NextResponse.json({ error: 'ユーザードキュメントが見つかりません' }, { status: 404 });
    }
    const userData = userDocSnap.data();
    const organizationId = userData?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: '組織IDが見つかりません' }, { status: 400 });
    }

    // ========== サブスクリプション制限チェック開始 ==========
    const limitChecker = new LimitChecker();
    const usageTracker = new UsageTracker();
    
    // 現在のテーマ数を取得
    const themesQuery = await adminDb.collection('themes')
      .where('clientId', '==', organizationId)
      .count()
      .get();
    const currentThemeCount = themesQuery.data().count;
    
    // テーマ数制限チェック
    const themeLimit = await limitChecker.getPlanLimit(organizationId, 'theme_max');
    
    if (themeLimit !== -1 && currentThemeCount >= themeLimit) {
      logger.warn('create_theme: テーマ作成数制限超過', {
        organizationId,
        current: currentThemeCount,
        limit: themeLimit,
        userId
      });
      
      return NextResponse.json(
        createLimitError(
          'テーマ作成数',
          themeLimit,
          currentThemeCount,
          0
        ),
        { status: 429 }
      );
    }
    
    logger.info('create_theme: 制限チェック通過', {
      organizationId,
      currentThemes: currentThemeCount,
      themeLimit,
      userId
    });
    // ========== サブスクリプション制限チェック終了 ==========

    const parsedMaximumNumberOfInterviews = Number(maximumNumberOfInterviews);
    if (isNaN(parsedMaximumNumberOfInterviews) || parsedMaximumNumberOfInterviews <= 0) {
      return NextResponse.json({ error: "無効な最大インタビュー数です" }, { status: 400 });
    }

    const newThemeId = uuidv4();
    const intervieweeIds = isTest ? [userId] : [userId];

    const interviewUrl = `${process.env.ROOT_DOMAIN}/auto-interview/guest-user/${newThemeId}`;

    const newThemeData: Theme = {
      themeId: newThemeId,
      theme: theme,
      createUserId: userId,
      createdAt: Timestamp.now(),
      deadline: Timestamp.fromDate(new Date(deadline)),
      clientId: organizationId,
      interviewsRequestedCount: 0,
      collectInterviewsCount: 0,
      interviewDurationMin: duration,
      isPublic: isPublic !== undefined ? isPublic : true,
      maximumNumberOfInterviews: parsedMaximumNumberOfInterviews,
      interviewResponseURL: interviewUrl,
      reportCreated: false,
    };
    const newThemeRef = adminDb.doc(`themes/${newThemeId}`);
    await newThemeRef.set(newThemeData);

    const interviewsCollection = newThemeRef.collection('interviews');
    const promises = intervieweeIds.map(async (intervieweeId) => {
      const interviewId = uuidv4();
      const answerInterviewId = uuidv4();
      const manageThemeId = uuidv4();

      const interviewDocRef = interviewsCollection.doc(interviewId);
      const interviewData: Interviews = {
        interviewId: interviewId,
        intervieweeId: intervieweeId,
        answerInterviewId: answerInterviewId,
        createdAt: FieldValue.serverTimestamp(),
        questionCount: 0,
        reportCreated: false,
        interviewCollected: false,
        interviewDurationMin: duration || 30,
        themeId: newThemeId,
        temporaryId: null,
        confirmedUserId: null,
      };
      await interviewDocRef.set(interviewData);

      // users コレクションの intervieweeId に answerInterviews サブコレクションを作成
      const userAnswerInterviewsCollection = adminDb.collection(`users/${intervieweeId}/answerInterviews`);
      const answerInterviewDocRef = userAnswerInterviewsCollection.doc(answerInterviewId);
      const answerInterviewData: ServerAnswerInterviews = {
        createdAt: FieldValue.serverTimestamp(),
        interviewReference: interviewDocRef,
      };
      await answerInterviewDocRef.set(answerInterviewData);

      // clients コレクションの organizationId に manageThemes サブコレクションを作成
      const clientManageThemesCollection = adminDb.collection(`clients/${organizationId}/manageThemes`);
      const manageThemeDocRef = clientManageThemesCollection.doc(manageThemeId);
      const manageThemeData: ServerManageThemes = {
        createdAt: FieldValue.serverTimestamp(),
        themeReference: newThemeRef,
      };
      return manageThemeDocRef.set(manageThemeData);
    });

    await Promise.all(promises);

    // ========== 使用量記録 ==========
    await usageTracker.incrementUsage(organizationId, 'themes');
    logger.info('create_theme: テーマ作成成功・使用量記録', {
      organizationId,
      themeId: newThemeId,
      theme,
      userId
    });
    // ========== 使用量記録終了 ==========

    return NextResponse.json({ 
      success: true, 
      newThemeId, 
      interviewUrl,
      // 制限情報も返す
      usage: {
        themesUsed: currentThemeCount + 1,
        themesLimit: themeLimit
      }
    });
  } catch (error) {
    logger.error('create_theme: テーマの作成中にエラーが発生しました', error as Error, {
      userId: userId,
      theme: theme
    });
    return NextResponse.json({ error: 'テーマの作成に失敗しました' }, { status: 500 });
  }
}
