/**
 * 環境変数バリデーター
 * アプリケーション起動時に必須環境変数の存在と形式を検証
 */

import { logger } from './logger';

interface EnvConfig {
  // OpenAI
  OPENAI_API_KEY: string;
  
  // Firebase Admin
  FIREBASE_ADMIN_PROJECT_ID: string;
  FIREBASE_ADMIN_CLIENT_EMAIL: string;
  FIREBASE_ADMIN_PRIVATE_KEY: string;
  
  // Google Cloud
  GCP_PROJECT_ID: string;
  GCP_PRIVATE_KEY: string;
  GCP_CLIENT_EMAIL: string;
  
  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // Firebase Public (NEXT_PUBLIC)
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  
  // Stripe Public
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  
  // Optional
  GOO_LAB_APP_ID?: string;
  ALLOWED_ORIGINS?: string;
  NODE_ENV?: string;
  LOG_LEVEL?: string;
  
  // Vercel KV (optional but recommended for rate limiting)
  KV_URL?: string;
  KV_REST_API_TOKEN?: string;
  KV_REST_API_READ_ONLY_TOKEN?: string;
}

/**
 * 環境変数の検証ルール
 */
const validators = {
  // OpenAI APIキーの形式チェック
  OPENAI_API_KEY: (value: string): boolean => {
    if (!value || value === 'your_openai_api_key') {
      logger.error('OPENAI_API_KEY is not configured or using placeholder value');
      return false;
    }
    // OpenAI APIキーは "sk-" で始まる
    if (!value.startsWith('sk-')) {
      logger.warn('OPENAI_API_KEY may be invalid (should start with "sk-")');
    }
    return true;
  },
  
  // Firebase Admin秘密鍵の形式チェック
  FIREBASE_ADMIN_PRIVATE_KEY: (value: string): boolean => {
    if (!value || value === 'your_firebase_admin_private_key') {
      logger.error('FIREBASE_ADMIN_PRIVATE_KEY is not configured or using placeholder value');
      return false;
    }
    // PEM形式の秘密鍵かチェック
    if (!value.includes('BEGIN PRIVATE KEY')) {
      logger.error('FIREBASE_ADMIN_PRIVATE_KEY is not in valid PEM format');
      return false;
    }
    return true;
  },
  
  // GCP秘密鍵の形式チェック
  GCP_PRIVATE_KEY: (value: string): boolean => {
    if (!value || value === 'your_gcp_private_key') {
      logger.error('GCP_PRIVATE_KEY is not configured or using placeholder value');
      return false;
    }
    // PEM形式の秘密鍵かチェック
    if (!value.includes('BEGIN PRIVATE KEY')) {
      logger.error('GCP_PRIVATE_KEY is not in valid PEM format');
      return false;
    }
    return true;
  },
  
  // Stripe秘密鍵の形式チェック
  STRIPE_SECRET_KEY: (value: string): boolean => {
    if (!value || value === 'your_stripe_secret_key') {
      logger.error('STRIPE_SECRET_KEY is not configured or using placeholder value');
      return false;
    }
    // Stripeキーは "sk_test_" または "sk_live_" で始まる
    if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
      logger.warn('STRIPE_SECRET_KEY may be invalid');
    }
    return true;
  },
  
  // Stripe Webhook Secretの形式チェック
  STRIPE_WEBHOOK_SECRET: (value: string): boolean => {
    if (!value || value === 'your_stripe_webhook_secret') {
      logger.error('STRIPE_WEBHOOK_SECRET is not configured or using placeholder value');
      return false;
    }
    // Webhook secretは "whsec_" で始まる
    if (!value.startsWith('whsec_')) {
      logger.warn('STRIPE_WEBHOOK_SECRET may be invalid (should start with "whsec_")');
    }
    return true;
  }
};

/**
 * 環境変数を検証
 */
