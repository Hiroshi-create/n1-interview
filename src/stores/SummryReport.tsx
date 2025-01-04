import { FieldValue, Timestamp } from "firebase/firestore";

export type SummryReport = {
    email: string;
    name: string;
    createdAt: Timestamp | FieldValue;
}