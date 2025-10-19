# N1 Interview System - 完全仕様書

## 1. システム概要

### 1.1 プロジェクト名
**N1 Interview Input** - AIパワード3Dアバター面接システム

### 1.2 目的
商品開発のためのユーザーインタビューを自動化し、3Dアバターとリアルタイム音声認識を活用して、深い顧客洞察を効率的に収集するシステム。

### 1.3 主要特徴
- リアルタイム音声認識・対話
- 3Dアバターによる自然な面接体験
- 日本語リップシンク対応
- 感情分析と表情制御
- マルチテナント対応
- 企業向け分析ダッシュボード

## 2. 技術スタック

### 2.1 フロントエンド
```
Framework: Next.js 14 (App Router)
Language: TypeScript 5
UI Library: React 18.2.0
3D Graphics: Three.js + React Three Fiber
Styling: Tailwind CSS 3.4.1
UI Components: shadcn/ui + Radix UI
State Management: React Context API
Animation: Framer Motion 12.4.4
Charts: Nivo Charts, Highcharts
```

### 2.2 バックエンド
```
Runtime: Node.js (Next.js API Routes)
Authentication: Firebase Auth + Admin SDK
Database: Firebase Firestore
Cache: Vercel KV
External APIs:
  - OpenAI API (GPT-4, TTS)
  - Google Cloud Speech API
  - Goo Labs API (日本語音素解析)
Payment: Stripe API
```

### 2.3 インフラストラクチャ
```
Hosting: Vercel
Functions: Firebase Cloud Functions
Media Storage: Cloudinary
External Services: FFmpeg API (Go)
```

## 3. システムアーキテクチャ

### 3.1 ディレクトリ構造
```
n1-interview-input/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API エンドポイント
│   │   ├── auto-interview/     # 個人ユーザー向け面接
│   │   ├── client-view/        # 企業向けダッシュボード
│   │   ├── clients/            # 企業ログイン
│   │   ├── users/              # ユーザーログイン
│   │   ├── home/               # ホームページ
│   │   └── terms/              # 利用規約
│   ├── context/                # React Context & グローバル状態
│   ├── lib/                    # ユーティリティ・設定
│   ├── stores/                 # TypeScript型定義
│   └── components/             # 共通コンポーネント
├── public/
│   ├── animations/             # FBXアニメーション
│   ├── models/                 # 3Dモデル (GLB)
│   └── images/                 # 画像リソース
├── cloud_functions/            # Firebase Functions
└── external/
    └── ffmpeg-api/            # 音声処理API (Go)
```

### 3.2 データフロー

#### 3.2.1 音声面接パイプライン
```mermaid
1. ユーザー音声入力 (WebRTC/MediaRecorder)
   ↓
2. 音声データ送信 (/api/transcribe)
   ↓
3. Google Cloud Speech API (リアルタイム文字起こし)
   ↓
4. テキスト処理 (/api/interview_server)
   ↓
5. OpenAI GPT-4 (応答生成)
   ↓
6. OpenAI TTS (音声合成)
   ↓
7. 日本語音素解析 (Goo Labs API)
   ↓
8. リップシンクデータ生成
   ↓
9. 3Dアバター表示 (Three.js)
```

## 4. 機能仕様

### 4.1 ユーザータイプと権限

#### 4.1.1 個人ユーザー
- **パス**: `/auto-interview/[userId]/`
- **機能**:
  - 面接テーマ選択
  - リアルタイム音声面接
  - 個人レポート閲覧
  - MFA設定

#### 4.1.2 企業組織ユーザー
- **パス**: `/client-view/[userId]/`
- **機能**:
  - テーマ作成・管理
  - 複数面接データ分析
  - チームメンバー管理
  - 統計レポート生成
  - サブスクリプション管理

#### 4.1.3 ゲストユーザー
- **パス**: `/auto-interview/guest-user/`
- **機能**: 登録なしで面接体験（制限付き）

### 4.2 認証システム

#### 4.2.1 認証方式
- Firebase Authentication
- TOTP方式の多要素認証（MFA）
- テナント分離による組織別認証

#### 4.2.2 セキュリティ機能
```typescript
// 認証フロー
1. メール/パスワード認証
2. TOTP MFA確認（有効時）
3. テナントID確認（組織ユーザー）
4. 権限レベル確認
```

### 4.3 面接システム

#### 4.3.1 面接フェーズ
```typescript
// 動作確認フェーズ
operation_check_phases = [
  { template: "checking_the_audio", text: "音声確認", type: "two_choices" },
  { template: "checking_voice_input", text: "音声入力確認", type: "free_response" },
  { template: "confirmation_complete", text: "確認完了", type: "one_choice" }
]

// 面接フェーズ
interview_phases = [
  { template: "interview_prompt", text: "利用状況把握", type: "free_response" },
  { template: "thank_you", text: "お礼", type: "interview_complete" }
]
```

