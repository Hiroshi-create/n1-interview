import { FieldValue, Timestamp } from "firebase/firestore";

export type SearchThemes = {
    createdAt: Timestamp | FieldValue;
    themeId: string;
}