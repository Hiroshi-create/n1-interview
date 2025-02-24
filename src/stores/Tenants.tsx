import { FieldValue, Timestamp } from "firebase/firestore";

export type Tenants = {
    createdAt: Timestamp | FieldValue;
    tenantId: string,
    domain: string | null,
}