#### 4.3.2 面接プロンプトテンプレート
商品開発専門家として、以下のアルゴリズムで質問:
1. ニーズの抽出
2. 競合の確認
3. 競合不在時の分析
4. ニーズの優先順位付け

### 4.4 3Dアバターシステム

#### 4.4.1 アバターコンポーネント
- **モデル**: Ready Player Me GLB形式
- **アニメーション**: FBXファイル
  - Standing Idle
  - Talking (複数バリエーション)
  - Thinking
  - 感情表現 (Angry, Laughing, Crying等)

#### 4.4.2 リップシンク
```javascript
// 日本語音素マッピング
const japanesePhonemeToViseme = {
  'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
  'カ': 'K', 'キ': 'KI', 'ク': 'KU', 'ケ': 'KE', 'コ': 'KO',
  // ... 完全なマッピングテーブル
}
```

#### 4.4.3 表情制御
```javascript
const facialExpressions = {
  default: {},
  smile: { /* モーフターゲット値 */ },
  sad: { /* モーフターゲット値 */ },
  surprised: { /* モーフターゲット値 */ },
  angry: { /* モーフターゲット値 */ }
}
```

## 5. API仕様

### 5.1 認証API (`/api/auth/`)

| エンドポイント | メソッド | 説明 | 認証要否 |
|--------------|---------|------|---------|
| `/client_login` | POST | 企業ユーザーログイン | No |
| `/client_register` | POST | 企業組織登録 | No |
| `/client_user_register` | POST | 組織メンバー追加 | Yes |
| `/enable-totp-mfa` | POST | MFA有効化 | Yes |
| `/user_delete` | POST | ユーザー削除 | Yes |
| `/user_register` | POST | 個人ユーザー登録 | No |

### 5.2 面接API

| エンドポイント | メソッド | 説明 | 認証要否 |
|--------------|---------|------|---------|
| `/interview_server` | POST | 面接対話処理 | Yes |
| `/transcribe` | POST | 音声文字起こし | Yes |
| `/operation_check` | POST | 動作確認処理 | Yes |
| `/create_interview` | POST | 面接作成 | Yes |
| `/create_theme` | POST | テーマ作成 | Yes |

### 5.3 分析・レポートAPI

| エンドポイント | メソッド | 説明 | 認証要否 |
|--------------|---------|------|---------|
| `/report/individualReport` | POST | 個別レポート生成 | Yes |
| `/report/summaryReport` | POST | 統計レポート生成 | Yes |
| `/cluster` | POST | クラスタリング分析 | Yes |

### 5.4 決済API

| エンドポイント | メソッド | 説明 | 認証要否 |
|--------------|---------|------|---------|
| `/subscription` | POST | サブスクリプション作成 | Yes |
| `/stripe_portal` | POST | Stripeポータルアクセス | Yes |
| `/stripe_hooks` | POST | Stripe Webhook | No |

## 6. データモデル

### 6.1 ユーザー (User)
```typescript
type User = {
  userId: string;
  email: string;
  userNickname: string;
  userName: string[];  // [姓, 名]
  createdAt: Timestamp;
  gender: string;
  userBirthday: Timestamp | null;
  interviewCount: number;
  organizationId: string;
  organizationPosition: string;
  userPhoneNumber: string | null;
  inOrganization: boolean;
  role: string;
  permissions: string[];
  lastLoginAt: Timestamp;
  status: string;
  twoFactorAuthEnabled: boolean;
  notificationPreferences: {
    email: boolean;
    inApp: boolean;
  };
  dataAccessLevel: string;
  featureAccess: string[];
}
```

### 6.2 組織 (Client)
```typescript
type Client = {
  organizationId: string;
  organizationType: string;
  organizationName: string;
  administratorId: string;
  employeeCount: number;
  childUserIds: string[];
  createdAt: Timestamp;
  themesCount: number;
  country: string;
  language: string;
  stripeCustomerId: string;
  subscriptionProductId: string | null;
  subscriptionStatus: string;
  subscriptionInterval: string | null;
  subscriptionRenewalDate: Timestamp;
  billingInfo: {
    companyName: string;
    email: string;
    address: string;
    paymentMethod: string;
  };
  usageQuota: {
    users: number;
    storage: number;
  };
  features: string[];
  apiKey: string;
  securitySettings: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
  };
  complianceStatus: {
    gdpr: boolean;
    hipaa: boolean;
    iso27001: boolean;
  };
  lastAuditDate: {
    organization: Timestamp;
    user: Timestamp;
    security: Timestamp;
  };
  securityScore: number;
}
```

### 6.3 テーマ (Theme)
```typescript
type Theme = {
  themeId: string;
  theme: string;
  createUserId: string;
  createdAt: Timestamp;
  deadline: Timestamp;
  clientId: string;
  interviewsRequestedCount: number;
  collectInterviewsCount: number;
  interviewDurationMin: number;
  isPublic: boolean;
  maximumNumberOfInterviews: number;
  interviewResponseURL: string | null;
  reportCreated: boolean;
}
```

### 6.4 面接 (Interviews)
```typescript
type Interviews = {
  interviewId: string;
  intervieweeId: string;
  answerInterviewId: string;
  createdAt: Timestamp;
  questionCount: number;
  reportCreated: boolean;
  interviewCollected: boolean;
  interviewDurationMin: number;
  themeId: string;
  temporaryId: string | null;
  confirmedUserId: string | null;
}
```

### 6.5 メッセージ (Message)
```typescript
type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Timestamp;
  audio?: string;  // Base64エンコード音声
  lipsync?: LipSync;
  facialExpression?: string;
  animation?: string;
}
```

## 7. 外部サービス統合

### 7.1 OpenAI Integration
```typescript
// 使用エンドポイント
- GPT-4: 対話生成
- Whisper: 音声認識（バックアップ）
- TTS: 音声合成

// 設定
NEXT_PUBLIC_OPENAI_KEY: APIキー
```

### 7.2 Google Cloud Speech API
```typescript
// 設定
GCP_PROJECT_ID: プロジェクトID
GCP_PRIVATE_KEY: 秘密鍵
GCP_CLIENT_EMAIL: サービスアカウントメール

// 音声認識設定
config: {
  encoding: 'WEBM_OPUS',
  sampleRateHertz: 48000,
  languageCode: 'ja-JP',
  model: 'latest_long',
  useEnhanced: true
}
```

### 7.3 Stripe Integration
```typescript
// 設定
STRIPE_SECRET_KEY: 秘密鍵
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 公開鍵
STRIPE_WEBHOOK_SECRET: Webhook秘密鍵

// サブスクリプションプラン
- Basic: 基本機能
- Professional: 高度な分析機能
- Enterprise: カスタマイズ・API
```

### 7.4 Firebase Services
```typescript
// Authentication
- メール/パスワード認証
- TOTP MFA
- マルチテナント対応

// Firestore Collections
- users/
- clients/
- themes/
- interviews/
- messages/
- individualReports/
- clusteringData/

// Cloud Functions
- updateCollectInterviewsCount
```

## 8. セキュリティ仕様

### 8.1 認証・認可
- JWT トークンベース認証
- Role-Based Access Control (RBAC)
- テナント分離によるデータアイソレーション
- セッションタイムアウト管理

### 8.2 データ保護
- HTTPS通信の強制
- Firestore セキュリティルール
- 個人情報の暗号化
- GDPR/HIPAA準拠オプション

### 8.3 監査とコンプライアンス
- アクセスログ記録
- セキュリティスコア算出
- 定期的な監査レポート
- ISO 27001準拠対応

## 9. パフォーマンス最適化

### 9.1 キャッシング戦略
```typescript
// メモリキャッシュ
const memoryCache = {
  audioFiles: Map<string, Buffer>,
  lipSyncData: Map<string, LipSync>
}

// Vercel KV キャッシュ
- 音素解析結果
- 頻繁にアクセスされるデータ
```

### 9.2 最適化技術
- Next.js 自動コード分割
- 画像最適化 (Cloudinary)
- Three.js モジュールのトランスパイル
- WebAudio API の遅延初期化

## 10. 開発・運用

### 10.1 開発環境
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プロダクション起動
npm start

# コード品質チェック
npm run lint
```

### 10.2 環境変数
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PROJECT_ID=

# Google Cloud
GCP_PROJECT_ID=
GCP_PRIVATE_KEY=
GCP_CLIENT_EMAIL=

# OpenAI
NEXT_PUBLIC_OPENAI_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# その他
GOO_LAB_APP_ID=
```

### 10.3 デプロイメント
- **Vercel**: メインアプリケーション
- **Firebase Functions**: バックグラウンド処理
- **Docker**: FFmpeg API (Go)

## 11. 今後の拡張計画

### 11.1 機能拡張
- 多言語対応（英語、中国語）
- AIによる感情分析の高度化
- リアルタイムコラボレーション機能
- モバイルアプリ開発

### 11.2 技術的改善
- WebRTC による低遅延通信
- エッジコンピューティング対応
- 機械学習モデルの自社開発
- マイクロサービス化

## 12. ライセンス・法的事項

### 12.1 利用規約
- `/terms/TermsOfService` に記載

### 12.2 プライバシーポリシー
- `/terms/PrivacyPolicy` に記載

### 12.3 サードパーティライセンス
- MIT License (主要ライブラリ)
- Apache License 2.0 (一部ライブラリ)
- 商用ライセンス (Highcharts)

---

最終更新日: 2024年
バージョン: 1.0.0
作成者: 株式会社 感性分析