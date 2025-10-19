import { FieldValue, Timestamp } from "firebase/firestore";

export type IndividualReport = {
    createdAt: Timestamp | FieldValue;
    report: string;
    individualReportId: string;
}