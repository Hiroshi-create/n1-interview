# 🔒 セキュリティガイドライン

## 概要

このドキュメントは、N1 Interview Systemのセキュリティベストプラクティスと実装ガイドラインを提供します。
SaaSアプリケーションとして、セキュリティは最優先事項です。

## 📋 目次

1. [環境変数管理](#環境変数管理)
2. [APIキー管理](#apiキー管理)
3. [レート制限](#レート制限)
4. [認証・認可](#認証認可)
5. [データ保護](#データ保護)
6. [セキュリティチェックリスト](#セキュリティチェックリスト)
7. [インシデント対応](#インシデント対応)

## 環境変数管理

### ✅ ベストプラクティス

1. **絶対にコミットしない**
   ```bash
   # .gitignoreに必ず含める
   .env
   .env.local
   .env.production
   .env.*
   ```

2. **環境ごとの分離**
   ```
   .env.development    # 開発環境
   .env.staging        # ステージング環境
   .env.production     # 本番環境
   ```

3. **環境変数の検証**
   ```typescript
   // アプリケーション起動時に実行
   import { validateEnvironmentVariables } from '@/lib/env-validator';
   validateEnvironmentVariables();
   ```

### ⚠️ セキュリティ警告

- `NEXT_PUBLIC_`プレフィックスの変数はクライアント側に露出します
- 秘密情報には絶対に`NEXT_PUBLIC_`を使用しない
- APIキーや秘密鍵はサーバーサイドのみで使用

## APIキー管理

### 🔑 APIキーのローテーション

定期的なAPIキーのローテーションを実施：

1. **月次ローテーション推奨**
   - OpenAI APIキー
   - Stripe APIキー
   - その他サードパーティAPIキー

2. **即座のローテーション必要な場合**
   - キーの漏洩が疑われる場合
   - 従業員の退職時
   - セキュリティ監査後

### 🛡️ APIキーの保護

1. **Vercel環境変数の使用**
   ```bash
   vercel env add OPENAI_API_KEY production
   ```

2. **シークレット管理サービスの検討**
   - HashiCorp Vault
   - AWS Secrets Manager
   - Azure Key Vault

3. **アクセス制限**
   - 最小権限の原則
   - IPホワイトリスト設定
   - APIキーのスコープ制限

## レート制限

### 実装済みレート制限

```typescript
// src/lib/rate-limiter.ts
const limits = {
  standard: { windowMs: 60000, maxRequests: 60 },
  strict: { windowMs: 60000, maxRequests: 10 },
  search: { windowMs: 60000, maxRequests: 30 },
  interview: { windowMs: 60000, maxRequests: 100 },
  report: { windowMs: 300000, maxRequests: 5 }
};
```

### レート制限の適用

```typescript
// APIルートでの使用例
import { rateLimiters } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const identifier = getClientIdentifier(request);
  const result = await rateLimiters.strict.check(identifier);
  
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  
  // 処理を続行
}
```

## 認証・認可

### Firebase Auth設定

1. **Multi-Factor Authentication (MFA)**
   ```typescript
   // MFA有効化を推奨
   await user.multiFactor.enroll(multiFactorAssertion);
   ```

2. **セッション管理**
   - セッションタイムアウト: 24時間
   - リフレッシュトークン: 30日
   - 同時セッション制限の実装

3. **権限管理**
   ```typescript
   // カスタムクレームでの権限管理
   await adminAuth.setCustomUserClaims(uid, {
     role: 'admin',
     organizationId: 'org123'
   });
   ```

## データ保護

### 暗号化

1. **転送中の暗号化**
   - HTTPS必須（TLS 1.3推奨）
   - HSTS有効化

2. **保存データの暗号化**
   ```typescript
   // 重要データの暗号化例
   import crypto from 'crypto';
   
   const algorithm = 'aes-256-gcm';
   const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
   
   function encrypt(text: string): string {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv(algorithm, key, iv);
     // ... 暗号化処理
   }
   ```

### 個人情報保護

1. **GDPR準拠**
   - データ収集の明示的同意
   - データポータビリティ
   - 忘れられる権利の実装

2. **データ最小化**
   - 必要最小限のデータのみ収集
   - 定期的なデータ削除
   - アノニマイゼーション

## セキュリティチェックリスト

### デプロイ前チェック

- [ ] 環境変数の検証が有効
- [ ] レート制限が全APIに適用
- [ ] 本番環境でデバッグモード無効
- [ ] console.log文が削除済み
- [ ] エラーメッセージに機密情報なし
- [ ] CORS設定が適切
- [ ] CSPヘッダー設定済み
- [ ] 依存関係の脆弱性スキャン実行

### 定期チェック（月次）

- [ ] APIキーのローテーション
- [ ] アクセスログの監査
- [ ] 異常なトラフィックパターンの確認
- [ ] セキュリティアップデートの適用
- [ ] バックアップの検証
- [ ] インシデント対応計画のレビュー

## インシデント対応

### 🚨 セキュリティインシデント発生時

1. **即座の対応**
   ```bash
   # 1. 影響を受けたAPIキーの無効化
   # 2. アクセスログの保全
   # 3. 影響範囲の特定
   ```

2. **調査**
   - ログ分析
   - 影響を受けたユーザーの特定
   - 攻撃ベクターの特定

3. **復旧**
   - 新しいAPIキーの発行
   - セキュリティパッチの適用
   - ユーザーへの通知

4. **事後対応**
   - インシデントレポート作成
   - 再発防止策の実装
   - セキュリティ監査の実施

## 監視とアラート

### 推奨監視項目

1. **異常検知**
   - 大量のAPIリクエスト
   - 認証失敗の急増
   - 異常なデータアクセスパターン

2. **アラート設定**
   ```typescript
   // 例：レート制限違反の監視
   if (rateLimitViolations > 100) {
     await sendAlert({
       type: 'SECURITY',
       severity: 'HIGH',
       message: 'Possible DDoS attack detected'
     });
   }
   ```

## セキュリティツール

### 推奨ツール

1. **脆弱性スキャン**
   ```bash
   npm audit
   npm audit fix
   ```

2. **依存関係チェック**
   ```bash
   npx depcheck
   npx npm-check-updates
   ```

3. **セキュリティヘッダー検証**
   - [Security Headers](https://securityheaders.com/)
   - [SSL Labs](https://www.ssllabs.com/ssltest/)

## 連絡先

セキュリティ問題の報告：
- Email: security@example.com
- 緊急連絡先: [緊急連絡先リスト]

## 更新履歴

- 2024-01-XX: 初版作成
- 2024-01-XX: レート制限実装追加
- 2024-01-XX: 環境変数検証追加

---

⚠️ **重要**: このドキュメントは定期的に更新してください。セキュリティは継続的なプロセスです。