"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, doc, FieldValue, getDoc, getDocs, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from '../../../../../../firebase';
import { Theme } from '@/stores/Theme';
import LoadingIcons from 'react-loading-icons';
import { IndividualReport } from '@/stores/IndividualReport';
import { useAppsContext } from '@/context/AppContext';

const ThemeDetailPage = () => {
    const { userId, setSelectedInterviewId } = useAppsContext();
    const params = useParams();
    const router = useRouter();

    const [theme, setTheme] = useState<Theme | null>(null);
    const [individualReports, setIndividualReports] = useState<IndividualReport[]>([]);
    const [interviewIds, setInterviewIds] = useState<string[]>([]);
    const [temporaryIds, setTemporaryIds] = useState<(string | null)[]>([]);
    const [confirmedUserIds, setConfirmedUserIds] = useState<string[]>([]);

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

    const selectIndividualReport = (individualReportId: string, themeId: string, index: number) => {
        setSelectedInterviewId(interviewIds[index]);
        router.push(`/client-view/${userId}/Report/${themeId}/${individualReportId}`);
    }

    if (!theme) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <LoadingIcons.SpinningCircles className="w-12 h-12 text-primary" />
                <p className="mt-4 text-lg">テーマを読み込んでいます...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 border-b border-gray-300 px-4 py-3 mb-4">
                <h1 className="text-xl font-semibold">
                    <span
                        className="cursor-pointer hover:text-primary transition-colors duration-300"
                        onClick={() => router.push(`/client-view/${params.userId}/${tab}`)}
                    >
                        {tab}
                    </span>
                    &nbsp;＞&nbsp;
                    <span className="text-text">{theme.theme}</span>
                </h1>
            </div>

            <main className="container mx-auto py-8 px-4 flex-grow">
                <div className='flex-grow'>
                    <ul className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-300 mt-8 mb-4">
                        {individualReports.map((individualReport, index) => (
                            <li 
                                key={individualReport.individualReportId}
                                className='cursor-pointer border-b border-gray-300 p-4 hover:bg-gray-100 transition-colors duration-300'
                                onClick={() => selectIndividualReport(
                                    individualReport.individualReportId,
                                    theme.themeId,
                                    index
                                )}
                            >
                                <span className="text-gray-800">{individualReport.individualReportId}</span>
                                <div className="text-gray-800">
                                    {temporaryIds[index] 
                                        ? `ワンタイムコード：${temporaryIds[index]}`
                                        : confirmedUserIds[index]
                                        ? "確認済み ✔️"
                                        : "未確認"}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
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
