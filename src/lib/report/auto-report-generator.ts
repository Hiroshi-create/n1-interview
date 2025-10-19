/**
 * 自動レポート生成サービス
 * インタビュー完了時に自動的にレポートを生成
 */

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { IndividualReport } from '@/stores/IndividualReport';

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface GenerateReportOptions {
  forceRegenerate?: boolean;
  useGPT4?: boolean;
  skipIfExists?: boolean;
}

/**
 * 個別レポートを生成
 */
export async function generateIndividualReport(
  interviewRefPath: string,
  theme: string,
  options: GenerateReportOptions = {}
): Promise<{ success: boolean; report?: string; reportId?: string; error?: string }> {
  const {
    forceRegenerate = false,
    useGPT4 = false,
    skipIfExists = true
  } = options;

  try {
    const interviewRef = adminDb.doc(interviewRefPath);
    const interviewDoc = await interviewRef.get();
    
    if (!interviewDoc.exists) {
      logger.error('auto-report-generator: インタビュードキュメントが見つかりません', {
        interviewRefPath
      });
      return { success: false, error: 'Interview document not found' };
    }

    const interviewData = interviewDoc.data();
    
    // 既存レポートのチェック
    if (skipIfExists && !forceRegenerate) {
      const reportCreated = interviewData?.reportCreated;
      if (reportCreated) {
        logger.debug('auto-report-generator: レポートは既に生成済み', {
          interviewRefPath
        });
        
        // 既存レポートを取得
        const existingReportSnapshot = await interviewRef
          .collection('individualReport')
          .limit(1)
          .get();
        
        if (!existingReportSnapshot.empty) {
          const existingReport = existingReportSnapshot.docs[0].data();
          return {
            success: true,
            report: existingReport.report,
            reportId: existingReport.individualReportId
          };
        }
      }
    }

    // メッセージ履歴の取得
    const messageCollectionRef = interviewRef.collection("messages");
    const querySnapshot = await messageCollectionRef
      .orderBy("createdAt", "asc")
      .get();

    if (querySnapshot.empty) {
      logger.warn('auto-report-generator: メッセージが見つかりません', {
        interviewRefPath
      });
      return { success: false, error: 'No messages found' };
    }

    // コンテキストの構築
    let context = "";
    let messageCount = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // typeフィールドがない場合も考慮（旧形式のデータの場合）
      if (!data.type || data.type === "interview") {
        const sender = data.sender === "bot" ? "Bot" : "User";
        context += `\n${sender}: ${data.text}`;
        messageCount++;
      }
    });

    if (messageCount < 2) {
      logger.warn('auto-report-generator: メッセージが不足しています', {
        interviewRefPath,
        messageCount
      });
      return { success: false, error: 'Insufficient messages for report generation' };
    }

    // レポート生成プロンプト
    const reportPrompt = `
    テーマ: ${theme}
    インタビュー全体を分析し、情報は省略せず、以下の形式で詳細なレポートを作成してください：

    # インタビューレポート：${theme}

    ## 1. インタビューの概要
    ${theme}に関するインタビューの全体的な概要と主要な議論点を記載してください。

    ## 2. 主要な発見事項
    ${theme}に関する重要な発見や洞察を詳細に記載してください。
    - 求める特徴とその理由
    - ユーザーのニーズと期待
    - 現状の課題と問題点

    ## 3. ユーザーの特性と行動パターン
    ${theme}に関連するユーザーの特徴、使用状況、行動傾向を分析してください。

    ## 4. ${theme}に対する具体的な意見・要望
    ユーザーから得られた具体的な意見、改善要望、期待事項を整理してください。

    ## 5. 競合分析と市場ポジション
    ${theme}の競合製品やサービスに関する言及、比較、差別化ポイントを分析してください。

    ## 6. 推奨アクション
    インタビュー結果に基づく具体的な改善提案と今後のアクションプランを提示してください。

    ## 7. 結論
    インタビュー全体から得られた最も重要な洞察と、${theme}の今後の方向性について総括してください。

    ---
    *このレポートは${new Date().toLocaleDateString('ja-JP')}に自動生成されました。*

    インタビュー内容:${context}
    `;

    // GPTによるレポート生成
    logger.info('auto-report-generator: レポート生成開始', {
      interviewRefPath,
      theme,
      model: useGPT4 ? 'gpt-4' : 'gpt-3.5-turbo',
      contextLength: context.length
    });

    const reportResponse = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "あなたは優秀なマーケティングアナリストです。インタビュー内容を詳細に分析し、実用的な洞察を提供してください。マークダウン形式で構造化されたレポートを作成してください。" 
        },
        { role: "user", content: reportPrompt }
      ],
      model: useGPT4 ? "gpt-4" : "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 2000
    });

    const report = reportResponse.choices[0].message.content;

    if (!report) {
      logger.error('auto-report-generator: レポート生成に失敗', {
        interviewRefPath
      });
      return { success: false, error: 'Failed to generate report content' };
    }

    // レポートをFirestoreに保存
    const reportsCollectionRef = interviewRef.collection("individualReport");
    const newReportId = uuidv4();
    const newReport: IndividualReport = {
      createdAt: FieldValue.serverTimestamp(),
      report: report,
      individualReportId: newReportId,
    };

    // 既存レポートの削除（forceRegenerateの場合）
    if (forceRegenerate) {
      const existingReports = await reportsCollectionRef.get();
      const deletePromises = existingReports.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      logger.info('auto-report-generator: 既存レポートを削除', {
        interviewRefPath,
        deletedCount: existingReports.size
      });
    }

    await reportsCollectionRef.doc(newReportId).set(newReport);

    // インタビュードキュメントの更新
    const temporaryId = interviewData?.temporaryId || uuidv4();
    await interviewRef.update({
      reportCreated: true,
      temporaryId: temporaryId,
      reportGeneratedAt: FieldValue.serverTimestamp(),
      reportGenerationMethod: 'auto',
      reportModel: useGPT4 ? 'gpt-4' : 'gpt-3.5-turbo'
    });

    logger.info('auto-report-generator: レポート生成完了', {
      interviewRefPath,
      reportId: newReportId,
      reportLength: report.length
    });

    return {
      success: true,
      report: report,
      reportId: newReportId
    };

  } catch (error) {
    logger.error('auto-report-generator: レポート生成中にエラー', error as Error, {
      interviewRefPath,
      theme
    });
    
    // エラーをインタビュードキュメントに記録
    try {
      const interviewRef = adminDb.doc(interviewRefPath);
      await interviewRef.update({
        reportGenerationError: (error as Error).message,
        reportGenerationErrorAt: FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      logger.error('auto-report-generator: エラー記録失敗', updateError as Error);
    }

    return {
      success: false,
      error: (error as Error).message
    };
  }
}

/**
 * 未生成レポートを検出して生成
 */
export async function generateMissingReports(
  themeId?: string,
  limit: number = 10
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0
  };

  try {
    let query = adminDb.collectionGroup('interviews')
      .where('interviewCollected', '==', true)
      .where('reportCreated', '!=', true)
      .limit(limit);

    if (themeId) {
      // 特定テーマのみ処理
      query = adminDb.collection('themes')
        .doc(themeId)
        .collection('interviews')
        .where('interviewCollected', '==', true)
        .where('reportCreated', '!=', true)
        .limit(limit);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info('auto-report-generator: 未生成レポートはありません', {
        themeId
      });
      return results;
    }

    logger.info('auto-report-generator: 未生成レポートを検出', {
      count: snapshot.size,
      themeId
    });

    // 各インタビューのレポート生成を並列実行（最大3並列）
    const batchSize = 3;
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = snapshot.docs.slice(i, i + batchSize);
      const promises = batch.map(async (doc) => {
        const interviewData = doc.data();
        const interviewRefPath = doc.ref.path;
        
        // テーマ情報の取得
        const themeRef = doc.ref.parent.parent;
        if (!themeRef) {
          logger.error('auto-report-generator: テーマ参照が見つかりません', {
            interviewRefPath
          });
          return false;
        }

        const themeDoc = await themeRef.get();
        const themeData = themeDoc.data();
        const theme = themeData?.theme || 'テーマ不明';

        // レポート生成
        const result = await generateIndividualReport(
          interviewRefPath,
          theme,
          { skipIfExists: true }
        );

        return result.success;
      });

      const batchResults = await Promise.all(promises);
      results.processed += batch.length;
      results.succeeded += batchResults.filter(r => r).length;
      results.failed += batchResults.filter(r => !r).length;
    }

    logger.info('auto-report-generator: バッチ処理完了', results);
    return results;

  } catch (error) {
    logger.error('auto-report-generator: バッチ処理中にエラー', error as Error);
    return results;
  }
}

