import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * すべてのデモインタビューの状況を確認
 * GET /api/demo/check-all-interviews
 */
export async function GET(request: NextRequest) {
  const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
  
  try {
    // テーマドキュメントを取得
    const themeRef = adminDb.doc(`themes/${themeId}`);
    const themeDoc = await themeRef.get();
    
    if (!themeDoc.exists) {
      return NextResponse.json({
        error: 'テーマが見つかりません',
        themeId
      }, { status: 404 });
    }
    
    const themeData = themeDoc.data();
    
    // すべてのインタビューを取得
    const interviewsRef = themeRef.collection('interviews');
    const interviewsSnapshot = await interviewsRef.get();
    
    const interviews = [];
    let totalInterviews = 0;
    let completedInterviews = 0;
    let reportsGenerated = 0;
    let totalMessages = 0;
    
    for (const interviewDoc of interviewsSnapshot.docs) {
      const interviewData = interviewDoc.data();
      totalInterviews++;
      
      if (interviewData.interviewCollected) {
        completedInterviews++;
      }
      
      // メッセージ数をカウント
      const messagesRef = interviewDoc.ref.collection('messages');
      const messagesSnapshot = await messagesRef.get();
      const messageCount = messagesSnapshot.size;
      totalMessages += messageCount;
      
      // レポートの存在を確認
      const reportRef = interviewDoc.ref.collection('individualReport');
      const reportSnapshot = await reportRef.get();
      const hasReport = !reportSnapshot.empty;
      
      if (hasReport) {
        reportsGenerated++;
      }
      
      let reportInfo = null;
      if (hasReport) {
        const reportDoc = reportSnapshot.docs[0];
        const reportData = reportDoc.data();
        reportInfo = {
          reportId: reportDoc.id,
          createdAt: reportData.createdAt,
          reportLength: reportData.report ? reportData.report.length : 0
        };
      }
      
      interviews.push({
        interviewId: interviewDoc.id,
        userInfo: interviewData.userInfo || {},
        status: {
          collected: interviewData.interviewCollected || false,
          reportCreated: interviewData.reportCreated || false,
          hasReportDocument: hasReport
        },
        messageCount,
        reportInfo,
        duration: interviewData.duration || 0
      });
    }
    
    // ペルソナ別の統計
    const personaStats: Record<string, { count: number; withReport: number }> = {};
    interviews.forEach(interview => {
      const occupation = interview.userInfo.occupation || 'Unknown';
      if (!personaStats[occupation]) {
        personaStats[occupation] = {
          count: 0,
          withReport: 0
        };
      }
      personaStats[occupation].count++;
      if (interview.status.hasReportDocument) {
        personaStats[occupation].withReport++;
      }
    });
    
    // 年齢層別の統計
    const ageStats: Record<string, { count: number; withReport: number }> = {};
    interviews.forEach(interview => {
      const age = interview.userInfo.age || 'Unknown';
      if (!ageStats[age]) {
        ageStats[age] = {
          count: 0,
          withReport: 0
        };
      }
      ageStats[age].count++;
      if (interview.status.hasReportDocument) {
        ageStats[age].withReport++;
      }
    });
    
    const summary = {
      theme: {
        themeId: themeId,
        theme: themeData?.theme || '新製品開発のためのユーザーインタビュー',
        description: themeData?.description
      },
      statistics: {
        totalInterviews,
        completedInterviews,
        reportsGenerated,
        totalMessages,
        averageMessagesPerInterview: totalInterviews > 0 ? Math.round(totalMessages / totalInterviews) : 0,
        completionRate: totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0,
        reportGenerationRate: completedInterviews > 0 ? Math.round((reportsGenerated / completedInterviews) * 100) : 0
      },
      personaDistribution: personaStats,
      ageDistribution: ageStats,
      interviews: interviews.sort((a, b) => a.interviewId.localeCompare(b.interviewId))
    };
    
    logger.info('全インタビューステータス確認', {
      themeId,
      totalInterviews,
      reportsGenerated
    });
    
    return NextResponse.json(summary);
    
  } catch (error) {
    logger.error('全インタビューステータス確認エラー', error as Error);
    return NextResponse.json(
      { 
        error: 'ステータス確認に失敗しました',
        details: (error as Error).message
      },
      { status: 500 }
    );
  }
}