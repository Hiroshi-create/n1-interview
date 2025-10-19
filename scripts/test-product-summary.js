#!/usr/bin/env node

/**
 * 新製品開発テーマのサマリーレポート再生成テスト
 */

const baseUrl = 'http://localhost:3000';

async function testProductSummary() {
  console.log('🚀 新製品開発サマリーレポート再生成テスト\n');
  console.log('='.repeat(60) + '\n');
  
  try {
    console.log('📊 サマリーレポート生成中...');
    console.log('テーマ: 新製品開発のためのユーザーインタビュー\n');
    
    const startTime = Date.now();
    
    const response = await fetch(`${baseUrl}/api/report/summaryReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themeId: 'df7e6291-3d33-406e-8335-1742be5ed586',
        themeName: '新製品開発のためのユーザーインタビュー',
        forceRegenerate: true,  // 強制的に再生成
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
    
    const personas = report.match(/(エンジニア|マネージャー|デザイナー|医師|看護師|翻訳|弁護士|経営|プロダクト)/g) || [];
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
      console.log('\n📄 レポート冒頭（最初の1000文字）:');
      console.log('─'.repeat(50));
      console.log(report.substring(0, 1000) + '...');
      console.log('─'.repeat(50));
    }
    
    // 旧バージョンとの比較
    console.log('\n📊 改善前後の比較:');
    console.log('  改善前: 文字数 約1,000-2,000文字');
    console.log(`  改善後: 文字数 ${report.length.toLocaleString()}文字`);
    console.log(`  向上率: ${((report.length / 1500 - 1) * 100).toFixed(0)}%`);
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    console.error(error.stack);
  }
}

// 実行
testProductSummary()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });