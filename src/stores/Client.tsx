import { FieldValue, Timestamp } from "firebase/firestore";

export type Client = {
    organizationId: string;         // 組織の一意識別子
    organizationType: string;       // 組織の種類（例：企業、学校、NPOなど）
    organizationName: string;       // 組織の名称
    administratorId: string;        // 組織の管理者ユーザーID
    employeeCount: number;          // 組織の従業員数
    childUserIds: string[];         // 組織に属するユーザーIDのリスト
    createdAt: Timestamp | FieldValue; // 組織アカウント作成日時
    themesCount: number;            // 組織が作成したテーマ数
    country: string;                // 組織の国/地域
    language: string;               // 組織の言語
    stripeCustomerId: string;       // Stripeの顧客ID
    subscriptionProductId: string | null; // 契約中の商品ID
    subscriptionStatus: string;     // サブスクリプションの状態（active, inactive, suspended, canceled, expired）
    subscriptionInterval: string | null; // サブスクリプションの更新期間（year, month）
    subscriptionRenewalDate: Timestamp | FieldValue; // サブスクリプション更新日
    billingInfo: {
        companyName: string;        // 請求先会社名
        email: string;              // 請求先メールアドレス
        address: string;            // 請求先住所
        paymentMethod: string;      // 支払い方法
    };
    usageQuota: {
        users: number;              // 利用可能なユーザー数の上限
        storage: number;            // 利用可能なストレージ容量（GB）
    };
    features: string[];             // 利用可能な機能のリスト
    apiKey: string;                 // API利用のための認証キー
    securitySettings: {
        twoFactorAuth: boolean;     // 二段階認証の強制有効化
        sessionTimeout: number;     // セッションタイムアウト時間（秒）
    };
    complianceStatus: {
        gdpr: boolean;              // GDPR準拠状態
        hipaa: boolean;             // HIPAA準拠状態
        iso27001: boolean;          // ISO 27001準拠状態
    };
    lastAuditDate: {
        organization: Timestamp | FieldValue; // 最終 組織監査日
        user: Timestamp | FieldValue; // 最終 ユーザー監査日
        security: Timestamp | FieldValue; // 最終 セキュリティ監査日
    };
    securityScore: number;          // セキュリティスコア（0-100）
}