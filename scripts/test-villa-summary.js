#!/usr/bin/env node

/**
 * 高級ヴィラテーマのサマリーレポート生成テスト（5件のみ）
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const themeId = 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b';

async function testVillaSummary() {
  console.log('🏝️ 高級ヴィラサマリーレポート生成テスト\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 テーマID: ${themeId}`);
  console.log(`🏨 テーマ: 高級宿泊施設ヴィラに関するインタビュー`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 最初の5件のインタビューIDを直接指定
  const interviewIds = [
    'ccbf1181-c9b2-4689-8578-da89fd58d177',
    'c2086a70-906b-4129-9b5b-8fc3b5de793c',
    '453303e1-1fde-4636-b781-5f9d153f29f6',
    '2fde2ec3-49a3-4178-aabc-7052ceda59dc',
    'ac9c7163-3e09-4ee4-a7c7-8d809a2e7f53'
  ];

  console.log('1️⃣ 5件の個別レポートを生成...\n');
  
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
          theme: '高級宿泊施設ヴィラに関するインタビュー',
          interviewRefPath: interviewRefPath,
          forceRegenerate: true,
          useGPT4: false
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 生成成功');
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

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('2️⃣ サマリーレポートを生成...\n');

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
        });
      }

      // レポートの冒頭を表示
      if (result.report) {
        console.log('\n📄 レポート冒頭（最初の500文字）:');
        console.log('―'.repeat(40));
        console.log(result.report.substring(0, 500) + '...');
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

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('✨ テスト完了！');
  console.log('\n💡 確認方法:');
  console.log('ブラウザで以下のURLにアクセス:');
  console.log(`http://localhost:3000/client-view/[userId]/Summary/${themeId}`);
}

// 実行
testVillaSummary()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });