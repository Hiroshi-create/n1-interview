#!/usr/bin/env node

/**
 * AI使用テーマのレポート生成テスト（5件の個別レポート + サマリー）
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';

async function testAIReports() {
  console.log('🤖 AI使用テーマのレポート生成テスト\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 テーマID: ${themeId}`);
  console.log(`🧠 テーマ: AIの使用`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // インタビューリストを動的に取得
  console.log('📋 インタビューリストを取得中...');
  
  let interviewIds = [];
  try {
    const listResponse = await fetch(`${baseUrl}/api/demo/ai-interviews`);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      // 最初の5件を取得
      interviewIds = listData.interviews.slice(0, 5).map(i => i.id || i.interviewId);
      console.log(`✅ ${listData.totalInterviews}件中、最初の5件を使用\n`);
    }
  } catch (error) {
    console.error('❌ インタビューリスト取得エラー:', error);
    return;
  }
  
  if (interviewIds.length === 0) {
    console.log('⚠️ インタビューが見つかりません');
    return;
  }

  console.log('1️⃣ 5件の個別レポートを生成...\n');
  
  const successfulReports = [];
  
  for (let i = 0; i < interviewIds.length; i++) {
    const interviewId = interviewIds[i];
    const interviewRefPath = `themes/${themeId}/interviews/${interviewId}`;
    
    process.stdout.write(`[${i + 1}/5] Interview ${interviewId.substring(0, 8)}... - `);
    
    try {
      const response = await fetch(`${baseUrl}/api/report/individualReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: 'AIの使用',
          interviewRefPath: interviewRefPath,
          forceRegenerate: true,
          useGPT4: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ 生成成功 (${result.reportId?.substring(0, 8)}...)`);
        successfulReports.push(interviewId);
      } else {
        const error = await response.json();
        console.log(`❌ 失敗: ${error.error}`);
      }
    } catch (error) {
      console.log(`❌ エラー: ${error.message}`);
    }
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ 成功した個別レポート: ${successfulReports.length}件\n`);
  
  if (successfulReports.length < 3) {
    console.log('⚠️ 個別レポートが3件未満のため、サマリーレポートは生成できません。');
    return;
  }

  console.log('='.repeat(60) + '\n');
  console.log('2️⃣ サマリーレポートを生成...\n');

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

    if (response.ok) {
      const result = await response.json();
      console.log('✅ サマリーレポート生成成功！');
      console.log(`  📊 分析インタビュー数: ${result.totalInterviews}件`);
      console.log(`  🏷️ 抽出された特徴数: ${result.features?.length || 0}個`);
      
      if (result.features && result.features.length > 0) {
        console.log('\n📋 抽出された主要特徴:');
        result.features.slice(0, 5).forEach((feature, index) => {
          console.log(`  ${index + 1}. ${feature.title}`);
          console.log(`     - 言及数: ${feature.mentionCount}`);
          if (feature.personas && feature.personas.length > 0) {
            console.log(`     - 関連ペルソナ: ${feature.personas.slice(0, 3).join(', ')}${feature.personas.length > 3 ? '...' : ''}`);
          }
        });
      }

      // レポートの冒頭を表示
      if (result.report) {
        console.log('\n📄 レポート冒頭（最初の600文字）:');
        console.log('―'.repeat(40));
        console.log(result.report.substring(0, 600) + '...');
        console.log('―'.repeat(40));
        
        // レポートの統計
        const reportLines = result.report.split('\n').length;
        const reportChars = result.report.length;
        console.log(`\n📊 レポート統計:`);
        console.log(`  - 総文字数: ${reportChars.toLocaleString()}文字`);
        console.log(`  - 総行数: ${reportLines}行`);
      }
    } else {
      const error = await response.json();
      console.log('❌ サマリーレポート生成失敗:', error.error);
      console.log('詳細:', error.details);
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('✨ テスト完了！');
  console.log('\n💡 確認方法:');
  console.log('1. ブラウザで以下のURLにアクセス:');
  console.log(`   http://localhost:3000/client-view/[userId]/Summary/${themeId}`);
  console.log('\n2. 個別レポートの確認:');
  console.log(`   http://localhost:3000/client-view/[userId]/Details/${themeId}`);
}

// 実行
testAIReports()
  .then(() => {
    console.log('\n✅ すべての処理が正常に完了しました');
    process.exit(0);
  })
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });