import { FieldValue, Timestamp } from "firebase/firestore";

export type SummryReport = {
    createdAt: Timestamp | FieldValue;
    report: string;
    summryReportId: string;
}