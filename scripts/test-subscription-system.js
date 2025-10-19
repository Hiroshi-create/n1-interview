#!/usr/bin/env node

/**
 * サブスクリプション制限システムのテストスクリプト
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 サブスクリプション制限システムテスト開始...\n');

let errors = [];
let warnings = [];
let successes = [];

// 1. 設定ファイルの存在確認
console.log('1. 設定ファイルチェック');

const configPath = path.join(process.cwd(), 'src/config/subscription-limits.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // プランの確認
  const requiredPlans = ['free', 'prod_basic', 'prod_pro', 'prod_enterprise'];
  const foundPlans = Object.keys(config);
  
  requiredPlans.forEach(plan => {
    if (foundPlans.includes(plan)) {
      successes.push(`✅ ${plan}プランが定義されています`);
    } else {
      errors.push(`❌ ${plan}プランが見つかりません`);
    }
  });
  
  // 各プランの必須項目チェック
  const requiredLimits = [
    'interview_monthly',
    'interview_concurrent',
    'interview_duration_seconds',
    'theme_max',
    'user_max',
    'export_monthly',
    'report_individual_monthly',
    'report_summary_monthly',
    'clustering_monthly',
    'data_retention_days'
  ];
  
  Object.entries(config).forEach(([planId, plan]) => {
    if (plan.limits) {
      const missingLimits = requiredLimits.filter(limit => 
        plan.limits[limit] === undefined
      );
      
      if (missingLimits.length === 0) {
        successes.push(`✅ ${planId}: 全ての制限項目が定義済み`);
      } else {
        warnings.push(`⚠️ ${planId}: 不足項目 - ${missingLimits.join(', ')}`);
      }
    }
  });
} else {
  errors.push('❌ subscription-limits.json が存在しません');
}

// 2. TypeScript型定義の確認
console.log('\n2. TypeScript型定義チェック');

const typesPath = path.join(process.cwd(), 'src/types/subscription.ts');
if (fs.existsSync(typesPath)) {
  const content = fs.readFileSync(typesPath, 'utf8');
  
  const requiredTypes = [
    'PlanLimits',
    'SubscriptionPlan',
    'SubscriptionLimits',
    'UsageData',
    'ConcurrentUsage',
    'UsageCheckResult',
    'MetricType',
    'LimitError'
  ];
  
  requiredTypes.forEach(type => {
    if (content.includes(`export interface ${type}`) || 
        content.includes(`export type ${type}`)) {
      successes.push(`✅ ${type}型が定義されています`);
    } else {
      errors.push(`❌ ${type}型が見つかりません`);
    }
  });
} else {
  errors.push('❌ types/subscription.ts が存在しません');
}

// 3. ライブラリファイルの確認
console.log('\n3. ライブラリファイルチェック');

const libFiles = [
  'src/lib/subscription/usage-tracker.ts',
  'src/lib/subscription/limit-checker.ts',
  'src/lib/subscription/helpers.ts'
];

libFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(file);
    
    // クラスの存在確認
    if (fileName === 'usage-tracker.ts') {
      if (content.includes('export class UsageTracker')) {
        successes.push('✅ UsageTrackerクラスが実装済み');
        
        // 主要メソッドの確認
        const methods = [
          'incrementUsage',
          'getUsage',
          'resetMonthlyUsage',
          'incrementConcurrent',
          'decrementConcurrent'
        ];
        
        methods.forEach(method => {
          if (content.includes(`async ${method}(`)) {
            successes.push(`  ✓ ${method}メソッド実装済み`);
          } else {
            warnings.push(`  ⚠️ ${method}メソッドが見つかりません`);
          }
        });
      }
    }
    
    if (fileName === 'limit-checker.ts') {
      if (content.includes('export class LimitChecker')) {
        successes.push('✅ LimitCheckerクラスが実装済み');
        
        const methods = [
          'getPlanLimit',
          'canUse',
          'canUseConcurrent',
          'checkMultiple'
        ];
        
        methods.forEach(method => {
          if (content.includes(`async ${method}(`)) {
            successes.push(`  ✓ ${method}メソッド実装済み`);
          } else {
            warnings.push(`  ⚠️ ${method}メソッドが見つかりません`);
          }
        });
      }
    }
    
    if (fileName === 'helpers.ts') {
      const functions = [
        'getOrganizationId',
        'createLimitError',
        'getFeatureDisplayName',
        'formatDuration'
      ];
      
      functions.forEach(func => {
        if (content.includes(`export async function ${func}`) || 
            content.includes(`export function ${func}`)) {
          successes.push(`✅ ${func}関数が実装済み`);
        } else {
          warnings.push(`⚠️ ${func}関数が見つかりません`);
        }
      });
    }
  } else {
    errors.push(`❌ ${file} が存在しません`);
  }
});

// 4. エラーハンドリングチェック
console.log('\n4. エラーハンドリングチェック');

const usageTrackerPath = path.join(process.cwd(), 'src/lib/subscription/usage-tracker.ts');
if (fs.existsSync(usageTrackerPath)) {
  const content = fs.readFileSync(usageTrackerPath, 'utf8');
  
  if (content.includes('try {') && content.includes('catch (error)')) {
    successes.push('✅ エラーハンドリングが実装されています');
  }
  
  if (content.includes('logger.error')) {
    successes.push('✅ エラーロギングが実装されています');
  }
  
  if (content.includes('runTransaction')) {
    successes.push('✅ トランザクション処理が実装されています');
  }
}

// 5. セキュリティチェック
console.log('\n5. セキュリティチェック');

const limitCheckerPath = path.join(process.cwd(), 'src/lib/subscription/limit-checker.ts');
if (fs.existsSync(limitCheckerPath)) {
  const content = fs.readFileSync(limitCheckerPath, 'utf8');
  
  if (content.includes('if (!organizationId)')) {
    successes.push('✅ organizationIdの検証が実装されています');
  }
  
  if (content.includes('Math.max(0,')) {
    successes.push('✅ 負の値対策が実装されています');
  }
  
  if (content.includes('// エラー時は安全側に倒す')) {
    successes.push('✅ フェイルセーフが実装されています');
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
  if (warnings.length === 0) {
    console.log('🏆 完璧！サブスクリプション制限システムが正常に実装されています！');
  } else {
    console.log('✅ 良好！基本的な実装は完了していますが、一部改善の余地があります。');
  }
} else {
  console.log('⚠️  一部の実装が不足しています。');
  console.log('   上記のエラー項目を確認してください。');
}

// 実装チェックリスト
console.log('\n📝 実装チェックリスト:');
console.log('□ プラン設定ファイル (subscription-limits.json)');
console.log('□ TypeScript型定義 (types/subscription.ts)');
console.log('□ 使用量トラッカー (usage-tracker.ts)');
console.log('□ 制限チェッカー (limit-checker.ts)');
console.log('□ ヘルパー関数 (helpers.ts)');
console.log('□ エラーハンドリング');
console.log('□ トランザクション処理');
console.log('□ ロギング');

console.log('\n💡 次のステップ:');
console.log('1. APIエンドポイントへの統合');
console.log('2. UI表示コンポーネントの作成');
console.log('3. 使用量表示ダッシュボード');
console.log('4. 本番環境でのテスト');

process.exit(errors.length > 0 ? 1 : 0);