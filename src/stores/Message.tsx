import { FieldValue, Timestamp } from "firebase/firestore";

export type Message = {
    text: string;
    sender: string;
    createdAt: Timestamp | FieldValue;
    type: string;
    lipsync?: LipSync;
    facialExpression?: string;
    animation?: string;
    opacity?: number;
}