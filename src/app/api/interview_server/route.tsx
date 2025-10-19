import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { handleUserMessage, audioFileToBase64, readJsonTranscript } from '../components/commonFunctions';
import { Phase } from '@/context/interface/Phase';
import { logger } from '../../../lib/logger';
import { handleApiError, parseRequestBody } from '../../../lib/api-utils';
import { SafeOpenAIClient } from '../../../lib/external-api';
import { ValidationError, NotFoundError, withTimeout } from '../../../lib/error-handler';
import { UsageTracker } from '../../../lib/subscription/usage-tracker';
import { getOrganizationId } from '../../../lib/subscription/helpers';
import { generateIndividualReport } from '../../../lib/report/auto-report-generator';

interface RequestBody {
  message: string;
  selectThemeName: string;
  interviewRefPath: string;
  phases: Phase[];
  isInterviewEnded: boolean
}

// OpenAI API client with retry and circuit breaker
const openaiClient = new SafeOpenAIClient();

interface Message {
  text: string;
  audio: string;
  lipsync: any;
  facialExpression: string;
  animation: string;
}

const templates = {
  interview_prompt: `
あなたは商品開発の専門家です。次のアルゴリズムでユーザーへ質問し、0→1の新規商品アイデアを発掘してください。**会話例**と**競合比較**を常に意識し、深掘りを徹底します。
インタビューをする対象の商品は{theme}です。
---
### **【基本フロー】**
1. **ニーズの抽出**
    ❏「これから{theme}を購入する場合、どんな特徴を求めますか？」
    → 例: 「目に優しい調光機能」「スマホ連動機能」「デザイン性」など
2. **競合の確認**
    ❏「他社製品でその条件を満たすものは知っていますか？（yes/no）」
    → **yesの場合**: 具体例を挙げてもらう
    → **noの場合**: AIが類似商品を提示
    **【YESの深掘り例】**
    ユーザ「◯◯社の△△という製品があります」
    AI「その製品を購入する予定は？」
    ユーザ「いいえ」
    AI「なぜ購入しないのですか？[価格/機能/デザイン...]のどの点が不満ですか？」
    ユーザ「価格が5万円は高い」
    AI「具体的にどの価格帯なら購入しますか？ また、機能面で妥協できる点はありますか？」
    **【NOの深掘り例】**
    ユーザ「特に知らないです」
    AI「例えば〇〇社の××という商品は△のような特徴を持っています。あなたは購入したいと思いますか？」
    ユーザ「いいえ」
    AI「なぜ購入しないのですか？[価格/機能/デザイン...]のどの点が不満ですか？」
    ユーザ「価格が5万円は高い」
    AI「具体的にどの価格帯なら購入しますか？ また、機能面で妥協できる点はありますか？」
3. **競合不在時の分析**
    ❏「当社調査では××社のYYが類似機能を持っています。この商品についてどう思いますか？」
    ユーザ「デザインが好みじゃない」
    AI「理想のデザインを具体的に教えてください。例えば素材（木製/金属）や形状（丸型/直線的）で希望は？」
4. **ニーズの優先順位付け**
    ❏「挙げていただいた特徴を重要度順に並べ替えてください」
    → 例: [1位: 眼精疲労軽減 2位: スマート家電連動 3位: 北欧風デザイン]
---
### **【実践シナリオ例】**
**テーマ: スマートウォッチ**
AI「健康管理機能で重視する点は？」
ユーザ「ストレス測定精度です」
AI「◯◯社のAAモデルは医療機関と共同開発した測定機能があります。ご存知ですか？」
ユーザ「知ってますが、サイズが大きすぎて…」
AI「具体的にどのサイズ（例: 直径40mm以下）なら許容できますか？ 精度とサイズのどちらを優先しますか？」
ユーザ「38mm以下なら精度が若干落ちてもOK」
→ **インサイト**: 「コンパクトさ」が「高精度」より優先される層が存在
---
### **【行動指針】**
・「なぜ？」を3階層で掘り下げる（例: 不便→根本原因→理想状態）
・常に数値/具体例を要求（「高い」→「3万円以上ならNG」）
・競合比較では「機能」「価格」「デザイン」「UX」の4軸で分析
・ユーザーの言葉を「要約→確認」しながら進める
### **【絶対的制約】**
・インタビューの発話には、質問のみ含めてください（ニーズの抽出などは要りません）
・競合商品を紹介することを意識してください
・1. **ニーズの抽出**が行えなかった場合は、4. **ニーズの優先順位付け**に移ってください
  `,
  thank_you: `インタビューにご協力いただき、ありがとうございました。貴重なご意見を頂戴し、大変参考になりました。`
};

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // リクエストボディの安全な解析
    const requestBody = await parseRequestBody<RequestBody>(request);
    const { message: userMessage, selectThemeName, interviewRefPath, phases, isInterviewEnded } = requestBody;

    // 入力データの検証（改善されたエラーハンドリング）
    if (!interviewRefPath) {
      throw new ValidationError('インタビューが指定されていません', { field: 'interviewRefPath' });
    }

    if (!selectThemeName) {
      throw new ValidationError('テーマが指定されていません', { field: 'selectThemeName' });
    }

    const interviewRef = adminDb.doc(interviewRefPath);
    logger.debug('interview_server: 処理開始', { 
      themeName: selectThemeName,
      userMessage: userMessage ? 'provided' : 'empty',
      phasesCount: phases.length 
    });

    let context = "";
    let currentPhaseIndex = phases.findIndex(phase => !phase.isChecked);
    let totalQuestionCount = 0;

    if (currentPhaseIndex >= phases.length) {
      logger.info("interview_server: 全てのフェーズが完了しました");
      const duration = Date.now() - startTime;
      logger.api('POST', '/api/interview_server', 200, duration);
      return NextResponse.json({ 
        message: "インタビューが完了しました。ありがとうございました。",
        isInterviewComplete: true 
      });
    }

    const messageCollectionRef = interviewRef.collection("messages");

    try {
      const botMessagesQuery = messageCollectionRef.where("type", "==", "interview").where("sender", "==", "bot");
      const snapshot = await botMessagesQuery.count().get();
      totalQuestionCount = snapshot.data().count;
    } catch (error) {
      logger.error('interview_server: Firebaseからのデータ取得エラー', error as Error);
      return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
    }

    try {
      const querySnapshot = await messageCollectionRef.orderBy("createdAt", "asc").get();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === "interview") {
          context += `\n${data.sender === "bot" ? "Bot" : "User"}: ${data.text}`;
        }
      });
    } catch (error) {
      logger.error('interview_server: コンテキスト取得エラー', error as Error);
      return NextResponse.json({ error: 'コンテキストの取得に失敗しました' }, { status: 500 });
    }

    if (!userMessage) {
      try {
        const messages: Message[] = [{
          text: 'インタビューを始めます。まずはあなたの基本的なプロフィールについて教えてください。',
          audio: await audioFileToBase64('intro_0.wav'),
          lipsync: await readJsonTranscript(totalQuestionCount),
          facialExpression: 'smile',
          animation: 'Talking_1',
        }];
        return NextResponse.json({ messages });
      } catch (error) {
        logger.error('interview_server: 初期メッセージ生成エラー', error as Error);
        return NextResponse.json({ error: '初期メッセージの生成に失敗しました' }, { status: 500 });
      }
    }

    logger.debug('interview_server: フェーズ情報', { 
      currentPhaseIndex,
      themeName: selectThemeName 
    });
    let currentPhase = phases[currentPhaseIndex];
    if (isInterviewEnded) {
      phases[currentPhaseIndex].isChecked = true;
      currentPhaseIndex++;
      
      // ========== インタビュー終了時の同時実行数デクリメント ==========
      try {
        // インタビューのintervieweeIdを取得
        const interviewDoc = await interviewRef.get();
        if (interviewDoc.exists) {
          const interviewData = interviewDoc.data();
          const intervieweeId = interviewData?.intervieweeId;
          
          if (intervieweeId) {
            const organizationId = await getOrganizationId(intervieweeId);
            
            if (organizationId) {
              const usageTracker = new UsageTracker();
              await usageTracker.decrementConcurrent(organizationId, 'interviews');
              logger.info('interview_server: インタビュー終了・同時実行数デクリメント', {
                organizationId,
                interviewRefPath,
                intervieweeId
              });
            }
          }
        }
      } catch (error) {
        logger.error('interview_server: 同時実行数のデクリメントに失敗', error as Error, {
          interviewRefPath
        });
        // エラーが発生してもインタビュー処理は継続
      }
      // ========== 同時実行数デクリメント終了 ==========
    }

    if (currentPhaseIndex >= phases.length) {
      logger.info('interview_server: 全てのフェーズが完了しました');
      return NextResponse.json({ 
        message: "インタビューが完了しました。ありがとうございました。",
        isInterviewComplete: true 
      });
    }

    currentPhase = phases[currentPhaseIndex];
    logger.debug('interview_server: 質問番号', { questionIndex: currentPhaseIndex });

    const currentTemplate = currentPhase.template;
    const prompt = templates[currentTemplate as keyof typeof templates]
      .replace("{theme}", selectThemeName)
      .replace("{context}", context);

    const response = await handleUserMessage(
      userMessage,
      "interview",
      "interviewEnd",
      interviewRef,
      messageCollectionRef.path,
      context,
      totalQuestionCount,
      currentPhaseIndex,
      phases,
      async (updatedContext, userMessage) => {
        if (currentTemplate === "thank_you") {
          await interviewRef.update({
            interviewCollected: true
          });
          
          // ========== インタビュー完了時の同時実行数デクリメント ==========
          try {
            const interviewDoc = await interviewRef.get();
            if (interviewDoc.exists) {
              const interviewData = interviewDoc.data();
              const intervieweeId = interviewData?.intervieweeId;
              
              if (intervieweeId) {
                const organizationId = await getOrganizationId(intervieweeId);
                
                if (organizationId) {
                  const usageTracker = new UsageTracker();
                  await usageTracker.decrementConcurrent(organizationId, 'interviews');
                  logger.info('interview_server: インタビュー完了・同時実行数デクリメント', {
                    organizationId,
                    interviewRefPath,
                    template: 'thank_you'
                  });
                }
              }
            }
          } catch (error) {
            logger.error('interview_server: 完了時の同時実行数デクリメントに失敗', error as Error);
          }
          // ========== 同時実行数デクリメント終了 ==========
          
          // ========== 自動レポート生成 ==========
          try {
            logger.info('interview_server: 自動レポート生成を開始', {
              interviewRefPath,
              theme: selectThemeName
            });
            
            // 非同期でレポート生成（インタビュー終了を遅延させない）
            generateIndividualReport(
              interviewRefPath,
              selectThemeName,
              { skipIfExists: true }
            ).then(result => {
              if (result.success) {
                logger.info('interview_server: 自動レポート生成成功', {
                  interviewRefPath,
                  reportId: result.reportId
                });
              } else {
                logger.error('interview_server: 自動レポート生成失敗', undefined, {
                  interviewRefPath,
                  error: result.error
                });
              }
            }).catch(error => {
              logger.error('interview_server: 自動レポート生成エラー', error as Error, {
                interviewRefPath
              });
            });
          } catch (error) {
            // レポート生成のエラーはインタビュー終了に影響させない
            logger.error('interview_server: レポート生成開始エラー', error as Error, {
              interviewRefPath
            });
          }
          // ========== 自動レポート生成終了 ==========
          
          return templates.thank_you;
        }
        const gptResponse = await openaiClient.createChatCompletion({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: userMessage }
          ],
          model: "gpt-4"
        }, { timeout: 30000, maxRetries: 3 });
        return gptResponse.choices[0].message.content ?? null;
      },
      templates
    );

    const responseData = await response.json();

    const duration = Date.now() - startTime;
    logger.api('POST', '/api/interview_server', 200, duration);
    logger.debug('interview_server: 処理完了', {
      messagesCount: responseData.messages.length,
      currentPhaseIndex,
      totalQuestionCount
    });

    return NextResponse.json({
      messages: responseData.messages,
      currentPhaseIndex: currentPhaseIndex,
      totalQuestionCount: totalQuestionCount,
      phases: phases
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api('POST', '/api/interview_server', 500, duration);
    return handleApiError(error, 'interview_server');
  }
}
