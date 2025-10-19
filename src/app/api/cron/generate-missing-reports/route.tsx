import { NextRequest, NextResponse } from 'next/server';
import { generateMissingReports } from '@/lib/report/auto-report-generator';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';

/**
 * 未生成レポートを定期的にチェックして生成するCronジョブAPI
 * 
 * 使用方法:
 * - Vercel Cron: vercel.jsonで設定
 * - 手動実行: GET /api/cron/generate-missing-reports?secret=YOUR_SECRET
 */

export async function GET(request: NextRequest) {
  try {
    // セキュリティチェック（本番環境用）
    const authHeader = headers().get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (process.env.NODE_ENV === 'production') {
      // Vercel Cronからの呼び出しをチェック
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        // URLパラメータでのsecretもチェック（手動実行用）
        const { searchParams } = new URL(request.url);
        const urlSecret = searchParams.get('secret');
        
        if (urlSecret !== cronSecret) {
          logger.warn('generate-missing-reports: 認証失敗');
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get('themeId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5; // デフォルト5件

    logger.info('generate-missing-reports: Cronジョブ開始', {
      themeId,
      limit
    });

    // 未生成レポートの検出と生成
    const startTime = Date.now();
    const results = await generateMissingReports(
      themeId || undefined,
      limit
    );
    const duration = Date.now() - startTime;

    logger.info('generate-missing-reports: Cronジョブ完了', {
      ...results,
      duration,
      themeId
    });

    // 結果をレスポンス
    return NextResponse.json({
      success: true,
      message: 'レポート生成処理が完了しました',
      results: {
        processed: results.processed,
        succeeded: results.succeeded,
        failed: results.failed,
        successRate: results.processed > 0 
          ? Math.round((results.succeeded / results.processed) * 100) 
          : 0
      },
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('generate-missing-reports: Cronジョブエラー', error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'レポート生成処理中にエラーが発生しました',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 特定のインタビューのレポートを手動生成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interviewRefPaths, themeId, forceRegenerate = false } = body;

    if (!interviewRefPaths && !themeId) {
      return NextResponse.json(
        { error: 'interviewRefPathsまたはthemeIdが必要です' },
        { status: 400 }
      );
    }

    logger.info('generate-missing-reports: 手動生成リクエスト', {
      pathCount: interviewRefPaths?.length,
      themeId,
      forceRegenerate
    });

    // 実装予定: 特定のインタビューリストに対する一括生成
    // TODO: 実装

    return NextResponse.json({
      success: true,
      message: '手動生成機能は実装予定です'
    });

  } catch (error) {
    logger.error('generate-missing-reports: POST処理エラー', error as Error);
    return NextResponse.json(
      { error: '処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}