import { FieldValue } from "firebase/firestore";

export type SelectedSubscription = {
    subscriptionId: string;         // サブスクリプションの一意識別子
    userId: string;                 // サブスクリプションを所有するユーザーのID
    planId: string;                 // サブスクリプションのプランID
    status: string;                 // サブスクリプションの状態 ('active' | 'canceled' | 'past_due' | 'trialing')
    startDate: FieldValue;          // サブスクリプションの開始日
    endDate: FieldValue;            // サブスクリプションの終了日
    cancelAtPeriodEnd: boolean;     // 現在の期間終了時にキャンセルするかどうか
    currentPeriodStart: FieldValue; // 現在の請求期間の開始日
    currentPeriodEnd: FieldValue;   // 現在の請求期間の終了日
    createdAt: FieldValue;          // サブスクリプションの作成日時
    updatedAt: FieldValue;          // サブスクリプションの最終更新日時
    stripeSubscriptionId: string;   // StripeのサブスクリプションID
    stripeCustomerId: string;       // StripeのカスタマーID
    quantity: number;               // サブスクリプションの数量
}