#!/usr/bin/env node

/**
 * 全AIインタビューのレポート生成（60件）
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';

async function generateAllReports() {
  console.log('🤖 AI使用テーマの全レポート生成\n');
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
      interviewIds = listData.interviews.map(i => i.id || i.interviewId);
      console.log(`✅ ${listData.totalInterviews}件のインタビューを取得\n`);
    }
  } catch (error) {
    console.error('❌ インタビューリスト取得エラー:', error);
    return;
  }
  
  if (interviewIds.length === 0) {
    console.log('⚠️ インタビューが見つかりません');
    return;
  }

  console.log(`1️⃣ ${interviewIds.length}件の個別レポートを生成...\n`);
  
  const successfulReports = [];
  const startTime = Date.now();
  
  for (let i = 0; i < interviewIds.length; i++) {
    const interviewId = interviewIds[i];
    const interviewRefPath = `themes/${themeId}/interviews/${interviewId}`;
    
    process.stdout.write(`[${i + 1}/${interviewIds.length}] Interview ${interviewId.substring(0, 8)}... - `);
    
    try {
      const response = await fetch(`${baseUrl}/api/report/individualReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: 'AIの使用',
          interviewRefPath: interviewRefPath,
          forceRegenerate: false, // 既存レポートがあれば使用
          useGPT4: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ 成功`);
        successfulReports.push(interviewId);
      } else {
        const error = await response.json();
        console.log(`❌ 失敗: ${error.error}`);
      }
    } catch (error) {
      console.log(`❌ エラー: ${error.message}`);
    }
    
    // レート制限対策（10件ごとに少し長く待つ）
    if ((i + 1) % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const individualTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ 成功した個別レポート: ${successfulReports.length}件`);
  console.log(`⏱️ 処理時間: ${individualTime}秒\n`);
  
  if (successfulReports.length < 3) {
    console.log('⚠️ 個別レポートが3件未満のため、サマリーレポートは生成できません。');
    return;
  }

  console.log('='.repeat(60) + '\n');
  console.log('2️⃣ サマリーレポートを生成...\n');

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
      
      if (result.features && result.features.length > 0) {
        console.log('\n📋 抽出された主要特徴 (上位10件):');
        result.features.slice(0, 10).forEach((feature, index) => {
          console.log(`  ${index + 1}. ${feature.title}`);
          console.log(`     - 言及数: ${feature.mentionCount}`);
          if (feature.personas && feature.personas.length > 0) {
            console.log(`     - 関連ペルソナ: ${feature.personas.slice(0, 5).join(', ')}${feature.personas.length > 5 ? '...' : ''}`);
          }
        });
      }

      // レポートの統計
      if (result.report) {
        const reportLines = result.report.split('\n').length;
        const reportChars = result.report.length;
        console.log(`\n📊 レポート統計:`);
        console.log(`  - 総文字数: ${reportChars.toLocaleString()}文字`);
        console.log(`  - 総行数: ${reportLines}行`);
        
        // レポートの冒頭を表示
        console.log('\n📄 レポート冒頭（最初の800文字）:');
        console.log('―'.repeat(40));
        console.log(result.report.substring(0, 800) + '...');
        console.log('―'.repeat(40));
      }
    } else {
      const error = await response.json();
      console.log('❌ サマリーレポート生成失敗:', error.error);
      console.log('詳細:', error.details);
    }
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('✨ 全レポート生成完了！');
  console.log(`⏱️ 総処理時間: ${totalTime}分`);
  console.log('\n💡 確認方法:');
  console.log('1. サマリーレポート:');
  console.log(`   http://localhost:3000/client-view/[userId]/Summary/${themeId}`);
  console.log('\n2. 個別レポート一覧:');
  console.log(`   http://localhost:3000/client-view/[userId]/Details/${themeId}`);
  console.log('\n3. ダッシュボード:');
  console.log(`   http://localhost:3000/client-view/[userId]/Dashboard/${themeId}`);
}

// 実行
generateAllReports()
  .then(() => {
    console.log('\n✅ すべての処理が正常に完了しました');
    process.exit(0);
  })
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });