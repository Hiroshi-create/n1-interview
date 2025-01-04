import { FieldValue, Timestamp } from "firebase/firestore";

export type Interview = {
    interviewId: string;
    intervieweeId: string;
    createdAt: Timestamp | FieldValue;
    clientId: string;
    questionCount: number;
}