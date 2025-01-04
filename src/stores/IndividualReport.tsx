import { FieldValue, Timestamp } from "firebase/firestore";

export type IndividualReport = {
    email: string;
    name: string;
    createdAt: Timestamp | FieldValue;
}