export function validateEnvironmentVariables(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  logger.info('環境変数の検証を開始します...');
  
  // 必須環境変数のチェック
  const requiredVars: (keyof EnvConfig)[] = [
    'OPENAI_API_KEY',
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'GCP_PROJECT_ID',
    'GCP_PRIVATE_KEY',
    'GCP_CLIENT_EMAIL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    // 存在チェック
    if (!value) {
      errors.push(`必須環境変数 ${varName} が設定されていません`);
      continue;
    }
    
    // カスタムバリデーターがある場合は実行
    const validator = validators[varName as keyof typeof validators];
    if (validator && !validator(value)) {
      errors.push(`環境変数 ${varName} の形式が不正です`);
    }
  }
  
  // Vercel KVの設定チェック（推奨）
  if (!process.env.KV_URL || !process.env.KV_REST_API_TOKEN) {
    warnings.push('Vercel KV が設定されていません。レート制限機能が制限されます。');
  }
  
  // セキュリティ警告
  if (process.env.NODE_ENV === 'production') {
    // 本番環境でのセキュリティチェック
    
    // デバッグログレベルの警告
    if (process.env.LOG_LEVEL === 'debug') {
      warnings.push('本番環境でLOG_LEVELがdebugに設定されています。情報漏洩のリスクがあります。');
    }
    
    // CORS設定の確認
    if (!process.env.ALLOWED_ORIGINS) {
      warnings.push('ALLOWED_ORIGINSが設定されていません。CORS保護が無効になっている可能性があります。');
    }
    
    // テスト用Stripeキーの警告
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      warnings.push('本番環境でStripeテストキーが使用されています！');
    }
  }
  
  // 非推奨環境変数の警告
  if (process.env.NEXT_PUBLIC_OPENAI_KEY) {
    warnings.push('NEXT_PUBLIC_OPENAI_KEY は非推奨です。OPENAI_API_KEY を使用してください。');
    logger.warn('⚠️ セキュリティ警告: NEXT_PUBLIC_OPENAI_KEY はクライアント側に露出します！');
  }
  
  // 結果の出力
  if (errors.length > 0) {
    logger.error('環境変数の検証エラー:');
    errors.forEach(error => logger.error(`  ❌ ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('必須環境変数が設定されていません。アプリケーションを起動できません。');
    }
  }
  
  if (warnings.length > 0) {
    logger.warn('環境変数の警告:');
    warnings.forEach(warning => logger.warn(`  ⚠️ ${warning}`));
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    logger.info('✅ 環境変数の検証が正常に完了しました');
  }
}

/**
 * 環境変数を安全に取得
 */
export function getEnvVar(key: keyof EnvConfig): string | undefined {
  return process.env[key];
}

/**
 * 必須環境変数を取得（存在しない場合はエラー）
 */
export function getRequiredEnvVar(key: keyof EnvConfig): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`必須環境変数 ${key} が設定されていません`);
  }
  return value;
}

/**
 * セキュアな環境変数の取得（秘密情報のマスキング付き）
 */
export function getSecureEnvVar(key: keyof EnvConfig): string {
  const value = getRequiredEnvVar(key);
  
  // ログに記録する際はマスキング
  const maskedValue = value.substring(0, 8) + '...' + value.substring(value.length - 4);
  logger.debug(`環境変数 ${key} を取得しました: ${maskedValue}`);
  
  return value;
}

/**
 * 環境設定のサマリーを取得（デバッグ用）
 */
export function getEnvSummary(): Record<string, string> {
  const summary: Record<string, string> = {};
  
  // 公開可能な環境変数のみ含める
  const publicVars = [
    'NODE_ENV',
    'LOG_LEVEL',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'ALLOWED_ORIGINS'
  ];
  
  for (const varName of publicVars) {
    const value = process.env[varName];
    if (value) {
      summary[varName] = value;
    }
  }
  
  // 秘密情報は存在確認のみ
  const secretVars = [
    'OPENAI_API_KEY',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'GCP_PRIVATE_KEY',
    'STRIPE_SECRET_KEY'
  ];
  
  for (const varName of secretVars) {
    summary[varName] = process.env[varName] ? '✅ 設定済み' : '❌ 未設定';
  }
  
  return summary;
}

// アプリケーション起動時に自動実行（Next.jsの場合）
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  validateEnvironmentVariables();
}