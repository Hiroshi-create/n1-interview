import { DocumentReference, FieldValue, Timestamp } from "firebase/firestore";

export type ManageThemes = {
    createdAt: Timestamp | FieldValue;
    themeReference: DocumentReference;
}