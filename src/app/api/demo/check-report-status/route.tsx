import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * デモインタビューのレポート生成状況を確認するAPI
 * GET /api/demo/check-report-status
 */
export async function GET(request: NextRequest) {
  const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
  const interviewId = '01adc61b-b4fb-4bab-8446-5c2a6250f4d0';
  
  try {
    // インタビュードキュメントを取得
    const interviewRef = adminDb.doc(`themes/${themeId}/interviews/${interviewId}`);
    const interviewDoc = await interviewRef.get();
    
    if (!interviewDoc.exists) {
      return NextResponse.json({
        exists: false,
        message: 'インタビューが見つかりません'
      });
    }
    
    const interviewData = interviewDoc.data();
    
    // レポートコレクションを確認
    const reportCollectionRef = interviewRef.collection('individualReport');
    const reportSnapshot = await reportCollectionRef.get();
    
    let reportInfo = null;
    let reportSummary = null;
    
    if (!reportSnapshot.empty) {
      const reportDoc = reportSnapshot.docs[0];
      const reportData = reportDoc.data();
      reportInfo = {
        reportId: reportDoc.id,
        createdAt: reportData.createdAt,
        hasContent: !!reportData.report
      };
      
      // レポートの冒頭部分を取得（サマリー用）
      if (reportData.report) {
        const lines = reportData.report.split('\n').slice(0, 10);
        reportSummary = lines.join('\n').substring(0, 500) + '...';
      }
    }
    
    // メッセージ数をカウント
    const messagesRef = interviewRef.collection('messages');
    const messagesSnapshot = await messagesRef.get();
    const messageCount = messagesSnapshot.size;
    
    const status = {
      exists: true,
      interviewCollected: interviewData?.interviewCollected || false,
      reportCreated: interviewData?.reportCreated || false,
      hasReportDocument: !reportSnapshot.empty,
      reportId: reportInfo?.reportId || null,
      reportCreatedAt: reportInfo?.createdAt || null,
      messageCount: messageCount,
      reportSummary: reportSummary,
      path: {
        interview: `themes/${themeId}/interviews/${interviewId}`,
        report: reportInfo ? `themes/${themeId}/interviews/${interviewId}/individualReport/${reportInfo.reportId}` : null
      },
      timestamps: {
        interviewStart: interviewData?.startTime || null,
        interviewEnd: interviewData?.endTime || null,
        reportCreated: reportInfo?.createdAt || null
      }
    };
    
    logger.info('レポート状況確認', {
      interviewId,
      status: {
        collected: status.interviewCollected,
        reportCreated: status.reportCreated,
        hasReport: status.hasReportDocument
      }
    });
    
    return NextResponse.json(status);
    
  } catch (error) {
    logger.error('レポート状況確認エラー', error as Error);
    return NextResponse.json(
      { 
        error: 'ステータス確認に失敗しました',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}