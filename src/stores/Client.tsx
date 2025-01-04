import { FieldValue, Timestamp } from "firebase/firestore";

export type Client = {
    organizationId: string;
    organizationType: string;
    organizationName: string;
    administratorId: string;
    childUsersCount: number;
    childUserIds: string[];
    createdAt: Timestamp | FieldValue;
}