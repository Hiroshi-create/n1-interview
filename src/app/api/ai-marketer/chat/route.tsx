import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ChatRequest, 
  ChatResponse, 
  ChatMessage,
  ErrorResponse 
} from '@/types/ai-marketer';
import { ContextGenerator } from '@/lib/ai-marketer/context-generator';
import { 
  generateSystemPrompt, 
  enhancePromptByFocus,
  generateQuestionContext,
  generateInitialMessage,
  generateErrorMessage
} from '@/lib/ai-marketer/prompt-templates';

// OpenAI クライアント初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * チャットメッセージ処理
 * POST /api/ai-marketer/chat
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { sessionId, themeId, userId, message, context }: ChatRequest = await req.json();

    if (!themeId || !userId || !message) {
      return NextResponse.json<ErrorResponse>(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    logger.info('AI Marketer Chat: リクエスト受信', {
      sessionId,
      themeId,
      messageLength: message.length
    });

    // セッションIDの処理（新規作成または既存使用）
    let currentSessionId = sessionId;
    // temp-で始まる一時的なセッションIDも新規作成扱い
    if (!currentSessionId || currentSessionId.startsWith('temp-')) {
      // セッションが存在しない場合は新規作成
      currentSessionId = uuidv4();
      const contextGen = new ContextGenerator(themeId);
      const aiContext = await contextGen.generateContext();
      
      await adminDb.collection('ai_marketer_sessions').doc(currentSessionId).set({
        sessionId: currentSessionId,
        themeId,
        userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metadata: {
          themeName: aiContext.themeName,
          totalInterviews: aiContext.statistics.totalInterviews,
          reportSummary: aiContext.summaryReport.summary.substring(0, 1000),
          keyFindings: aiContext.summaryReport.keyPoints.slice(0, 5),
          personas: aiContext.statistics.personas.slice(0, 5).map(p => p.name)
        },
        status: 'active'
      });
    }

    // ユーザーメッセージをテーマ別コレクションに保存
    const userMessageId = uuidv4();
    const userMessage: ChatMessage = {
      messageId: userMessageId,
      sessionId: currentSessionId,
      text: message,
      sender: 'user',
      timestamp: FieldValue.serverTimestamp() as any,
      read: true
    };
    
    // themes/[themeId]/ai-marketerコレクションに保存
    await adminDb
      .collection('themes')
      .doc(themeId)
      .collection('ai-marketer')
      .doc(userMessageId)
      .set({
        ...userMessage,
        userId,
        createdAt: FieldValue.serverTimestamp()
      });

    // コンテキストを生成
    const contextGenerator = new ContextGenerator(themeId);
    const aiContext = await contextGenerator.generateContext();

    // 質問に関連する追加コンテキストを取得
    const topicContext = await contextGenerator.extractTopicContext(message);

    // システムプロンプトを生成
    let systemPrompt = generateSystemPrompt(aiContext);
    systemPrompt = enhancePromptByFocus(systemPrompt, context?.focusArea);
    
    if (topicContext.length > 0) {
      systemPrompt += generateQuestionContext(message, topicContext);
    }

    // テーマ別コレクションから会話履歴を取得
    let conversationHistory: any[] = [];
    try {
      // themes/[themeId]/ai-marketerコレクションから取得
      const historySnapshot = await adminDb
        .collection('themes')
        .doc(themeId)
        .collection('ai-marketer')
        .where('userId', '==', userId)
        .get();
      
      // JavaScriptでソートと制限を実行
      const messages = historySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage & { id: string }))
        .sort((a, b) => {
          // timestampを比較（Firestore Timestampオブジェクトの場合）
          const timeA = (a.timestamp as any)?.seconds || 0;
          const timeB = (b.timestamp as any)?.seconds || 0;
          return timeB - timeA; // 降順
        })
        .slice(0, 10); // 最新10件
      
      conversationHistory = messages
        .reverse()
        .slice(0, -1) // 最後のメッセージ（現在のユーザーメッセージ）を除外
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
    } catch (error) {
      logger.warn('会話履歴の取得に失敗しました。新しい会話として処理します。', { 
        error: (error as Error).message 
      });
      conversationHistory = [];
    }

    // 初回メッセージの場合
    if (conversationHistory.length === 0 && message.toLowerCase().includes('こんにちは')) {
      const initialMessage = generateInitialMessage(aiContext);
      
      // AI応答をテーマ別コレクションに保存
      const aiMessageId = uuidv4();
      const aiMessage: ChatMessage = {
        messageId: aiMessageId,
        sessionId: currentSessionId,
        text: initialMessage,
        sender: 'ai',
        timestamp: FieldValue.serverTimestamp() as any,
        metadata: {
          model: 'initial',
          processingTime: Date.now() - startTime
        }
      };
      
      // themes/[themeId]/ai-marketerコレクションに保存
      await adminDb
        .collection('themes')
        .doc(themeId)
        .collection('ai-marketer')
        .doc(aiMessageId)
        .set({
          ...aiMessage,
          userId,
          createdAt: FieldValue.serverTimestamp()
        });

      const response: ChatResponse = {
        messageId: aiMessageId,
        sessionId: currentSessionId,
        response: initialMessage,
        metadata: {
          model: 'initial',
          tokens: 0,
          processingTime: Date.now() - startTime
        }
      };

      return NextResponse.json(response);
    }

    // OpenAI APIを呼び出し
    const completion = await openai.chat.completions.create({
      model: context?.includeFullReport ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo-16k',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory as any[],
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0].message.content || '';
    const totalTokens = completion.usage?.total_tokens || 0;

    // 次の質問の提案を生成（オプション）
    let suggestions: string[] = [];
    if (message.length > 10) {
      suggestions = generateSuggestions(aiResponse, aiContext);
    }

    // AI応答をテーマ別コレクションに保存
    const aiMessageId = uuidv4();
    const aiMessage: ChatMessage = {
      messageId: aiMessageId,
      sessionId: currentSessionId,
      text: aiResponse,
      sender: 'ai',
      timestamp: FieldValue.serverTimestamp() as any,
      metadata: {
        tokens: totalTokens,
        model: completion.model,
        processingTime: Date.now() - startTime
      }
    };
    
    // themes/[themeId]/ai-marketerコレクションに保存
    await adminDb
      .collection('themes')
      .doc(themeId)
      .collection('ai-marketer')
      .doc(aiMessageId)
      .set({
        ...aiMessage,
        userId,
        createdAt: FieldValue.serverTimestamp()
      });

    // セッションの最終更新時刻を更新（存在確認付き）
    try {
      const sessionRef = adminDb.collection('ai_marketer_sessions').doc(currentSessionId);
      const sessionDoc = await sessionRef.get();
      
      if (sessionDoc.exists) {
        await sessionRef.update({
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        // セッションが存在しない場合は新規作成（念のため）
        logger.warn('セッションが存在しないため新規作成:', { sessionId: currentSessionId });
        await sessionRef.set({
          sessionId: currentSessionId,
          themeId,
          userId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          metadata: {
            themeName: aiContext.themeName,
            totalInterviews: aiContext.statistics.totalInterviews,
            reportSummary: aiContext.summaryReport.summary.substring(0, 1000),
            keyFindings: aiContext.summaryReport.keyPoints.slice(0, 5),
            personas: aiContext.statistics.personas.slice(0, 5).map(p => p.name)
          },
          status: 'active'
        });
      }
    } catch (error) {
      logger.warn('セッション更新をスキップ:', { 
        error: (error as Error).message 
      });
      // セッション更新のエラーは致命的ではないので処理を続行
    }

    logger.info('AI Marketer Chat: 応答生成完了', {
      sessionId: currentSessionId,
      responseLength: aiResponse.length,
      tokens: totalTokens,
      processingTime: Date.now() - startTime
    });

    const response: ChatResponse = {
      messageId: aiMessageId,
      sessionId: currentSessionId,
      response: aiResponse,
      suggestions,
      metadata: {
        model: completion.model,
        tokens: totalTokens,
        processingTime: Date.now() - startTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('AI Marketer Chat: エラー', error as Error);
    
    // エラーメッセージを生成
    const errorMessage = generateErrorMessage((error as Error).message);
    
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'チャット処理中にエラーが発生しました',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

/**
 * 次の質問の提案を生成
 */
function generateSuggestions(aiResponse: string, context: any): string[] {
  const suggestions: string[] = [];
  
  // AIの応答から重要なトピックを抽出
  if (aiResponse.includes('マーケティング')) {
    suggestions.push('具体的なマーケティング施策について教えてください');
  }
  if (aiResponse.includes('ペルソナ')) {
    suggestions.push('各ペルソナへの具体的なアプローチ方法は？');
  }
  if (aiResponse.includes('価格') || aiResponse.includes('コスト')) {
    suggestions.push('価格戦略についてもっと詳しく教えてください');
  }
  if (aiResponse.includes('競合')) {
    suggestions.push('競合との差別化戦略について詳しく説明してください');
  }
  
  // コンテキストから追加の提案
  if (context.statistics.totalInterviews > 30) {
    suggestions.push('大規模データから見える傾向について教えてください');
  }
  
  return suggestions.slice(0, 3); // 最大3つまで
}

/**
 * チャット履歴取得
 * GET /api/ai-marketer/chat?sessionId=xxx&limit=20
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!sessionId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    // テーマ別コレクションからメッセージ履歴を取得
    const themeId = searchParams.get('themeId');
    if (!themeId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'テーマIDが必要です' },
        { status: 400 }
      );
    }
    
    const messagesSnapshot = await adminDb
      .collection('themes')
      .doc(themeId)
      .collection('ai-marketer')
      .get();

    // JavaScriptでソートと制限を実行
    const messages = messagesSnapshot.docs
      .map(doc => doc.data() as ChatMessage)
      .sort((a, b) => {
        // Timestamp または Date の適切な処理
        const timeA = a.timestamp 
          ? (typeof a.timestamp === 'object' && 'seconds' in a.timestamp 
              ? a.timestamp.seconds 
              : (a.timestamp as Date).getTime() / 1000)
          : 0;
        const timeB = b.timestamp 
          ? (typeof b.timestamp === 'object' && 'seconds' in b.timestamp 
              ? b.timestamp.seconds 
              : (b.timestamp as Date).getTime() / 1000)
          : 0;
        return timeB - timeA; // 降順
      })
      .slice(0, limit) // 指定された件数まで
      .reverse(); // 時系列順に並び替え

    return NextResponse.json({ 
      sessionId,
      messages,
      total: messages.length 
    });

  } catch (error) {
    logger.error('AI Marketer Chat GET: エラー', error as Error);
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'チャット履歴の取得に失敗しました',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

/**
 * CORS対応のためのOPTIONSハンドラー
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}