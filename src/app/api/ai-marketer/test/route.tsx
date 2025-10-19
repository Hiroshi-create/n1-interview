import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Marketerのテスト用エンドポイント
 * GET /api/ai-marketer/test
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Marketer APIは正常に動作しています',
    timestamp: new Date().toISOString(),
    env: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasFirebaseConfig: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    }
  });
}

/**
 * テスト用のPOSTエンドポイント  
 * POST /api/ai-marketer/test
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 簡単なエコーレスポンス
    return NextResponse.json({
      status: 'ok',
      message: 'POSTリクエストを受信しました',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'リクエストの処理に失敗しました',
      error: (error as Error).message
    }, { status: 400 });
  }
}