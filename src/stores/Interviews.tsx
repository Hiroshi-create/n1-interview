import { FieldValue, Timestamp } from "firebase/firestore";

export type Interviews = {
    interviewId: string;
    intervieweeId: string;
    answerInterviewId: string;
    manageThemeId: string;
    createdAt: Timestamp | FieldValue;
    questionCount: number;
    reportCreated: boolean;
    interviewDurationMin: number;
    themeId: string;
}