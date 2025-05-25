import { FieldValue, Timestamp } from "firebase/firestore";

export type User = {
    email: string;                  // ユーザーのメールアドレス
    userNickname: string;           // ユーザーのニックネーム
    userName: string[];             // ユーザーの氏名（[姓, 名]の形式）
    createdAt: Timestamp | FieldValue; // ユーザーアカウント作成日時
    userId: string;                 // ユーザーの一意識別子
    gender: string;                 // ユーザーの性別
    userBirthday: Timestamp | FieldValue; // ユーザーの生年月日
    interviewCount: number;         // ユーザーが実施したインタビュー数
    organizationId: string;         // ユーザーが所属する組織のID（未所属の場合はnullまたは空文字列）
    organizationPosition: string;   // 組織内での役職（未所属の場合はnullまたは空文字列）
    userPhoneNumber: string | null; // ユーザーの電話番号
    inOrganization: boolean;        // 組織に所属しているかどうか
    role: string;                   // ユーザーの役割（管理者、編集者、閲覧者など）
    permissions: string[];          // ユーザーの権限リスト
    lastLoginAt: Timestamp | FieldValue; // 最終ログイン日時
    status: string;                 // アカウントのステータス（アクティブ、停止中など）
    twoFactorAuthEnabled: boolean;  // 二段階認証の有効/無効
    notificationPreferences: {
        email: boolean;             // メール通知の有効/無効
        inApp: boolean;             // アプリ内通知の有効/無効
    };
    dataAccessLevel: string;        // データアクセスレベル（フル、制限付き、閲覧のみなど）
    featureAccess: string[];        // アクセス可能な機能のリスト
}