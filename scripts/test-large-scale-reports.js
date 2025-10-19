#!/usr/bin/env node

/**
 * 大規模レポート生成テスト（30件以上）
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';

async function testLargeScaleReports() {
  console.log('🚀 大規模レポート生成テスト（30件以上）\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 テーマID: ${themeId}`);
  console.log(`🧠 テーマ: AIの使用`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // インタビューリストを取得
  console.log('📋 インタビューリストを取得中...');
  
  let interviewIds = [];
  try {
    const listResponse = await fetch(`${baseUrl}/api/demo/ai-interviews`);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      // 最初の35件を使用（30件以上のテスト）
      interviewIds = listData.interviews.slice(0, 35).map(i => i.id || i.interviewId);
      console.log(`✅ ${listData.totalInterviews}件中、${interviewIds.length}件を使用\n`);
    }
  } catch (error) {
    console.error('❌ インタビューリスト取得エラー:', error);
    return;
  }
  
  if (interviewIds.length < 30) {
    console.log(`⚠️ インタビューが30件未満です（${interviewIds.length}件）`);
    return;
  }

  console.log(`1️⃣ ${interviewIds.length}件の個別レポートを生成...\n`);
  console.log('⏱️ 推定所要時間: 約' + Math.ceil(interviewIds.length * 2 / 60) + '分\n');
  
  const successfulReports = [];
  const failedReports = [];
  const startTime = Date.now();
  
  // バッチ処理（5件ずつ）
  const batchSize = 5;
  for (let batchStart = 0; batchStart < interviewIds.length; batchStart += batchSize) {
    const batch = interviewIds.slice(batchStart, Math.min(batchStart + batchSize, interviewIds.length));
    const batchNum = Math.floor(batchStart / batchSize) + 1;
    const totalBatches = Math.ceil(interviewIds.length / batchSize);
    
    console.log(`\n📦 バッチ ${batchNum}/${totalBatches} を処理中...`);
    
    const batchPromises = batch.map(async (interviewId, index) => {
      const interviewRefPath = `themes/${themeId}/interviews/${interviewId}`;
      const itemNum = batchStart + index + 1;
      
      try {
        const response = await fetch(`${baseUrl}/api/report/individualReport`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: 'AIの使用',
            interviewRefPath: interviewRefPath,
            forceRegenerate: false,
            useGPT4: false
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`  ✅ [${itemNum}/${interviewIds.length}] ${interviewId.substring(0, 8)}... 成功`);
          return { success: true, interviewId };
        } else {
          const error = await response.json();
          console.log(`  ❌ [${itemNum}/${interviewIds.length}] ${interviewId.substring(0, 8)}... 失敗: ${error.error}`);
          return { success: false, interviewId, error: error.error };
        }
      } catch (error) {
        console.log(`  ❌ [${itemNum}/${interviewIds.length}] ${interviewId.substring(0, 8)}... エラー: ${error.message}`);
        return { success: false, interviewId, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(result => {
      if (result.success) {
        successfulReports.push(result.interviewId);
      } else {
        failedReports.push(result);
      }
    });
    
    // バッチ間で待機
    if (batchStart + batchSize < interviewIds.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const individualTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📊 個別レポート生成結果:');
  console.log(`✅ 成功: ${successfulReports.length}件`);
  console.log(`❌ 失敗: ${failedReports.length}件`);
  console.log(`⏱️ 処理時間: ${individualTime}秒 (${(individualTime / 60).toFixed(1)}分)`);
  console.log(`📈 平均処理時間: ${(individualTime / interviewIds.length).toFixed(1)}秒/件`);
  
  if (failedReports.length > 0 && failedReports.length <= 5) {
    console.log('\n失敗したレポート:');
    failedReports.forEach(r => {
      console.log(`  - ${r.interviewId.substring(0, 8)}: ${r.error}`);
    });
  }
  
  if (successfulReports.length < 30) {
    console.log('\n⚠️ 成功したレポートが30件未満のため、大規模テストとしては不十分です。');
    return;
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('2️⃣ 大規模サマリーレポートを生成...');
  console.log(`📊 ${successfulReports.length}件の個別レポートから総合サマリーを作成\n`);

  const summaryStart = Date.now();
  
  try {
    const response = await fetch(`${baseUrl}/api/report/summaryReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themeId: themeId,
        themeName: 'AIの使用',
        forceRegenerate: true,
        useGPT4: false
      })
    });

    const summaryTime = ((Date.now() - summaryStart) / 1000).toFixed(1);

    if (response.ok) {
      const result = await response.json();
      
      console.log('✅ サマリーレポート生成成功！');
      console.log(`⏱️ 生成時間: ${summaryTime}秒`);
      console.log(`📊 分析インタビュー数: ${result.totalInterviews}件`);
      console.log(`🏷️ 抽出された特徴数: ${result.features?.length || 0}個`);
      
      // メタデータの表示
      if (result.metadata) {
        console.log('\n📈 処理メタデータ:');
        console.log(`  - 処理チャンク数: ${result.metadata.processedChunks || 'N/A'}`);
        console.log(`  - 抽出インサイト数: ${result.metadata.extractedInsights || 'N/A'}`);
        console.log(`  - ユニークペルソナ数: ${result.metadata.uniquePersonas || 'N/A'}`);
      }
      
      if (result.features && result.features.length > 0) {
        console.log('\n📋 抽出された主要特徴 (上位10件):');
        result.features.slice(0, 10).forEach((feature, index) => {
          console.log(`\n  ${index + 1}. ${feature.title}`);
          console.log(`     優先度: ${feature.priority || feature.mentionCount}`);
          if (feature.personas && feature.personas.length > 0) {
            console.log(`     関連ペルソナ: ${feature.personas.slice(0, 5).join(', ')}${feature.personas.length > 5 ? '...' : ''}`);
          }
          if (feature.details) {
            console.log(`     詳細: ${feature.details.substring(0, 100)}...`);
          }
        });
      }

      // レポート品質チェック
      if (result.report) {
        const reportLines = result.report.split('\n');
        const reportChars = result.report.length;
        const sections = reportLines.filter(line => line.startsWith('#')).length;
        
        console.log('\n📊 レポート品質指標:');
        console.log(`  - 総文字数: ${reportChars.toLocaleString()}文字`);
        console.log(`  - 総行数: ${reportLines.length}行`);
        console.log(`  - セクション数: ${sections}個`);
        
        // 情報密度チェック
        const informationDensity = (reportChars / result.totalInterviews).toFixed(0);
        console.log(`  - 情報密度: ${informationDensity}文字/インタビュー`);
        
        if (informationDensity < 100) {
          console.log('  ⚠️ 情報密度が低い可能性があります');
        } else {
          console.log('  ✅ 適切な情報密度です');
        }
        
        // レポートの冒頭を表示
        console.log('\n📄 レポート冒頭（最初の1000文字）:');
        console.log('―'.repeat(50));
        console.log(result.report.substring(0, 1000) + '...');
        console.log('―'.repeat(50));
      }
      
      // 成功判定
      const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      
      console.log('\n' + '='.repeat(60) + '\n');
      console.log('🎉 大規模レポート生成テスト完了！');
      console.log(`\n📊 最終統計:`);
      console.log(`  - 個別レポート: ${successfulReports.length}/${interviewIds.length}件成功`);
      console.log(`  - サマリーレポート: 生成成功`);
      console.log(`  - 総処理時間: ${totalTime}分`);
      console.log(`  - 平均処理速度: ${(successfulReports.length / (totalTime * 60)).toFixed(2)}件/秒`);
      
      // 品質評価
      console.log('\n🏆 品質評価:');
      const qualityScore = calculateQualityScore(result);
      console.log(`  総合スコア: ${qualityScore}/100`);
      
      if (qualityScore >= 80) {
        console.log('  ✅ 優秀: 大規模データでも高品質なサマリーが生成されました');
      } else if (qualityScore >= 60) {
        console.log('  ⚠️ 良好: 基本的な要件は満たしていますが、改善の余地があります');
      } else {
        console.log('  ❌ 要改善: 情報の損失や品質低下が見られます');
      }
      
    } else {
      const error = await response.json();
      console.log('❌ サマリーレポート生成失敗:', error.error);
      console.log('詳細:', error.details);
    }
  } catch (error) {
    console.error('❌ サマリー生成エラー:', error.message);
  }

  console.log('\n💡 確認方法:');
  console.log(`1. サマリーレポート: http://localhost:3000/client-view/[userId]/Summary/${themeId}`);
  console.log(`2. 個別レポート一覧: http://localhost:3000/client-view/[userId]/Details/${themeId}`);
}

/**
 * レポート品質スコアを計算
 */
function calculateQualityScore(result) {
  let score = 0;
  
  // 基本チェック（40点）
  if (result.report && result.report.length > 0) score += 10;
  if (result.features && result.features.length > 0) score += 10;
  if (result.totalInterviews >= 30) score += 10;
  if (result.metadata) score += 10;
  
  // コンテンツ品質（30点）
  if (result.report) {
    const reportLength = result.report.length;
    if (reportLength >= 3000) score += 10;
    if (reportLength >= 5000) score += 10;
    
    const sections = result.report.split('\n').filter(line => line.startsWith('#')).length;
    if (sections >= 5) score += 10;
  }
  
  // 特徴抽出品質（20点）
  if (result.features) {
    if (result.features.length >= 5) score += 10;
    if (result.features.length >= 10) score += 5;
    
    const hasDetails = result.features.some(f => f.details && f.details.length > 50);
    if (hasDetails) score += 5;
  }
  
  // メタデータ品質（10点）
  if (result.metadata) {
    if (result.metadata.processedChunks > 0) score += 5;
    if (result.metadata.extractedInsights > 10) score += 5;
  }
  
  return Math.min(score, 100);
}

// 実行
testLargeScaleReports()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });