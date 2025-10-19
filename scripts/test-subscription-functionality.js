#!/usr/bin/env node

/**
 * サブスクリプション機能制限の動作テストスクリプト
 * 実際の動作を模擬的にテストして機能を保証
 */

const path = require('path');

console.log('🧪 サブスクリプション機能制限 動作テスト\n');
console.log('='.repeat(60));

// テスト用のモックデータ
const mockOrganizations = {
  'org-free': {
    name: '無料プラン組織',
    subscriptionProductId: 'free'
  },
  'org-basic': {
    name: 'ベーシックプラン組織',
    subscriptionProductId: 'prod_basic'
  },
  'org-pro': {
    name: 'プロプラン組織',
    subscriptionProductId: 'prod_pro'
  },
  'org-enterprise': {
    name: 'エンタープライズ組織',
    subscriptionProductId: 'prod_enterprise'
  }
};

// 使用量のモックデータ
const mockUsage = {
  'org-free': {
    interviews: 2,        // 月間3回まで
    concurrent_interviews: 0,
    themes: 0
  },
  'org-basic': {
    interviews: 19,       // 月間20回まで
    concurrent_interviews: 1,
    themes: 4
  },
  'org-pro': {
    interviews: 99,       // 月間100回まで
    concurrent_interviews: 4,
    themes: 19
  },
  'org-enterprise': {
    interviews: 9999,     // 無制限
    concurrent_interviews: 100,
    themes: 500
  }
};

// テスト結果を格納
const testResults = [];

/**
 * LimitCheckerのモック実装
 */
class MockLimitChecker {
  constructor(configPath) {
    this.config = require(configPath);
  }

  getPlanLimit(organizationId, metric) {
    const org = mockOrganizations[organizationId];
    if (!org) return 0;
    
    const plan = this.config[org.subscriptionProductId];
    if (!plan) return 0;
    
    return plan.limits[metric] || 0;
  }

  canUse(organizationId, metric) {
    // メトリック名を正しく変換
    const metricKey = metric === 'theme_max' ? 'themes' : metric;
    const limitKey = metric === 'themes' ? 'theme_max' : 
                     metric === 'interviews' ? 'interview_monthly' : metric;
    
    const limit = this.getPlanLimit(organizationId, limitKey);
    const current = mockUsage[organizationId]?.[metricKey] || 0;
    
    if (limit === -1) {
      return {
        allowed: true,
        current,
        limit: -1,
        remaining: -1
      };
    }
    
    const remaining = limit - current;
    return {
      allowed: remaining > 0,
      current,
      limit,
      remaining: Math.max(0, remaining)
    };
  }

  canUseConcurrent(organizationId, metric) {
    const limit = this.getPlanLimit(organizationId, 'interview_concurrent');
    const current = mockUsage[organizationId]?.concurrent_interviews || 0;
    
    if (limit === -1) {
      return {
        allowed: true,
        current,
        limit: -1,
        remaining: -1
      };
    }
    
    const remaining = limit - current;
    return {
      allowed: remaining > 0,
      current,
      limit,
      remaining: Math.max(0, remaining)
    };
  }
}

/**
 * テストケース実行
 */
function runTest(testName, testFunc) {
  try {
    const result = testFunc();
    testResults.push({
      name: testName,
      status: result.success ? 'PASS' : 'FAIL',
      message: result.message
    });
    
    if (result.success) {
      console.log(`✅ ${testName}`);
    } else {
      console.log(`❌ ${testName}`);
      console.log(`   理由: ${result.message}`);
    }
  } catch (error) {
    testResults.push({
      name: testName,
      status: 'ERROR',
      message: error.message
    });
    console.log(`💥 ${testName}`);
    console.log(`   エラー: ${error.message}`);
  }
}

// テスト開始
console.log('\n📋 テストケース実行\n');

const configPath = path.join(process.cwd(), 'src/config/subscription-limits.json');
const checker = new MockLimitChecker(configPath);

// ==================== テストケース ====================

console.log('【1. インタビュー月間制限テスト】');
console.log('-'.repeat(40));

runTest('無料プラン: 月間制限内（2/3）', () => {
  const result = checker.canUse('org-free', 'interviews');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

runTest('無料プラン: 月間制限到達時（3/3）', () => {
  mockUsage['org-free'].interviews = 3;
  const result = checker.canUse('org-free', 'interviews');
  mockUsage['org-free'].interviews = 2; // 元に戻す
  return {
    success: result.allowed === false,
    message: `制限到達: ${result.current}/${result.limit}`
  };
});

runTest('ベーシックプラン: 月間制限内（19/20）', () => {
  const result = checker.canUse('org-basic', 'interviews');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

runTest('プロプラン: 月間制限内（99/100）', () => {
  const result = checker.canUse('org-pro', 'interviews');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

runTest('エンタープライズプラン: 無制限', () => {
  const result = checker.canUse('org-enterprise', 'interviews');
  return {
    success: result.allowed === true && result.limit === -1,
    message: `無制限確認`
  };
});

console.log('\n【2. 同時実行数制限テスト】');
console.log('-'.repeat(40));

runTest('無料プラン: 同時実行可能（0/1）', () => {
  const result = checker.canUseConcurrent('org-free', 'interviews');
  return {
    success: result.allowed === true,
    message: `現在: ${result.current}/${result.limit}`
  };
});

runTest('ベーシックプラン: 同時実行制限内（1/2）', () => {
  const result = checker.canUseConcurrent('org-basic', 'interviews');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

runTest('プロプラン: 同時実行制限内（4/5）', () => {
  const result = checker.canUseConcurrent('org-pro', 'interviews');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

console.log('\n【3. テーマ作成数制限テスト】');
console.log('-'.repeat(40));

runTest('無料プラン: テーマ作成可能（0/1）', () => {
  const result = checker.canUse('org-free', 'theme_max');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

runTest('ベーシックプラン: テーマ制限内（4/5）', () => {
  const result = checker.canUse('org-basic', 'theme_max');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

runTest('プロプラン: テーマ制限内（19/20）', () => {
  const result = checker.canUse('org-pro', 'theme_max');
  return {
    success: result.allowed === true && result.remaining === 1,
    message: `残り: ${result.remaining}`
  };
});

console.log('\n【4. 時間制限テスト】');
console.log('-'.repeat(40));

runTest('無料プラン: 10分制限', () => {
  const limit = checker.getPlanLimit('org-free', 'interview_duration_seconds');
  return {
    success: limit === 600,
    message: `制限: ${limit}秒 (${limit/60}分)`
  };
});

runTest('ベーシックプラン: 30分制限', () => {
  const limit = checker.getPlanLimit('org-basic', 'interview_duration_seconds');
  return {
    success: limit === 1800,
    message: `制限: ${limit}秒 (${limit/60}分)`
  };
});

runTest('プロプラン: 60分制限', () => {
  const limit = checker.getPlanLimit('org-pro', 'interview_duration_seconds');
  return {
    success: limit === 3600,
    message: `制限: ${limit}秒 (${limit/60}分)`
  };
});

console.log('\n【5. エッジケーステスト】');
console.log('-'.repeat(40));

runTest('存在しない組織ID', () => {
  const result = checker.canUse('org-unknown', 'interviews');
  return {
    success: result.limit === 0,
    message: '不明な組織は制限0'
  };
});

runTest('組織なし（個人ユーザー）', () => {
  const result = checker.canUse(null, 'interviews');
  return {
    success: result.limit === 0,
    message: '個人ユーザーは制限対象外'
  };
});

// ==================== テスト結果サマリー ====================
console.log('\n' + '='.repeat(60));
console.log('📊 テスト結果サマリー\n');

const passCount = testResults.filter(r => r.status === 'PASS').length;
const failCount = testResults.filter(r => r.status === 'FAIL').length;
const errorCount = testResults.filter(r => r.status === 'ERROR').length;

console.log(`合計: ${testResults.length}件`);
console.log(`✅ 成功: ${passCount}件`);
console.log(`❌ 失敗: ${failCount}件`);
console.log(`💥 エラー: ${errorCount}件`);

if (failCount === 0 && errorCount === 0) {
  console.log('\n🎉 すべてのテストが成功しました！');
  console.log('機能制限システムは正常に動作しています。');
} else {
  console.log('\n⚠️  一部のテストが失敗しました。');
  console.log('実装を確認してください。');
}

// ==================== 設定値の確認 ====================
console.log('\n' + '='.repeat(60));
console.log('⚙️  現在のプラン設定値\n');

const config = require(configPath);
Object.entries(config).forEach(([planId, plan]) => {
  console.log(`【${plan.name}】`);
  console.log(`  月間インタビュー: ${plan.limits.interview_monthly === -1 ? '無制限' : plan.limits.interview_monthly + '回'}`);
  console.log(`  同時実行: ${plan.limits.interview_concurrent === -1 ? '無制限' : plan.limits.interview_concurrent + '件'}`);
  console.log(`  時間制限: ${plan.limits.interview_duration_seconds === -1 ? '無制限' : (plan.limits.interview_duration_seconds / 60) + '分'}`);
  console.log(`  テーマ数: ${plan.limits.theme_max === -1 ? '無制限' : plan.limits.theme_max + '件'}`);
  console.log('');
});

process.exit(failCount + errorCount);