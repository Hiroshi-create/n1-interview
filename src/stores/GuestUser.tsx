import { DocumentReference, FieldValue, Timestamp } from "firebase/firestore";

export type GuestUser = {
    createdAt: Timestamp | FieldValue;
    guestUserId: string;
    interviewReference: DocumentReference;
}