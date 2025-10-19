#!/usr/bin/env node

/**
 * サマリーレポート生成機能のテストスクリプト
 * 使用方法: node scripts/test-summary-generation.js
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const themeId = 'df7e6291-3d33-406e-8335-1742be5ed586';
const themeName = '新製品開発のためのユーザーインタビュー';

async function testSummaryGeneration() {
  console.log('🧪 サマリーレポート生成機能のテスト開始...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 テーマID: ${themeId}`);
  console.log(`📝 テーマ名: ${themeName}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 既存のサマリーレポートをチェック
  console.log('1️⃣ 既存のサマリーレポートをチェック...');
  try {
    const checkResponse = await fetch(`${baseUrl}/api/report/summaryReport?themeId=${themeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (checkResponse.ok) {
      const existingReport = await checkResponse.json();
      if (existingReport.exists) {
        console.log('✅ 既存のサマリーレポートが見つかりました');
        console.log(`  - レポートID: ${existingReport.reportId}`);
        console.log(`  - インタビュー数: ${existingReport.totalInterviews}`);
        console.log(`  - 特徴グループ数: ${existingReport.features?.length || 0}`);
      } else {
        console.log('ℹ️ サマリーレポートはまだ生成されていません');
      }
    }
  } catch (error) {
    console.error('❌ チェック中にエラー:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 2. 新しいサマリーレポートを生成
  console.log('2️⃣ 新しいサマリーレポートを生成...');
  console.log('⏱️ これには1-2分かかる場合があります...\n');

  const startTime = Date.now();
  
  try {
    const generateResponse = await fetch(`${baseUrl}/api/report/summaryReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themeId: themeId,
        themeName: themeName,
        forceRegenerate: true,
        useGPT4: false
      })
    });

    const duration = (Date.now() - startTime) / 1000;

    if (generateResponse.ok) {
      const result = await generateResponse.json();
      console.log('✅ サマリーレポート生成成功！');
      console.log(`  ⏱️ 生成時間: ${duration.toFixed(1)}秒`);
      console.log(`  📊 分析インタビュー数: ${result.totalInterviews}件`);
      console.log(`  🏷️ 抽出された特徴数: ${result.features?.length || 0}個`);
      
      if (result.features && result.features.length > 0) {
        console.log('\n📋 抽出された主要特徴:');
        result.features.slice(0, 5).forEach((feature, index) => {
          console.log(`  ${index + 1}. ${feature.title}`);
          console.log(`     - 言及数: ${feature.mentionCount}`);
          console.log(`     - 関連ペルソナ: ${feature.personas.join(', ')}`);
        });
      }

      // レポートの冒頭を表示
      if (result.report) {
        console.log('\n📄 レポート冒頭（最初の500文字）:');
        console.log('―'.repeat(40));
        console.log(result.report.substring(0, 500) + '...');
        console.log('―'.repeat(40));
      }

      return result;
    } else {
      const error = await generateResponse.json();
      console.log('⚠️ サマリーレポート生成失敗:', error.error || error.message);
      console.log('詳細:', error.details);
    }
  } catch (error) {
    console.error('❌ レポート生成エラー:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 3. 生成されたレポートを再度取得して確認
  console.log('3️⃣ 生成されたレポートを確認...');
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
    
    const verifyResponse = await fetch(`${baseUrl}/api/report/summaryReport?themeId=${themeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (verifyResponse.ok) {
      const report = await verifyResponse.json();
      if (report.exists) {
        console.log('✅ レポートがFirestoreに正常に保存されました');
        console.log(`  - レポートID: ${report.reportId}`);
        console.log(`  - 保存場所: themes/${themeId}/summaryReport/${report.reportId}`);
        
        if (report.personaDistribution) {
          console.log('\n👥 ペルソナ分布:');
          report.personaDistribution.forEach(p => {
            console.log(`  - ${p.persona}: ${p.count}件`);
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ 確認中にエラー:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('✨ テスト完了！');
  console.log('\n💡 次のステップ:');
  console.log('1. ブラウザで組織画面を開く');
  console.log('2. Summaryタブをクリック');
  console.log('3. 生成されたレポートを確認');
  console.log(`\nURL: http://localhost:3000/client-view/[userId]/Summary/${themeId}`);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});

// スクリプト実行
testSummaryGeneration()
  .then(() => {
    console.log('\n✅ すべてのテストが完了しました');
    process.exit(0);
  })
  .catch(error => {
    console.error('テスト実行エラー:', error);
    process.exit(1);
  });