/**
 * 特定のインタビューのレポート生成状態を確認
 */
export async function checkReportStatus(
  interviewRefPath: string
): Promise<{
  exists: boolean;
  reportId?: string;
  generatedAt?: Date;
  method?: string;
  error?: string;
}> {
  try {
    const interviewRef = adminDb.doc(interviewRefPath);
    const interviewDoc = await interviewRef.get();

    if (!interviewDoc.exists) {
      return { exists: false, error: 'Interview not found' };
    }

    const data = interviewDoc.data();
    const reportCreated = data?.reportCreated || false;

    if (!reportCreated) {
      return { exists: false };
    }

    // レポートドキュメントの取得
    const reportSnapshot = await interviewRef
      .collection('individualReport')
      .limit(1)
      .get();

    if (reportSnapshot.empty) {
      return { exists: false, error: 'Report marked as created but not found' };
    }

    const reportDoc = reportSnapshot.docs[0];
    const reportData = reportDoc.data();

    return {
      exists: true,
      reportId: reportData.individualReportId,
      generatedAt: data.reportGeneratedAt?.toDate(),
      method: data.reportGenerationMethod || 'unknown'
    };

  } catch (error) {
    logger.error('auto-report-generator: ステータス確認エラー', error as Error);
    return { exists: false, error: (error as Error).message };
  }
}