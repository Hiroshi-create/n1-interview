import { FieldValue, Timestamp } from "firebase/firestore";

export type Theme = {
    themeId: string;
    theme: string;
    createUserId: string;
    createdAt: Timestamp | FieldValue;
    deadline: Timestamp | FieldValue;
    clientId: string;
    interviewsRequestedCount: number;
    collectInterviewsCount: number;
    interviewDurationMin: number;
    isPublic: boolean;
}