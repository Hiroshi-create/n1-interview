import { FieldValue } from "firebase/firestore";

export type SubscriptionPlans = {
    subscriptionPlansId: string;        // プランの一意識別子
    planName: string;                   // プラン名
    planType: string;                   // プランタイプ（'basic' | 'pro' | 'enterprise'）
    description: string;                // プランの説明
    price: number;                      // プランの価格（円）
    billingCycle: string;               // 請求サイクル（'monthly' | 'yearly'）
    features: string[];                 // プランの機能リスト
    subscriptionProductId: string;      // Stripe上の商品ID
    isActive: boolean;                  // プランが有効かどうか
    createdAt: FieldValue;              // プランの作成日時
    updatedAt: FieldValue;              // プランの最終更新日時
    trialPeriodDays: number;            // トライアル期間（日数）
    usageQuota: {
        userNum: number | null;         // 利用可能なユーザー数の上限
        storage: number;                // 利用可能なストレージ容量（GB）
    };
}