import { FieldValue, Timestamp } from "firebase/firestore";

export type User = {
    email: string;
    userNickname: string;
    userName: string[];
    createdAt: Timestamp | FieldValue;
    userId: string;
    gender: string;
    userBirthday: Timestamp | FieldValue;
    interviewCount: number;
    organizationId: string;
    organizationPosition: string;
    userPhoneNumber: number | null;
    inOrganization: boolean;
}