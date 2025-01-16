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
                                        interviewId: interviewDoc.id
                                    };
                                }
                            }
                            return null;
                        });
                        const individualReportResults = await Promise.all(individualReportPromises);
                        const validResults = individualReportResults.filter((result): result is NonNullable<typeof result> => result !== null);
                        
                        setIndividualReports(validResults.map(result => result.individualReport));
                        setInterviewIds(validResults.map(result => result.interviewId));
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
            <div>
                <LoadingIcons.SpinningCircles />
                テーマを読み込んでいます...
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
                    &nbsp; ＞ &nbsp;{theme.theme}
                </h1>
            </div>
            <div className="flex-1 overflow-auto p-4">
                <ul>
                    {individualReports.map((individualReport, index) => (
                        <li 
                            key={individualReport.individualReportId}
                            className='cursor-pointer border-b p-4 text-slate-100 hover:bg-slate-700 duration-150'
                            onClick={() => selectIndividualReport(
                                individualReport.individualReportId,
                                theme.themeId,
                                index
                            )}
                        >
                            {individualReport.individualReportId}
                        </li>
                    ))}
                </ul>
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
