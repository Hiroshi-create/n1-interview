# サブスクリプション機能制限 管理マニュアル

## 目次
1. [概要](#概要)
2. [プラン設定の変更方法](#プラン設定の変更方法)
3. [機能制限の仕組み](#機能制限の仕組み)
4. [使用量の確認方法](#使用量の確認方法)
5. [トラブルシューティング](#トラブルシューティング)
6. [よくある質問](#よくある質問)

## 概要

このシステムでは、サブスクリプションプランによって以下の機能を制限できます：

- **月間インタビュー実施回数** - 1ヶ月に実施できるインタビューの上限
- **同時実行インタビュー数** - 同時に実行できるインタビューの数
- **インタビュー時間制限** - 1回のインタビューの最大時間
- **テーマ作成数** - 作成できるテーマの総数
- **レポート生成回数** - 月間のレポート生成回数
- **エクスポート回数** - データエクスポートの月間回数

## プラン設定の変更方法

### 1. 設定ファイルの場所

```
src/config/subscription-limits.json
```

### 2. プラン構成

現在、4つのプランが定義されています：

| プラン名 | プランID | 用途 |
|---------|----------|------|
| 無料プラン | free | 無料ユーザー |
| ベーシック | prod_basic | 小規模組織 |
| プロ | prod_pro | 中規模組織 |
| エンタープライズ | prod_enterprise | 大規模組織 |

### 3. 制限値の変更方法

設定ファイルを編集して、各プランの制限値を変更できます：

```json
{
  "free": {
    "name": "無料プラン",
    "limits": {
      "interview_monthly": 3,        // 月間インタビュー回数
      "interview_concurrent": 1,      // 同時実行数
      "interview_duration_seconds": 600, // 時間制限（秒）
      "theme_max": 1,                // テーマ数上限
      "report_monthly": 3,           // 月間レポート生成
      "export_monthly": 1            // 月間エクスポート
    }
  }
}
```

**特殊な値：**
- `-1` を設定すると「無制限」になります
- `0` を設定すると「利用不可」になります

### 4. 変更の反映

設定ファイルを変更後：

1. **開発環境**: サーバーを再起動
   ```bash
   npm run dev
   ```

2. **本番環境**: 再デプロイが必要
   ```bash
   npm run build
   vercel --prod
   ```

## 機能制限の仕組み

### 制限チェックのタイミング

| API | チェック内容 | HTTPステータス |
|-----|-------------|---------------|
| `/api/create_interview` | 月間回数、同時実行数、時間制限 | 429（制限超過時） |
| `/api/interview_server` | 終了時に同時実行数をデクリメント | - |
| `/api/create_theme` | テーマ作成数上限 | 429（制限超過時） |

### エラーレスポンス形式

制限超過時のレスポンス例：

```json
{
  "error": "limit_exceeded",
  "message": "月間インタビュー回数の上限に達しています",
  "details": {
    "feature": "月間インタビュー回数",
    "limit": 3,
    "current": 3,
    "remaining": 0,
    "upgradeUrl": "/client-view/subscriptions"
  }
}
```

## 使用量の確認方法

### Firestoreでの確認

使用量データは以下の場所に保存されます：

```
firestore/
└── clients/
    └── {organizationId}/
        └── usage/
            └── current/
                ├── interviews (月間使用数)
                ├── concurrent_interviews (現在の同時実行数)
                ├── themes (現在のテーマ数)
                ├── reports (月間レポート生成数)
                └── exports (月間エクスポート数)
```

### Firebase Consoleでの確認手順

1. Firebase Consoleにログイン
2. Firestoreデータベースを開く
3. `clients/{organizationId}/usage/current`を参照
4. 各ドキュメントの`count`フィールドが現在の使用量

### プログラムでの確認

```typescript
// 使用量を取得するコード例
import { LimitChecker } from '@/lib/subscription/limit-checker';

const checker = new LimitChecker();
const result = await checker.canUse(organizationId, 'interviews');

console.log({
  使用可能: result.allowed,
  現在使用量: result.current,
  制限値: result.limit,
  残り: result.remaining
});
```

## トラブルシューティング

### 問題1: 制限が適用されない

**原因と対処法：**

1. **組織IDが設定されていない**
   - ユーザーの`organizationId`フィールドを確認
   - 組織なしユーザーには制限が適用されません

2. **プランIDが正しくない**
   - `clients/{organizationId}`ドキュメントの`subscriptionProductId`を確認
   - 設定ファイルのプランIDと一致しているか確認

3. **キャッシュの問題**
   - サーバーを再起動して設定を再読み込み

### 問題2: 同時実行数が減らない

**原因と対処法：**

1. **インタビューが正常終了していない**
   - `interview_server` APIで`isInterviewEnded`または`thank_you`テンプレートが呼ばれているか確認
   - エラーログを確認

2. **手動でリセットする方法**
   ```javascript
   // Firestore Consoleで実行
   clients/{organizationId}/usage/current/concurrent_interviews
   のcountフィールドを0にリセット
   ```

### 問題3: 月間使用量がリセットされない

**原因と対処法：**

月間使用量は`lastReset`フィールドで管理されます：

1. **手動リセット方法**
   ```javascript
   // 該当ドキュメントを削除または更新
   {
     count: 0,
     lastReset: Timestamp.now()
   }
   ```

2. **自動リセットの確認**
   - `UsageTracker.incrementUsage()`メソッドが月初判定を行います
   - タイムゾーンはUTCで処理されます

## よくある質問

### Q1: 新しいプランを追加するには？

**A:** `subscription-limits.json`に新しいプランを追加：

```json
{
  "custom_plan": {
    "name": "カスタムプラン",
    "limits": {
      "interview_monthly": 50,
      "interview_concurrent": 3,
      // ... その他の制限
    }
  }
}
```

### Q2: 特定の組織だけ制限を変更できる？

**A:** 組織ごとのカスタム制限は現在未実装です。実装する場合：

1. `clients/{organizationId}`ドキュメントに`customLimits`フィールドを追加
2. `LimitChecker`でカスタム制限を優先的にチェック

### Q3: 制限到達の通知を送るには？

**A:** 以下の場所にフックを追加できます：

```typescript
// limit-checker.ts の canUse() メソッド内
if (remaining <= limit * 0.1) { // 残り10%以下
  // 通知処理を追加
  await sendLimitWarningNotification(organizationId, metric);
}
```

### Q4: テスト環境での制限を無効化するには？

**A:** 環境変数で制御：

```typescript
// limit-checker.ts
if (process.env.DISABLE_LIMITS === 'true') {
  return { allowed: true, current: 0, limit: -1, remaining: -1 };
}
```

### Q5: 使用量のデータ分析をするには？

**A:** Firebase Functionsで定期的にエクスポート：

```typescript
// 月次レポート生成例
exports.monthlyUsageReport = functions.pubsub
  .schedule('0 0 1 * *') // 毎月1日
  .onRun(async () => {
    const usage = await collectUsageData();
    await exportToBigQuery(usage);
  });
```

## 設定変更時の注意事項

### ⚠️ 重要な注意点

1. **制限を厳しくする場合**
   - 既存ユーザーへの事前通知が必要
   - 段階的な移行期間を設ける

2. **制限を緩和する場合**
   - サーバーリソースへの影響を考慮
   - コスト増加の可能性を検討

3. **本番環境での変更**
   - 必ず開発環境でテスト
   - ピーク時間を避けて実施
   - ロールバック計画を準備

## サポート

問題が解決しない場合は、以下の情報とともに開発チームに連絡してください：

- 組織ID
- エラーメッセージ
- 発生日時
- 実行したAPI
- ログファイル（`/api`のレスポンス）

---
最終更新日: 2024年