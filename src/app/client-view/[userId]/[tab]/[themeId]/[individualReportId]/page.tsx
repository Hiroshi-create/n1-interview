"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../../../../firebase";
import { Theme } from "@/stores/Theme";
import { IndividualReport } from "@/stores/IndividualReport";
import LoadingIcons from "react-loading-icons";
import { useAppsContext } from "@/context/AppContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
            <div className="flex flex-col items-center justify-center h-64">
                <LoadingIcons.SpinningCircles className="w-12 h-12 text-primary" />
                <p className="mt-4 text-lg">データを読み込んでいます...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background text-text">
            <div className="flex items-center gap-2 border-b border-secondary px-4 py-3">
                <h1 className="text-xl font-semibold">
                    <span
                        className="cursor-pointer hover:text-primary transition-colors duration-300"
                        onClick={() => router.push(`/client-view/${params.userId}/${tab}`)}
                    >
                        {tab}
                    </span>
                    &nbsp;＞&nbsp;
                    <span
                        className="cursor-pointer hover:text-primary transition-colors duration-300"
                        onClick={() => router.push(`/client-view/${params.userId}/${tab}/${themeId}`)}
                    >
                        {theme?.theme || "テーマ名"}
                    </span>
                    &nbsp;＞&nbsp;{individualReportId}
                </h1>
            </div>
            <main className="container mx-auto px-4 py-6 pt-8 flex-grow">
                <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 my-12">
                    {individualReport ? (
                        <div className="prose max-w-none">
                            <h2 className="text-2xl font-bold mb-6 text-secondary">レポート内容</h2>
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
                                    h4: ({node, ...props}) => <h4 className="text-base font-medium mt-3 mb-1" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-4" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4" {...props} />,
                                    li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4" {...props} />,
                                    a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                                }}
                            >
                                {individualReport.report}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-text text-center text-lg font-semibold">レポートが見つかりません</p>
                    )}
                </div>
            </main>
        </div>
    );
}

export default IndividualReportDetailPage;