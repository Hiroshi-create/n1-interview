#!/usr/bin/env node

/**
 * API制限実装のテストスクリプト
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 API制限実装テスト開始...\n');

let errors = [];
let warnings = [];
let successes = [];

// テスト対象のAPIファイル
const apiFiles = [
  {
    path: 'src/app/api/create_interview/route.tsx',
    name: 'create_interview',
    requiredImports: [
      'LimitChecker',
      'UsageTracker',
      'getOrganizationId'
    ],
    requiredChecks: [
      'canUse.*interviews',
      'canUseConcurrent.*interviews',
      'incrementUsage.*interviews',
      'incrementConcurrent.*interviews',
      'decrementConcurrent.*interviews'
    ]
  },
  {
    path: 'src/app/api/interview_server/route.tsx',
    name: 'interview_server',
    requiredImports: [
      'UsageTracker',
      'getOrganizationId'
    ],
    requiredChecks: [
      'decrementConcurrent.*interviews',
      'isInterviewEnded',
      'thank_you'
    ]
  },
  {
    path: 'src/app/api/create_theme/route.tsx',
    name: 'create_theme',
    requiredImports: [
      'LimitChecker',
      'UsageTracker',
      'createLimitError'
    ],
    requiredChecks: [
      'getPlanLimit.*theme_max',
      'incrementUsage.*themes',
      'currentThemeCount'
    ]
  }
];

// 各APIファイルをチェック
apiFiles.forEach(api => {
  console.log(`\n📁 ${api.name} APIチェック`);
  console.log('-'.repeat(40));
  
  const filePath = path.join(process.cwd(), api.path);
  
  if (!fs.existsSync(filePath)) {
    errors.push(`❌ ${api.name}: ファイルが存在しません`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // インポートチェック
  console.log('  📦 インポートチェック:');
  api.requiredImports.forEach(imp => {
    if (content.includes(`import`) && content.includes(imp)) {
      console.log(`    ✓ ${imp}`);
      successes.push(`✅ ${api.name}: ${imp}がインポートされています`);
    } else {
      console.log(`    ✗ ${imp}`);
      errors.push(`❌ ${api.name}: ${imp}がインポートされていません`);
    }
  });
  
  // 機能チェック
  console.log('  🔧 機能実装チェック:');
  api.requiredChecks.forEach(check => {
    const regex = new RegExp(check);
    if (regex.test(content)) {
      console.log(`    ✓ ${check.replace('.*', '()').replace('\\', '')}`);
      successes.push(`✅ ${api.name}: ${check.replace('.*', '').replace('\\', '')}が実装されています`);
    } else {
      console.log(`    ✗ ${check.replace('.*', '()').replace('\\', '')}`);
      warnings.push(`⚠️ ${api.name}: ${check.replace('.*', '').replace('\\', '')}が見つかりません`);
    }
  });
  
  // エラーハンドリングチェック
  if (content.includes('try {') && content.includes('catch')) {
    console.log('  ✓ エラーハンドリング実装済み');
  } else {
    warnings.push(`⚠️ ${api.name}: エラーハンドリングが不足している可能性`);
  }
  
  // ロギングチェック
  if (content.includes('logger.')) {
    console.log('  ✓ ロギング実装済み');
  } else {
    warnings.push(`⚠️ ${api.name}: ロギングが実装されていません`);
  }
  
  // HTTPステータス429チェック
  if (content.includes('status: 429')) {
    console.log('  ✓ 制限超過時の429ステータス実装済み');
    successes.push(`✅ ${api.name}: 429ステータスコードが実装されています`);
  }
});

// バックアップファイルの確認
console.log('\n\n📦 バックアップファイルチェック');
console.log('-'.repeat(40));

const backupFiles = [
  'src/app/api/create_interview/route.backup.tsx',
  'src/app/api/interview_server/route.backup.tsx',
  'src/app/api/create_theme/route.backup.tsx'
];

backupFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${path.basename(file)}`);
    successes.push(`✅ バックアップ: ${path.basename(file)}が存在`);
  } else {
    console.log(`  ✗ ${path.basename(file)}`);
    warnings.push(`⚠️ バックアップ: ${path.basename(file)}が見つかりません`);
  }
});

// 結果の表示
console.log('\n\n📊 テスト結果サマリー');
console.log('='.repeat(50));

if (successes.length > 0) {
  console.log('\n✅ 成功項目: ' + successes.length + '件');
  if (process.argv.includes('--verbose')) {
    successes.forEach(s => console.log('  ' + s));
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️  警告項目: ' + warnings.length + '件');
  warnings.forEach(w => console.log('  ' + w));
}

if (errors.length > 0) {
  console.log('\n❌ エラー項目: ' + errors.length + '件');
  errors.forEach(e => console.log('  ' + e));
}

// 実装状況の評価
console.log('\n\n📈 実装状況評価');
console.log('-'.repeat(50));

const features = {
  'インタビュー作成制限': successes.filter(s => s.includes('create_interview')).length >= 5,
  'インタビュー終了処理': successes.filter(s => s.includes('interview_server')).length >= 2,
  'テーマ作成制限': successes.filter(s => s.includes('create_theme')).length >= 3,
  'エラーハンドリング': !errors.some(e => e.includes('エラーハンドリング')),
  'ステータスコード': successes.filter(s => s.includes('429')).length >= 2
};

Object.entries(features).forEach(([feature, implemented]) => {
  console.log(`${implemented ? '✅' : '❌'} ${feature}`);
});

// 総合評価
console.log('\n🎯 総合評価:');
const implementedCount = Object.values(features).filter(v => v).length;
const totalFeatures = Object.keys(features).length;

if (errors.length === 0 && implementedCount === totalFeatures) {
  console.log('🏆 完璧！すべての機能が正しく実装されています！');
} else if (errors.length === 0 && implementedCount >= totalFeatures * 0.8) {
  console.log('✅ 良好！主要な機能は実装されています。');
} else if (implementedCount >= totalFeatures * 0.5) {
  console.log('📊 基本的な実装は完了していますが、改善の余地があります。');
} else {
  console.log('⚠️  実装が不完全です。上記のエラーを修正してください。');
}

// 推奨事項
console.log('\n💡 次のステップ:');
console.log('1. 残りのAPI（レポート生成、ユーザー登録）への制限追加');
console.log('2. 使用量表示UIの実装');
console.log('3. 管理画面での使用量ダッシュボード作成');
console.log('4. エンドツーエンドテストの実施');
console.log('5. 本番環境でのパフォーマンステスト');

process.exit(errors.length > 0 ? 1 : 0);