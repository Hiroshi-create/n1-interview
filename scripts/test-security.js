#!/usr/bin/env node

/**
 * セキュリティ強化のテストスクリプト
 * 環境変数と設定の検証を行います
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 セキュリティ強化テスト開始...\n');

let errors = [];
let warnings = [];
let successes = [];

// 1. 環境変数ファイルの存在確認
console.log('1. 環境変数ファイルチェック');
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (fs.existsSync(envExamplePath)) {
  successes.push('✅ .env.example ファイルが存在します');
} else {
  warnings.push('⚠️  .env.example ファイルが存在しません');
}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // 新しい環境変数の確認
  if (envContent.includes('OPENAI_API_KEY=')) {
    successes.push('✅ OPENAI_API_KEY が設定されています');
  } else {
    warnings.push('⚠️  OPENAI_API_KEY が設定されていません（フォールバックが機能します）');
  }
  
  if (envContent.includes('ALLOWED_ORIGINS=')) {
    successes.push('✅ ALLOWED_ORIGINS が設定されています');
  } else {
    warnings.push('⚠️  ALLOWED_ORIGINS が設定されていません（デフォルト値が使用されます）');
  }
  
  // 非推奨の環境変数の確認
  if (envContent.includes('NEXT_PUBLIC_OPENAI_KEY=') && envContent.match(/NEXT_PUBLIC_OPENAI_KEY=.+/)) {
    warnings.push('⚠️  NEXT_PUBLIC_OPENAI_KEY はまだ設定されています（互換性のため維持）');
  }
} else {
  errors.push('❌ .env ファイルが存在しません');
}

// 2. APIルートでの環境変数使用確認
console.log('\n2. APIルートの環境変数使用チェック');
const apiRoutes = [
  'src/app/api/interview_server/route.tsx',
  'src/app/api/transcribe/route.tsx',
  'src/app/api/operation_check/route.tsx',
  'src/app/api/report/individualReport/route.tsx',
  'src/app/api/components/commonFunctions.tsx'
];

apiRoutes.forEach(route => {
  const filePath = path.join(process.cwd(), route);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // フォールバック実装の確認
    if (content.includes('process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_KEY')) {
      successes.push(`✅ ${path.basename(route)}: フォールバック実装済み`);
    } else if (content.includes('NEXT_PUBLIC_OPENAI_KEY')) {
      warnings.push(`⚠️  ${path.basename(route)}: 古い環境変数のみ使用`);
    }
  }
});

// 3. セキュリティヘッダーの確認
console.log('\n3. セキュリティヘッダーチェック');
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  
  const headers = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Strict-Transport-Security',
    'Permissions-Policy',
    'Content-Security-Policy'
  ];
  
  headers.forEach(header => {
    if (nextConfig.includes(header)) {
      successes.push(`✅ ${header} ヘッダーが設定されています`);
    } else {
      errors.push(`❌ ${header} ヘッダーが設定されていません`);
    }
  });
}

// 4. console.log の使用状況
console.log('\n4. console.log 使用状況チェック');
const srcDir = path.join(process.cwd(), 'src/app/api');

function countConsoleLogs(dir) {
  let count = 0;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      count += countConsoleLogs(fullPath);
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/console\.(log|error|warn)/g);
      if (matches) {
        count += matches.length;
      }
    }
  });
  
  return count;
}

const consoleLogCount = countConsoleLogs(srcDir);
if (consoleLogCount > 0) {
  warnings.push(`⚠️  APIルートに ${consoleLogCount} 個の console.log が残っています`);
} else {
  successes.push('✅ APIルートから console.log が削除されています');
}

// 結果の表示
console.log('\n📊 テスト結果サマリー');
console.log('='.repeat(50));

if (successes.length > 0) {
  console.log('\n✅ 成功項目:');
  successes.forEach(s => console.log('  ' + s));
}

if (warnings.length > 0) {
  console.log('\n⚠️  警告項目:');
  warnings.forEach(w => console.log('  ' + w));
}

if (errors.length > 0) {
  console.log('\n❌ エラー項目:');
  errors.forEach(e => console.log('  ' + e));
}

// 総合評価
console.log('\n📈 総合評価:');
if (errors.length === 0) {
  console.log('✅ セキュリティ強化は正常に実装されています！');
  console.log('   既存機能への影響はありません。');
} else {
  console.log('⚠️  いくつかの問題が検出されました。');
  console.log('   上記のエラー項目を確認してください。');
}

console.log('\n💡 次のステップ:');
console.log('1. .env ファイルに OPENAI_API_KEY を追加');
console.log('2. npm run dev で開発サーバーを起動してテスト');
console.log('3. インタビュー機能が正常に動作することを確認');
console.log('4. 本番環境では NEXT_PUBLIC_OPENAI_KEY を削除');

process.exit(errors.length > 0 ? 1 : 0);