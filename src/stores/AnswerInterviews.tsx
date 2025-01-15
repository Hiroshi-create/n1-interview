import { DocumentReference, FieldValue, Timestamp } from "firebase/firestore";

export type AnswerInterviews = {
    createdAt: Timestamp | FieldValue;
    interviewReference: DocumentReference;
}