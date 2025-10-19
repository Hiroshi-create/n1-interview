import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import type { 
  CreateSessionRequest, 
  SessionResponse, 
  ChatSession,
  ChatMessage,
  ErrorResponse 
} from '@/types/ai-marketer';
import { ContextGenerator } from '@/lib/ai-marketer/context-generator';

/**
 * セッション作成
 * POST /api/ai-marketer/session
 */
export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ErrorResponse>(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { error: '無効なトークンです' },
        { status: 401 }
      );
    }

    const { themeId, userId, themeName }: CreateSessionRequest = await req.json();

    if (!themeId || !userId || !themeName) {
      return NextResponse.json<ErrorResponse>(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    logger.info('AI Marketer Session: セッション作成開始', {
      themeId,
      userId
    });

    // コンテキストを生成してサマリー情報を取得
    const contextGenerator = new ContextGenerator(themeId);
    const context = await contextGenerator.generateContext();

    // 新しいセッションを作成
    const sessionId = uuidv4();
    const session: ChatSession = {
      sessionId,
      themeId,
      userId,
      createdAt: FieldValue.serverTimestamp() as any,
      updatedAt: FieldValue.serverTimestamp() as any,
      metadata: {
        themeName,
        totalInterviews: context.statistics.totalInterviews,
        reportSummary: context.summaryReport.summary.substring(0, 1000),
        keyFindings: context.summaryReport.keyPoints.slice(0, 5),
        personas: context.statistics.personas.slice(0, 5).map(p => p.name)
      },
      status: 'active'
    };

    // Firestoreに保存
    await adminDb
      .collection('ai_marketer_sessions')
      .doc(sessionId)
      .set(session);

    logger.info('AI Marketer Session: セッション作成完了', {
      sessionId,
      themeId
    });

    const response: SessionResponse = {
      sessionId,
      session,
      recentMessages: []
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('AI Marketer Session: エラー', error as Error);
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'セッションの作成に失敗しました',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * セッション取得
 * GET /api/ai-marketer/session?sessionId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    // セッションを取得
    const sessionDoc = await adminDb
      .collection('ai_marketer_sessions')
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return NextResponse.json<ErrorResponse>(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    const session = sessionDoc.data() as ChatSession;

    // ユーザーIDの確認（オプション）
    if (userId && session.userId !== userId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'アクセス権限がありません' },
        { status: 403 }
      );
    }

    // 最近のメッセージを取得（最新10件）
    const messagesSnapshot = await adminDb
      .collection('ai_marketer_messages')
      .where('sessionId', '==', sessionId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentMessages = messagesSnapshot.docs
      .map(doc => doc.data() as ChatMessage)
      .reverse(); // 時系列順に並び替え

    const response: SessionResponse = {
      sessionId,
      session,
      recentMessages
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('AI Marketer Session GET: エラー', error as Error);
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'セッションの取得に失敗しました',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * セッションアーカイブ
 * DELETE /api/ai-marketer/session?sessionId=xxx
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    // セッションをアーカイブ（削除ではなくステータス変更）
    await adminDb
      .collection('ai_marketer_sessions')
      .doc(sessionId)
      .update({
        status: 'archived',
        updatedAt: FieldValue.serverTimestamp()
      });

    logger.info('AI Marketer Session: セッションアーカイブ完了', {
      sessionId
    });

    return NextResponse.json({ 
      success: true,
      message: 'セッションをアーカイブしました' 
    });

  } catch (error) {
    logger.error('AI Marketer Session DELETE: エラー', error as Error);
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'セッションのアーカイブに失敗しました',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}