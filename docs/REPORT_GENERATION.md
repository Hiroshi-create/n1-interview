# 自動レポート生成機能

## 概要
インタビュー完了時に自動的にMarkdown形式のレポートを生成し、Firestoreに保存する機能です。

## 機能の特徴

### 1. 自動生成（3つの方法）

#### a. インタビュー完了時の自動生成
- **トリガー**: インタビューが完了（`interviewCollected: true`）になった時点
- **処理場所**: `/api/interview_server/route.tsx`
- **特徴**: 非同期処理でインタビュー終了を遅延させない

#### b. 定期的な未生成レポートのチェック（Cron Job）
- **スケジュール**: 10分ごと
- **処理場所**: `/api/cron/generate-missing-reports`
- **対象**: `interviewCollected: true` かつ `reportCreated: false` のインタビュー

#### c. 手動生成
- **UI**: 組織画面の個別レポートリストに「レポート生成」ボタン
- **処理場所**: `/api/report/individualReport`
- **用途**: 特定のインタビューのレポートを即座に生成

### 2. 重複防止機能
- 既存レポートの検出
- `skipIfExists`オプションによる制御
- 強制再生成オプション（`forceRegenerate`）

### 3. エラーハンドリング
- 生成失敗時のログ記録
- UIでのエラー表示
- リトライ機能

## データベース構造

```
/themes/{themeId}/
  └── interviews/{interviewId}/
      ├── messages/              # インタビューメッセージ
      ├── individualReport/      # 生成されたレポート
      │   └── {reportId}/
      │       ├── individualReportId
      │       ├── createdAt
      │       └── report (Markdown形式)
      └── フィールド:
          ├── interviewCollected  # インタビュー完了フラグ
          ├── reportCreated      # レポート生成済みフラグ
          └── temporaryId        # 一時ID
```

## API エンドポイント

### POST /api/report/individualReport
個別レポートを生成

**リクエスト:**
```json
{
  "theme": "製品インタビュー",
  "interviewRefPath": "themes/{themeId}/interviews/{interviewId}",
  "forceRegenerate": false,
  "useGPT4": false
}
```

**レスポンス:**
```json
{
  "report": "# レポート内容...",
  "reportId": "uuid",
  "temporaryId": "uuid",
  "generated": true
}
```

### GET /api/cron/generate-missing-reports
未生成レポートを検出して生成

**パラメータ:**
- `themeId` (optional): 特定テーマのみ処理
- `limit` (optional): 処理件数の上限（デフォルト: 5）
- `secret` (optional): 手動実行時の認証トークン

## UI コンポーネント

### IndividualReportList
- 未生成レポートの検出と表示
- 手動生成ボタン
- 一括生成機能
- リアルタイム状態更新

## 設定

### 環境変数
```bash
# OpenAI API（必須）
OPENAI_API_KEY=sk-xxx
# または
NEXT_PUBLIC_OPENAI_KEY=sk-xxx

# Cron認証（本番環境推奨）
CRON_SECRET=your-secret-key
```

### Vercel設定 (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-missing-reports",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

## テスト方法

### 1. 自動生成のテスト
1. インタビューを完了させる
2. Firestoreで`individualReport`コレクションを確認
3. レポートが自動生成されていることを確認

### 2. 手動生成のテスト
1. 組織画面を開く
2. レポート未生成のインタビューを確認
3. 「レポート生成」ボタンをクリック
4. レポートが生成されることを確認

### 3. Cronジョブのテスト
```bash
# ローカルテスト
curl http://localhost:3000/api/cron/generate-missing-reports?limit=1

# 本番環境（認証付き）
curl https://your-domain.vercel.app/api/cron/generate-missing-reports?secret=YOUR_SECRET&limit=1
```

### 4. テストスクリプト
```bash
node scripts/test-report-generation.js
```

## トラブルシューティング

### レポートが生成されない場合
1. OpenAI APIキーが正しく設定されているか確認
2. Firestoreの権限設定を確認
3. ログでエラーメッセージを確認
4. インタビューの`interviewCollected`フラグが`true`になっているか確認

### Cronジョブが動作しない場合
1. Vercel.jsonの設定を確認
2. Vercelダッシュボードでcron実行ログを確認
3. CRON_SECRET環境変数を設定（本番環境）

### パフォーマンス問題
- 一度に処理する件数を`limit`パラメータで調整
- GPT-3.5を使用（GPT-4より高速）
- 非同期処理の活用

## 今後の改善案

1. **バッチ処理の最適化**
   - 並列処理の実装
   - キューシステムの導入

2. **レポート品質の向上**
   - プロンプトの最適化
   - テンプレートのカスタマイズ機能

3. **モニタリング強化**
   - 生成成功率の追跡
   - アラート機能の追加

4. **Cloud Functionsへの移行**
   - より堅牢なバックグラウンド処理
   - リトライメカニズムの強化