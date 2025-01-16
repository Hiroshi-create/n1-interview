"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../../../../firebase";
import { Theme } from "@/stores/Theme";
import { IndividualReport } from "@/stores/IndividualReport";
import LoadingIcons from "react-loading-icons";
import { useAppsContext } from "@/context/AppContext";

const IndividualReportDetailPage = () => {
    const { selectedInterviewId } = useAppsContext();
    const params = useParams();
    const router = useRouter();

    const [theme, setTheme] = useState<Theme | null>(null);
    const [individualReport, setIndividualReport] = useState<IndividualReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const tab = params.tab as string;
    const themeId = params.themeId as string;
    const individualReportId = params.individualReportId as string;

    useEffect(() => {
        const fetchData = async () => {
            if (themeId && selectedInterviewId) {
                const themeRef = doc(db, "themes", themeId);
                const themeSnap = await getDoc(themeRef);
                if (themeSnap.exists()) {
                    setTheme(themeSnap.data() as Theme);
                }

                const interviewRef = doc(db, "themes", themeId, "interviews", selectedInterviewId);
                const individualReportRef = doc(interviewRef, "individualReport", individualReportId);
                const individualReportSnap = await getDoc(individualReportRef);
                if (individualReportSnap.exists()) {
                    setIndividualReport(individualReportSnap.data() as IndividualReport);
                }
                console.log("report : " + individualReport?.report)

                setIsLoading(false);
            }
        };
        fetchData();
    }, [themeId, selectedInterviewId, individualReportId]);

    if (isLoading) {
        return (
            <div>
                <LoadingIcons.SpinningCircles />
                データを読み込んでいます...
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-2 border-b border-neutral-700 px-4 py-3">
                <h1 className="text-xl font-semibold">
                    <span
                        className="cursor-pointer hover:underline"
                        onClick={() => router.push(`/client-view/${params.userId}/${tab}`)}
                    >
                        {tab}
                    </span>
                    &nbsp; ＞ &nbsp;
                    <span
                        className="cursor-pointer hover:underline"
                        onClick={() => router.push(`/client-view/${params.userId}/${tab}/${themeId}`)}
                    >
                        {theme?.theme || "テーマ名"}
                    </span>
                    &nbsp; ＞ &nbsp;{individualReportId}
                </h1>
            </div>
            <div className="p-4">
                {individualReport ? individualReport.report : "レポートが見つかりません"}
            </div>
        </div>
    );
}

export default IndividualReportDetailPage;