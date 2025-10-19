"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, doc, FieldValue, getDoc, getDocs, limit, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../../../../../lib/firebase';
import { Theme } from '@/stores/Theme';
import LoadingIcons from 'react-loading-icons';
import { IndividualReport } from '@/stores/IndividualReport';
import BreadcrumbComponent from './contents/breadcrumb';
import IndividualReportList from './contents/individualReportList';
import ClientsideThemeCard from '@/context/components/ui/clientsideThemeCard';
import InterviewResults from './contents/interviewResults';
import SummaryContent from './contents/tabs/summaryContent';
import DetailsContent from './contents/tabs/detailsContent';
import FeedbackContent from './contents/tabs/feedbackContent';
import KanseiAiMarketer from './contents/tabs/kanseiAiMarketer';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import DashboardContent from './contents/tabs/dashboardContent';
import { v4 as uuidv4 } from 'uuid';
import ClusteringContent from './contents/tabs/clusteringContent';
import { ClusterResult } from '@/context/interface/ClusterResult';


// デモ用

const mockIndividualReports: IndividualReport[] = Array.from({ length: 30 }, (_, i) => ({
    individualReportId: uuidv4(),
    createdAt: Timestamp.fromDate(new Date(2025, 1, 17, 5, 59)),
    report: `インタビュー結果の詳細 ${i + 1}`
}));
const mockInterviewIds: string[] = Array.from({ length: 30 }, (_, i) => `INT${String(i + 1).padStart(3, '0')}`);
const mockTemporaryIds: (string | null)[] = Array.from({ length: 30 }, () => null);
const mockConfirmedUserIds: string[] = Array.from({ length: 30 }, (_, i) => `USR${String(i + 1).padStart(3, '0')}`);







