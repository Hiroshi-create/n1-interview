#!/usr/bin/env node

/**
 * サマリーレポートの品質分析スクリプト
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function analyzeSummaryQuality() {
  console.log('📊 サマリーレポート品質分析\n');
  console.log('='.repeat(60) + '\n');
  
  try {
    // 現在のサマリーレポートを取得
    const response = await fetch(`${baseUrl}/api/report/summaryReport`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themeId: 'd3e5f07c-b018-4de3-928b-a4fd8810ca4b',
        themeName: 'AIの使用',
        forceRegenerate: false,
        useGPT4: false
      })
    });
    
    if (!response.ok) {
      console.error('❌ サマリーレポート取得失敗');
      return;
    }
    
    const result = await response.json();
    const report = result.report || '';
    const features = result.features || [];
    
    // 1. 基本統計
    console.log('📈 基本統計:');
    console.log(`  - 総文字数: ${report.length.toLocaleString()}文字`);
    console.log(`  - 総行数: ${report.split('\n').length}行`);
    console.log(`  - 段落数: ${report.split('\n\n').length}個`);
    console.log(`  - 分析対象インタビュー数: ${result.totalInterviews}件`);
    console.log(`  - 情報密度: ${Math.round(report.length / result.totalInterviews)}文字/インタビュー\n`);
    
    // 2. セクション分析
    const sections = report.split('\n').filter(line => line.startsWith('#'));
    console.log('📋 セクション構成:');
    sections.forEach(section => {
      const level = section.match(/^#+/)[0].length;
      const indent = '  '.repeat(level - 1);
      console.log(`${indent}- ${section.replace(/^#+\s*/, '')}`);
    });
    console.log(`  合計: ${sections.length}セクション\n`);
    
    // 3. 内容の具体性分析
    console.log('🔍 内容の具体性分析:');
    
    // 数値の出現回数
    const numbers = report.match(/\d+/g) || [];
    console.log(`  - 数値の出現: ${numbers.length}回`);
    
    // 具体的な職業/ペルソナの言及
    const personas = report.match(/(エンジニア|マネージャー|デザイナー|医師|看護師|翻訳|弁護士|経営|教授|研究)/g) || [];
    console.log(`  - ペルソナ言及: ${personas.length}回`);
    
    // 具体的なツール/技術の言及
    const tools = report.match(/(ChatGPT|GPT|Claude|Copilot|Midjourney|DALL-E|Notion|Grammarly|API|AI)/gi) || [];
    console.log(`  - ツール/技術言及: ${tools.length}回`);
    
    // 引用や具体例
    const quotes = report.match(/「.*?」|".*?"/g) || [];
    console.log(`  - 引用/具体例: ${quotes.length}個\n`);
    
    // 4. セクションごとの内容量分析
    console.log('📏 セクションごとの内容量:');
    const sectionContents = {};
    let currentSection = 'intro';
    const lines = report.split('\n');
    
    lines.forEach(line => {
      if (line.startsWith('#')) {
        currentSection = line.replace(/^#+\s*/, '').substring(0, 30);
        sectionContents[currentSection] = '';
      } else if (line.trim()) {
        sectionContents[currentSection] = (sectionContents[currentSection] || '') + line + '\n';
      }
    });
    
    Object.entries(sectionContents).forEach(([section, content]) => {
      if (content) {
        const charCount = content.length;
        const wordCount = content.split(/\s+/).length;
        console.log(`  ${section}:`);
        console.log(`    - 文字数: ${charCount}`);
        console.log(`    - 推定単語数: ${wordCount}`);
      }
    });
    
    // 5. 抽出された特徴の分析
    console.log('\n🏷️ 抽出された特徴の品質:');
    console.log(`  - 特徴数: ${features.length}個`);
    
    if (features.length > 0) {
      const avgPriority = features.reduce((sum, f) => sum + (f.priority || f.mentionCount || 0), 0) / features.length;
      const avgDetailLength = features.reduce((sum, f) => sum + (f.details || '').length, 0) / features.length;
      const withPersonas = features.filter(f => f.personas && f.personas.length > 0).length;
      const withQuotes = features.filter(f => f.quotes && f.quotes.length > 0).length;
      
      console.log(`  - 平均優先度: ${avgPriority.toFixed(1)}`);
      console.log(`  - 平均詳細文字数: ${Math.round(avgDetailLength)}文字`);
      console.log(`  - ペルソナ付き: ${withPersonas}/${features.length}`);
      console.log(`  - 引用付き: ${withQuotes}/${features.length}\n`);
    }
    
    // 6. 品質スコア計算
    console.log('🎯 品質スコア評価:');
    
    const scores = {
      length: Math.min(report.length / 100, 100), // 10000文字で100点
      sections: Math.min(sections.length * 5, 30), // 6セクション以上で30点
      specificity: Math.min((numbers.length + personas.length + tools.length) * 2, 40), // 具体性
      features: Math.min(features.length * 3, 30), // 特徴抽出
    };
    
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    
    console.log(`  - 文章量: ${scores.length.toFixed(1)}/100`);
    console.log(`  - 構成: ${scores.sections.toFixed(1)}/30`);
    console.log(`  - 具体性: ${scores.specificity.toFixed(1)}/40`);
    console.log(`  - 特徴抽出: ${scores.features.toFixed(1)}/30`);
    console.log(`  - 総合スコア: ${totalScore.toFixed(1)}/200\n`);
    
    // 7. 問題点の特定
    console.log('⚠️ 特定された問題点:');
    const problems = [];
    
    if (report.length < 5000) {
      problems.push('レポートが短すぎる（5000文字未満）');
    }
    if (numbers.length < 10) {
      problems.push('具体的な数値が少ない');
    }
    if (personas.length < 20) {
      problems.push('ペルソナへの言及が少ない');
    }
    if (quotes.length < 5) {
      problems.push('具体的な引用や例が少ない');
    }
    if (features.length < 5) {
      problems.push('抽出された特徴が少ない');
    }
    
    const avgSectionLength = report.length / Math.max(sections.length, 1);
    if (avgSectionLength < 500) {
      problems.push('各セクションの内容が薄い');
    }
    
    if (problems.length === 0) {
      console.log('  ✅ 重大な問題は検出されませんでした');
    } else {
      problems.forEach(problem => {
        console.log(`  - ${problem}`);
      });
    }
    
    // 8. 改善提案
    console.log('\n💡 改善提案:');
    const suggestions = [];
    
    if (report.length < 10000) {
      suggestions.push('より詳細な分析と洞察を追加');
    }
    if (numbers.length < 20) {
      suggestions.push('統計データや割合などの数値情報を増やす');
    }
    if (personas.length < 30) {
      suggestions.push('各ペルソナの具体的なニーズと要望を詳述');
    }
    if (quotes.length < 10) {
      suggestions.push('インタビューからの直接引用を増やす');
    }
    
    suggestions.push('各セクションに具体的な事例とデータを追加');
    suggestions.push('アクションアイテムと推奨事項をより具体化');
    suggestions.push('ペルソナごとの詳細な分析セクションを追加');
    
    suggestions.forEach(suggestion => {
      console.log(`  - ${suggestion}`);
    });
    
    // 9. 既存データとの比較
    console.log('\n📊 ベンチマーク比較:');
    console.log('  理想的なサマリーレポート:');
    console.log('  - 文字数: 15,000-20,000文字');
    console.log('  - セクション数: 15-20個');
    console.log('  - 具体的数値: 50回以上');
    console.log('  - ペルソナ言及: 100回以上');
    console.log('  - 引用/例: 20個以上');
    console.log('  - 情報密度: 500文字/インタビュー以上');
    
    console.log('\n  現状:');
    console.log(`  - 文字数: ${report.length}文字 (${Math.round(report.length / 200)}%)`)
    console.log(`  - セクション数: ${sections.length}個 (${Math.round(sections.length / 0.2)}%)`);
    console.log(`  - 具体的数値: ${numbers.length}回 (${Math.round(numbers.length / 0.5)}%)`);
    console.log(`  - ペルソナ言及: ${personas.length}回 (${Math.round(personas.length)}%)`);
    console.log(`  - 引用/例: ${quotes.length}個 (${Math.round(quotes.length * 5)}%)`);
    console.log(`  - 情報密度: ${Math.round(report.length / result.totalInterviews)}文字 (${Math.round(report.length / result.totalInterviews / 5)}%)`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

// 実行
analyzeSummaryQuality()
  .then(() => {
    console.log('\n✅ 分析完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('実行エラー:', error);
    process.exit(1);
  });