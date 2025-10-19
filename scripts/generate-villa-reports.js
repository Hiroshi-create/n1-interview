#!/usr/bin/env node

/**
 * 高級ヴィラテーマの個別レポート生成スクリプト
 * 30件のインタビューから個別レポートを生成
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';

async function generateIndividualReports() {
  console.log('🏝️ 高級ヴィラインタビューの個別レポート生成開始...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 テーマID: ${themeId}`);
  console.log(`🏨 テーマ: 高級宿泊施設ヴィラに関するインタビュー`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. インタビューリストを取得
  console.log('1️⃣ インタビューリストを取得中...');
  
  try {
    const response = await fetch(`${baseUrl}/api/demo/create-villa-interviews`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch interviews: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ ${data.totalInterviews}件のインタビューを確認\n`);

    // 2. 各インタビューの個別レポートを生成
    console.log('2️⃣ 個別レポートを順次生成中...');
    console.log('⏱️ これには数分かかる場合があります...\n');

    const results = [];
    const interviews = data.interviews.slice(0, 30); // 最大30件

    for (let i = 0; i < interviews.length; i++) {
      const interview = interviews[i];
      const startTime = Date.now();
      
      process.stdout.write(`📝 [${i + 1}/${interviews.length}] ${interview.userInfo?.occupation || '不明'} - `);

      try {
        const interviewRefPath = `themes/${themeId}/interviews/${interview.id || interview.interviewId}`;
        const reportResponse = await fetch(`${baseUrl}/api/report/individualReport`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: '高級宿泊施設ヴィラに関するインタビュー',
            interviewRefPath: interviewRefPath,
            forceRegenerate: true,
            useGPT4: false
          })
        });

        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`✅ 生成完了 (${duration}秒)`);
          
          results.push({
            interviewId: interview.id || interview.interviewId,
            persona: interview.userInfo?.occupation,
            reportId: reportData.reportId,
            success: true
          });
        } else {
          const error = await reportResponse.json();
          console.log(`❌ 失敗: ${error.error || error.message}`);
          results.push({
            interviewId: interview.id || interview.interviewId,
            persona: interview.userInfo?.occupation,
            success: false,
            error: error.error || error.message
          });
        }
      } catch (error) {
        console.log(`❌ エラー: ${error.message}`);
        results.push({
          interviewId: interview.id || interview.interviewId,
          persona: interview.userInfo?.occupation,
          success: false,
          error: error.message
        });
      }

      // レート制限対策（1秒待機）
      if (i < interviews.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. 結果サマリー
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📊 個別レポート生成結果:');
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ 失敗: ${failCount}件`);
    
    if (failCount > 0) {
      console.log('\n⚠️ 失敗したレポート:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.persona}: ${r.error}`);
      });
    }

    return results;

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

// サマリーレポート生成関数
async function generateSummaryReport() {
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('3️⃣ サマリーレポートを生成中...');
  console.log('⏱️ これには1-2分かかる場合があります...\n');

  const startTime = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/report/summaryReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themeId: themeId,
        themeName: '高級宿泊施設ヴィラに関するインタビュー',
        forceRegenerate: true,
        useGPT4: false
      })
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ サマリーレポート生成成功！');
      console.log(`  ⏱️ 生成時間: ${duration}秒`);
      console.log(`  📊 分析インタビュー数: ${result.totalInterviews}件`);
      console.log(`  🏷️ 抽出された特徴数: ${result.features?.length || 0}個`);
      
      if (result.features && result.features.length > 0) {
        console.log('\n📋 抽出された主要特徴:');
        result.features.slice(0, 5).forEach((feature, index) => {
          console.log(`  ${index + 1}. ${feature.title}`);
          console.log(`     - 言及数: ${feature.mentionCount}`);
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
      const error = await response.json();
      console.log('⚠️ サマリーレポート生成失敗:', error.error || error.message);
      console.log('詳細:', error.details);
      return null;
    }
  } catch (error) {
    console.error('❌ サマリーレポート生成エラー:', error.message);
    return null;
  }
}

// メイン実行
async function main() {
  console.log('🚀 高級ヴィラテーマのレポート生成プロセス開始\n');
  
  // 個別レポート生成
  const individualResults = await generateIndividualReports();
  
  // 成功した個別レポートが3件以上ある場合のみサマリーを生成
  const successCount = individualResults.filter(r => r.success).length;
  
  if (successCount >= 3) {
    // サマリーレポート生成
    const summaryResult = await generateSummaryReport();
    
    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✨ すべての処理が完了しました！\n');
    console.log('📊 最終結果:');
    console.log(`  - 個別レポート: ${successCount}件生成`);
    console.log(`  - サマリーレポート: ${summaryResult ? '生成成功' : '生成失敗'}`);
    
    console.log('\n💡 次のステップ:');
    console.log('1. ブラウザで組織画面を開く');
    console.log('2. 高級ヴィラテーマを選択');
    console.log('3. Details/Summary/Dashboard等のタブで結果を確認');
    console.log(`\nテーマURL: http://localhost:3000/client-view/[userId]/[tab]/${themeId}`);
  } else {
    console.log('\n⚠️ 個別レポートの生成数が不足しているため、サマリーレポートは生成できません');
    console.log(`（最低3件必要、現在: ${successCount}件）`);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});

// スクリプト実行
main()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });