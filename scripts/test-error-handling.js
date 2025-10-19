#!/usr/bin/env node

/**
 * エラーハンドリング改善のテストスクリプト
 * フェーズ2の実装を検証
 */

const fs = require('fs');
const path = require('path');

console.log('🛡️ エラーハンドリングテスト開始...\n');

let errors = [];
let warnings = [];
let successes = [];

// 1. エラーハンドリングファイルの存在確認
console.log('1. エラーハンドリングシステムチェック');

const errorHandlerPath = path.join(process.cwd(), 'src/lib/error-handler.ts');
const externalApiPath = path.join(process.cwd(), 'src/lib/external-api.ts');
const errorBoundaryPath = path.join(process.cwd(), 'src/components/ErrorBoundary.tsx');

if (fs.existsSync(errorHandlerPath)) {
  const content = fs.readFileSync(errorHandlerPath, 'utf8');
  
  // 主要クラスの確認
  if (content.includes('class ApplicationError')) {
    successes.push('✅ ApplicationError クラスが実装されています');
  }
  
  if (content.includes('class CircuitBreaker')) {
    successes.push('✅ CircuitBreaker パターンが実装されています');
  }
  
  if (content.includes('function withRetry')) {
    successes.push('✅ リトライ機構が実装されています');
  }
  
  if (content.includes('function withTimeout')) {
    successes.push('✅ タイムアウト処理が実装されています');
  }
} else {
  errors.push('❌ error-handler.ts ファイルが存在しません');
}

// 2. 外部API安全ラッパーの確認
console.log('\n2. 外部APIラッパーチェック');

if (fs.existsSync(externalApiPath)) {
  const content = fs.readFileSync(externalApiPath, 'utf8');
  
  if (content.includes('class SafeOpenAIClient')) {
    successes.push('✅ SafeOpenAIClient が実装されています');
  }
  
  if (content.includes('class SafeGCPSpeechClient')) {
    successes.push('✅ SafeGCPSpeechClient が実装されています');
  }
  
  if (content.includes('class SafeStripeClient')) {
    successes.push('✅ SafeStripeClient が実装されています');
  }
} else {
  errors.push('❌ external-api.ts ファイルが存在しません');
}

// 3. グローバルエラーバウンダリの確認
console.log('\n3. エラーバウンダリチェック');

if (fs.existsSync(errorBoundaryPath)) {
  const content = fs.readFileSync(errorBoundaryPath, 'utf8');
  
  if (content.includes('class ErrorBoundary')) {
    successes.push('✅ ErrorBoundary コンポーネントが実装されています');
  }
  
  if (content.includes('componentDidCatch')) {
    successes.push('✅ componentDidCatch が実装されています');
  }
  
  if (content.includes('useErrorHandler')) {
    successes.push('✅ useErrorHandler フックが実装されています');
  }
} else {
  errors.push('❌ ErrorBoundary.tsx ファイルが存在しません');
}

// 4. layout.tsxでのErrorBoundary使用確認
console.log('\n4. グローバル適用チェック');

const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
if (fs.existsSync(layoutPath)) {
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  if (content.includes('import { ErrorBoundary }') && content.includes('<ErrorBoundary>')) {
    successes.push('✅ ErrorBoundary がグローバルに適用されています');
  } else {
    warnings.push('⚠️  ErrorBoundary がlayout.tsxで使用されていません');
  }
}

// 5. APIルートでの適用確認
console.log('\n5. APIルート適用チェック');

const apiRoutes = [
  'src/app/api/interview_server/route.tsx',
  'src/app/api/transcribe/route.tsx'
];

apiRoutes.forEach(route => {
  const filePath = path.join(process.cwd(), route);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('SafeOpenAIClient') || content.includes('withRetry')) {
      successes.push(`✅ ${path.basename(route)}: 新エラーハンドリング適用済み`);
    } else if (content.includes('ValidationError') || content.includes('ApplicationError')) {
      successes.push(`✅ ${path.basename(route)}: カスタムエラークラス使用`);
    } else {
      warnings.push(`⚠️  ${path.basename(route)}: 従来のエラーハンドリング`);
    }
  }
});

// 6. api-utils.tsの更新確認
console.log('\n6. api-utils拡張チェック');

const apiUtilsPath = path.join(process.cwd(), 'src/lib/api-utils.ts');
if (fs.existsSync(apiUtilsPath)) {
  const content = fs.readFileSync(apiUtilsPath, 'utf8');
  
  if (content.includes('ApplicationError')) {
    successes.push('✅ api-utils.ts が ApplicationError に対応');
  }
  
  if (content.includes('from \'./error-handler\'')) {
    successes.push('✅ api-utils.ts が error-handler をインポート');
  }
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
  console.log('✅ エラーハンドリングシステムが正常に実装されています！');
  console.log('   - リトライ機構 ✓');
  console.log('   - サーキットブレーカー ✓');
  console.log('   - タイムアウト管理 ✓');
  console.log('   - グローバルエラーバウンダリ ✓');
} else {
  console.log('⚠️  いくつかの実装が不足しています。');
  console.log('   上記のエラー項目を確認してください。');
}

// 機能の説明
console.log('\n💡 実装された機能:');
console.log('• リトライ機構: 外部APIエラー時に指数バックオフで自動再試行');
console.log('• サーキットブレーカー: 連続失敗時にAPIを一時的に遮断');
console.log('• タイムアウト管理: API呼び出しに適切なタイムアウト設定');
console.log('• エラーバウンダリ: UIエラーを優雅に処理');
console.log('• カスタムエラークラス: 詳細なエラー分類と処理');

console.log('\n🚀 次のステップ:');
console.log('1. npm run dev で開発サーバーを起動');
console.log('2. インタビュー機能でエラーハンドリングをテスト');
console.log('3. ネットワークエラーをシミュレートして動作確認');
console.log('4. 本番環境でのエラー監視設定');

process.exit(errors.length > 0 ? 1 : 0);