const ThemeDetailPage = () => {
    const params = useParams();

    const [theme, setTheme] = useState<Theme | null>(null);
    const [individualReports, setIndividualReports] = useState<IndividualReport[]>([]);
    const [interviewIds, setInterviewIds] = useState<string[]>([]);
    const [temporaryIds, setTemporaryIds] = useState<(string | null)[]>([]);
    const [confirmedUserIds, setConfirmedUserIds] = useState<string[]>([]);
    const [interviewData, setInterviewData] = useState<any[]>([]);

    const [isReportListOpen, setIsReportListOpen] = useState(true);

    const [clusteringData, setClusteringData] = useState<ClusterResult | null>(null);  // クラスタリングデータ

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
                        const allInterviewData: any[] = [];
                        const individualReportPromises = snapshot.docs.map(async (interviewDoc) => {
                            const interviewInfo = interviewDoc.data();
                            const temporaryId = interviewInfo.temporaryId as string | null;
                            const confirmedUserId = interviewInfo.confirmedUserId as string | null;
                            
                            // インタビューデータを保存
                            allInterviewData.push({
                                ...interviewInfo,
                                id: interviewDoc.id
                            });

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
                                        interviewData: interviewInfo,
                                    };
                                }
                            }
                            // レポートがない場合でもインタビューデータは返す
                            return {
                                individualReport: null,
                                interviewId: interviewDoc.id,
                                temporaryId: temporaryId,
                                confirmedUserId: confirmedUserId,
                                interviewData: interviewInfo,
                            };
                        });
                        const individualReportResults = await Promise.all(individualReportPromises);
                        
                        // すべてのインタビューを含む（レポートがなくても）
                        setIndividualReports(individualReportResults.map(result => result?.individualReport).filter((r): r is IndividualReport => r !== null));
                        setInterviewIds(individualReportResults.map(result => result.interviewId));
                        setTemporaryIds(individualReportResults.map(result => result.temporaryId));
                        setConfirmedUserIds(individualReportResults.map(result => result.confirmedUserId || ''));
                        setInterviewData(individualReportResults.map(result => result.interviewData));
                    });
                    return () => unsubscribe();
                }
            }
        };
        fetchTheme();
    }, [params.themeId]);

    // クラスタリングデータ
    useEffect(() => {
        const checkClusteringData = async () => {
          if (theme && params.themeId) {
            const themeRef = doc(db, "themes", params.themeId as string);
            const clusteringDataRef = collection(themeRef, "clusteringData");
            
            try {
              const clusteringDataSnapshot = await getDocs(query(clusteringDataRef, orderBy("createdAt", "desc"), limit(1)));
              
              if (!clusteringDataSnapshot.empty) {
                // 最新のclusteringDataを取得
                const clusteringDoc = clusteringDataSnapshot.docs[0];
                const docData = clusteringDoc.data();
                
                // clusterResultフィールドからClusterResult型のデータを取得
                if (docData && docData.clusterResult) {
                  const clusterData = docData.clusterResult as ClusterResult;
                  
                  if (clusterData.results) {
                    setClusteringData(clusterData);
                    console.log("最新のクラスタリングデータが見つかりました:", clusterData);
                  } else {
                    console.log("クラスタリングデータの形式が不正です");
                    setClusteringData(null);
                  }
                } else {
                  console.log("clusterResultフィールドが見つかりません");
                  setClusteringData(null);
                }
              } else {
                // clusteringDataが存在しない場合の処理
                setClusteringData(null);
                console.log("クラスタリングデータが見つかりません");
              }
            } catch (error) {
              console.error("クラスタリングデータの取得中にエラーが発生しました:", error);
              setClusteringData(null);
            }
          }
        };
        checkClusteringData();
    }, [theme]);

    if (!theme) {
        return (
            <div className="flex flex-col items-center bg-blue-100/30 justify-center h-64">
                <LoadingIcons.SpinningCircles className="w-12 h-12 text-primary" />
                <p className="mt-4 text-lg">テーマを読み込んでいます...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-h-screen bg-blue-100/30">
            <BreadcrumbComponent
                tab={tab}
                theme={theme}
                userId={params.userId}
            />
            <ClientsideThemeCard
                themeNav={theme}
            />

            <div className='flex flex-row space-x-4 pb-16 h-full'>
                <div className={`${isReportListOpen ? 'w-3/4' : 'w-full'} border bg-white bg-gray-100 shadow-md rounded-lg p-6 my-4 transition-all duration-300`}>
                    <InterviewResults
                        theme={theme}
                        showKanseiAiMarketer={true}
                        tabsConfig={[
                            {
                                value: "details",
                                label: "Details",
                                content: <DetailsContent theme={theme}/>
                            },
                            {
                                value: "summary",
                                label: "Summary",
                                content: <SummaryContent theme={theme}/>
                            },
                            {
                                value: "dashboard",
                                label: "Dashboard",
                                content: <DashboardContent
                                    theme={theme}
                                    isReportListOpen={isReportListOpen}
                                />
                            },
                            // {
                            //     value: "feedback",
                            //     label: "Feedback",
                            //     content: <FeedbackContent theme={theme}/>
                            // },
                            {
                                value: "clustering",
                                label: "Clustering",
                                content: <ClusteringContent
                                    theme={theme}
                                    clusteringData={clusteringData}
                                />
                            },
                            {
                                value: "kanseiAiMarketer",
                                label: "感性 AI Marketer",
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
                            interviewIds.length > 0 ? (
                                <IndividualReportList
                                    individualReports={individualReports}
                                    interviewIds={interviewIds}
                                    theme={theme}
                                    temporaryIds={temporaryIds}
                                    confirmedUserIds={confirmedUserIds}
                                    interviewData={interviewData}
                                />
                            ) : (
                                <div className="p-4 text-center">
                                    <p className="text-gray-600">インタビューを受けてもらいましょう</p>
                                    <p className="text-sm text-gray-400 mt-2">個別レポートはまだありません</p>
                                </div>
                            )
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
