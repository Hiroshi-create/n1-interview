"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, doc, FieldValue, getDoc, getDocs, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '../../../../../../firebase';
import { Theme } from '@/stores/Theme';
import LoadingIcons from 'react-loading-icons';
import { IndividualReport } from '@/stores/IndividualReport';
import BreadcrumbComponent from './contents/breadcrumb';
import IndividualReportList from './contents/individualReportList';
import ClientsideThemeCard from '@/context/components/ui/clientsideThemeCard';
import InterviewResults from './contents/interviewResults';
import SummaryContent from './contents/summaryContent';
import DetailsContent from './contents/detailsContent';
import FeedbackContent from './contents/feedbackContent';
import KanseiAiMarketer from './contents/kanseiAiMarketer';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import DashboardContent from './contents/dashboardContent';

const ThemeDetailPage = () => {
    const params = useParams();

    const [theme, setTheme] = useState<Theme | null>(null);
    const [individualReports, setIndividualReports] = useState<IndividualReport[]>([]);
    const [interviewIds, setInterviewIds] = useState<string[]>([]);
    const [temporaryIds, setTemporaryIds] = useState<(string | null)[]>([]);
    const [confirmedUserIds, setConfirmedUserIds] = useState<string[]>([]);

    const [isReportListOpen, setIsReportListOpen] = useState(true);

    const toggleReportList = () => {
        setIsReportListOpen(!isReportListOpen);
    };

    const tab = params.tab as string;

    useEffect(() => {
        const fetchTheme = async () => {
            if (params.themeId) {
                const themeRef = doc(db, "themes", params.themeId as string);
                const themeSnap = await getDoc(themeRef);
                if (themeSnap.exists()) {
                    setTheme(themeSnap.data() as Theme);
        
                    const interviewsCollectionRef = collection(themeRef, "interviews");
                    const q = query(interviewsCollectionRef);
        
                    const unsubscribe = onSnapshot(q, async (snapshot) => {
                        const individualReportPromises = snapshot.docs.map(async (interviewDoc) => {
                            const temporaryId = interviewDoc.data().temporaryId as string | null;
                            const confirmedUserId = interviewDoc.data().confirmedUserId as string | null;

                            const individualReportCollectionRef = collection(interviewDoc.ref, "individualReport");
                            const individualReportSnapshot = await getDocs(individualReportCollectionRef);
                            
                            if (!individualReportSnapshot.empty) {
                                const data = individualReportSnapshot.docs[0].data();
                                if (isValidIndividualReportData(data)) {
                                    return {
                                        individualReport: {
                                            individualReportId: data.individualReportId,
                                            createdAt: data.createdAt,
                                            report: data.report,
                                        } as IndividualReport,
                                        interviewId: interviewDoc.id,
                                        temporaryId: temporaryId,
                                        confirmedUserId: confirmedUserId,
                                    };
                                }
                            }
                            return null;
                        });
                        const individualReportResults = await Promise.all(individualReportPromises);
                        const validResults = individualReportResults.filter((result): result is NonNullable<typeof result> => result !== null);
                        
                        setIndividualReports(validResults.map(result => result.individualReport));
                        setInterviewIds(validResults.map(result => result.interviewId));
                        setTemporaryIds(validResults.map(result => result.temporaryId));
                        setConfirmedUserIds(validResults.map(result => result.confirmedUserId || ''));
                    });
                    return () => unsubscribe();
                }
            }
        };
        fetchTheme();
    }, [params.themeId]);

    if (!theme) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <LoadingIcons.SpinningCircles className="w-12 h-12 text-primary" />
                <p className="mt-4 text-lg">テーマを読み込んでいます...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full">
            <BreadcrumbComponent
                tab={tab}
                theme={theme}
                userId={params.userId}
            />
            <ClientsideThemeCard
                themeNav={theme}
            />

            <div className='flex flex-row space-x-4 mb-16'>
                <div className={`${isReportListOpen ? 'w-3/4' : 'w-full'} border bg-white bg-gray-100 shadow-md rounded-lg p-6 my-4 transition-all duration-300`}>
                    <InterviewResults
                        theme={theme}
                        showKanseiAiMarketer={true}
                        tabsConfig={[
                            {
                                value: "summary",
                                label: "Summary",
                                content: <SummaryContent theme={theme}/>
                            },
                            {
                                value: "details",
                                label: "Details",
                                content: <DetailsContent theme={theme}/>
                            },
                            {
                                value: "feedback",
                                label: "Feedback",
                                content: <FeedbackContent theme={theme}/>
                            },
                            {
                                value: "dashboard",
                                label: "Dashboard",
                                content: <DashboardContent
                                    theme={theme}
                                    isReportListOpen={isReportListOpen}
                                />
                            },
                            {
                                value: "kanseiAiMarketer",
                                label: "感性 AI Copilot",
                                content: <KanseiAiMarketer 
                                    theme={theme} 
                                    height="520px"
                                />
                            }
                        ]}
                        className="custom-class"
                    />
                </div>

                <div className={`${isReportListOpen ? 'w-1/4' : 'w-16'} border bg-white shadow-md rounded-lg my-4 transition-all duration-300 flex flex-col`}>
                    <div className={`flex flex-col ${isReportListOpen ? 'w-full' : 'w-16'} overflow-hidden`}>
                        <div className='flex flex-row items-start p-4'>
                            <button
                                onClick={toggleReportList}
                                className="mr-2 mt-1 bg-white hover:bg-gray-50 rounded-full p-1 transition-all duration-300 hover:scale-110 border border-gray-200"
                                aria-label={isReportListOpen ? "レポートリストを閉じる" : "レポートリストを開く"}
                                role="switch"
                                aria-checked={isReportListOpen}
                            >
                                {isReportListOpen ? (
                                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                                ) : (
                                    <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
                                )}
                            </button>
                            {isReportListOpen && (
                                <h4 className="px-2 font-semibold whitespace-nowrap">個別レポート</h4>
                            )}
                        </div>
                        {!isReportListOpen && (
                            <div className="writing-mode-vertical-rl text-lg font-semibold text-gray-500 mt-2 mx-auto mb-8">
                                個別レポートを表示
                            </div>
                        )}
                        {isReportListOpen && (
                            <IndividualReportList
                                individualReports={individualReports}
                                interviewIds={interviewIds}
                                theme={theme}
                                temporaryIds={temporaryIds}
                                confirmedUserIds={confirmedUserIds}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function isValidIndividualReportData(data: unknown): data is IndividualReport {
    return (
        typeof data === 'object' &&
        data !== null &&
        'createdAt' in data &&
        'report' in data &&
        'individualReportId' in data &&
        ((data as any).createdAt instanceof Timestamp || (data as any).createdAt instanceof FieldValue) &&
        typeof (data as any).report === 'string' &&
        typeof (data as any).individualReportId === 'string'
    );
}

export default ThemeDetailPage;
