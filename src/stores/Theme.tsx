import { Timestamp } from "firebase/firestore";

export type Theme = {
    id: string;
    name: string;
    createdAt: Timestamp;

    // themeId: string;
    // theme: string;
    // createdAt: Timestamp;
    // participatingClientIds: [];
    // interviewCount: number;
}