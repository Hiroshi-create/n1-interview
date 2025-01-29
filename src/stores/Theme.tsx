import { Timestamp } from "firebase/firestore";

export type Theme = {
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
}