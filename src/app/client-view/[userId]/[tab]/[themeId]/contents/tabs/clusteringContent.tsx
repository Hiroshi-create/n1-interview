"use client"

import type { Theme } from "@/stores/Theme"
import ClusterForm from "../components/clustering/clusterForm";
import { ClusterResult } from "@/context/interface/ClusterResult";

interface ComponentProps {
  theme: Theme;
  clusteringData: ClusterResult | null;
}

const ClusteringContent = ({
    theme,
    clusteringData,
}: ComponentProps): JSX.Element => {
    return (
        <div className="mt-4">
            <h2 className="text-2xl font-bold mb-4">クラスタリング</h2>
            <ClusterForm clusteringData={clusteringData} />
        </div>
    )
}

export default ClusteringContent;