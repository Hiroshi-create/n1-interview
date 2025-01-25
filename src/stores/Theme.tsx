import { Timestamp } from "firebase/firestore";

export type Theme = {
    themeId: string;
    theme: string;
    createUserId: string;
    createdAt: Timestamp;
    searchClientId: string;
    interviewsRequestedCount: number;
    collectInterviewsCount: number;
    interviewDurationMin: number;
}