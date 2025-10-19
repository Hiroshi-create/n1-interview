#!/usr/bin/env node

/**
 * 高品質サマリーレポートのテスト
 */

const baseUrl = 'http://localhost:3000';

async function testEnhancedSummary() {
  console.log('🚀 高品質サマリーレポートテスト\n');
  console.log('='.repeat(60) + '\n');
  
  try {
    console.log('📊 サマリーレポート生成中...');
    console.log('（35件以上の個別レポートから生成）\n');
    
    const startTime = Date.now();
    
    const response = await fetch(`${baseUrl}/api/report/summaryReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themeId: 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b',
        themeName: 'AIの使用',
        forceRegenerate: true,
        useGPT4: false
      })
    });
    
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ エラーレスポンス:', error);
      return;
    }
    
    const result = await response.json();
    
    console.log('✅ サマリーレポート生成成功！');
    console.log(`⏱️ 生成時間: ${elapsedTime}秒\n`);
    
    // 基本統計
    console.log('📈 基本統計:');
    console.log(`  - レポート文字数: ${(result.report || '').length.toLocaleString()}文字`);
    console.log(`  - 分析対象: ${result.totalInterviews || 0}件`);
    console.log(`  - 特徴数: ${(result.features || []).length}個`);
    
    // メタデータ
    if (result.metadata) {
      console.log('\n📊 メタデータ:');
      Object.entries(result.metadata).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
    }
    
    // 詳細分析
    const report = result.report || '';
    const lines = report.split('\n');
    const sections = lines.filter(line => line.startsWith('#'));
    
    console.log('\n📋 セクション構成:');
    console.log(`  - 総セクション数: ${sections.length}`);
    
    // 主要セクション
    const mainSections = sections.filter(s => s.startsWith('##'));
    console.log(`  - メインセクション: ${mainSections.length}`);
    if (mainSections.length > 0) {
      console.log('\n  主要セクション:');
      mainSections.slice(0, 10).forEach(section => {
        console.log(`    - ${section.replace(/^#+\s*/, '')}`);
      });
    }
    
    // 内容の具体性チェック
    console.log('\n🔍 内容品質チェック:');
    
    const numbers = report.match(/\d+/g) || [];
    console.log(`  - 数値言及: ${numbers.length}回`);
    
    const percentages = report.match(/\d+%/g) || [];
    console.log(`  - パーセンテージ: ${percentages.length}回`);
    
    const quotes = report.match(/「.*?」|".*?"/g) || [];
    console.log(`  - 引用: ${quotes.length}個`);
    
    const personas = report.match(/(エンジニア|マネージャー|デザイナー|医師|看護師|翻訳|弁護士|経営)/g) || [];
    console.log(`  - ペルソナ言及: ${personas.length}回`);
    
    // 品質スコア計算
    console.log('\n🎯 品質評価:');
    
    const lengthScore = Math.min(100, (report.length / 15000) * 100);
    const structureScore = Math.min(100, (sections.length / 15) * 100);
    const specificityScore = Math.min(100, ((numbers.length + personas.length) / 100) * 100);
    const totalScore = (lengthScore + structureScore + specificityScore) / 3;
    
    console.log(`  - 文章量スコア: ${lengthScore.toFixed(1)}/100`);
    console.log(`  - 構造スコア: ${structureScore.toFixed(1)}/100`);
    console.log(`  - 具体性スコア: ${specificityScore.toFixed(1)}/100`);
    console.log(`  - 総合スコア: ${totalScore.toFixed(1)}/100`);
    
    if (totalScore >= 80) {
      console.log('\n✨ 優秀: 高品質なサマリーレポートが生成されました！');
    } else if (totalScore >= 60) {
      console.log('\n⚠️ 良好: 基本要件は満たしていますが、改善の余地があります');
    } else {
      console.log('\n❌ 要改善: 品質向上が必要です');
    }
    
    // レポートの一部を表示
    if (report.length > 0) {
      console.log('\n📄 レポート冒頭（最初の1500文字）:');
      console.log('─'.repeat(50));
      console.log(report.substring(0, 1500) + '...');
      console.log('─'.repeat(50));
    }
    
    // 特徴の表示
    if (result.features && result.features.length > 0) {
      console.log('\n🏷️ 抽出された主要特徴:');
      result.features.slice(0, 5).forEach((feature, index) => {
        console.log(`\n${index + 1}. ${feature.title}`);
        if (feature.priority) console.log(`   優先度: ${feature.priority}`);
        if (feature.details) console.log(`   詳細: ${feature.details.substring(0, 100)}...`);
        if (feature.personas && feature.personas.length > 0) {
          console.log(`   関連: ${feature.personas.slice(0, 3).join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    console.error(error.stack);
  }
}

// 実行
testEnhancedSummary()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });