import { ClusterResult } from "@/context/interface/ClusterResult";
import { FieldValue, Timestamp } from "firebase/firestore";

export type ClusteringData = {
    createdAt: Timestamp | FieldValue;
    createUserId: string;
    clusterResult: ClusterResult;
    nodes: string[];
    preference: number;
}
