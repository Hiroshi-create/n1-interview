import { FieldValue, Timestamp } from "firebase/firestore";

export type Message = {
    messageId: string;
    text: string;
    sender: string;
    createdAt: Timestamp | FieldValue;
    type: string;
}