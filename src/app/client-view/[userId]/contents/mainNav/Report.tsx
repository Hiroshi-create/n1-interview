"use client";

import React, { useEffect, useState } from 'react'
import { db } from '../../../../../lib/firebase';
import { collection, onSnapshot, query, getDoc, Timestamp, DocumentReference, doc, orderBy } from 'firebase/firestore';
import { useAppsContext } from '@/context/AppContext';
import { Theme } from '@/stores/Theme';
import { useRouter } from 'next/navigation';
import { isValidThemeData } from '@/context/components/isValidDataCheck';
import ClientsideThemeCard from '@/context/components/ui/clientsideThemeCard';
import { PlusCircle } from 'lucide-react';
import { useLastVisitedUrl } from '@/context/hooks/useLastVisitedUrl';

const Report = () => {
    const router = useRouter();
    const {
        user,
        userId,
        setSelectedThemeId,
        setSelectedThemeRef,
        setSelectThemeName
    } = useAppsContext();

    const [themes, setThemes] = useState<Theme[]>([]);
    const [themeRefs, setThemeRefs] = useState<{[key: string]: DocumentReference}>({});
    const [isLoading, setIsLoading] = useState(true);

    useLastVisitedUrl();

    useEffect(() => {
        if (user && userId) {
            const fetchUserDataAndThemes = async () => {
                setIsLoading(true);
                try {
                    // ユーザードキュメントの参照を取得
                    const userDocRef = doc(db, "users", userId);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        if (userData.inOrganization) {
                            const organizationId = userData.organizationId;
                            if (organizationId) {
                                const themeCollectionRef = collection(db, "clients", organizationId, "manageThemes");
                                const q = query(themeCollectionRef, orderBy("createdAt", "desc"));
                                
                                const unsubscribe = onSnapshot(q, async (snapshot) => {
                                    const themePromises = snapshot.docs.map(async (doc) => {
                                        const themeRef = doc.data().themeReference as DocumentReference;
                                        if (themeRef) {
                                            const themeDoc = await getDoc(themeRef);
                                            if (themeDoc.exists()) {
                                                const data = themeDoc.data();
                                                if (isValidThemeData(data)) {
                                                    return {
                                                        themeId: data.themeId,
                                                        theme: data.theme,
                                                        createUserId: data.createUserId,
                                                        createdAt: data.createdAt,
                                                        deadline: data.deadline,
                                                        clientId: data.clientId,
                                                        interviewsRequestedCount: data.interviewsRequestedCount,
                                                        collectInterviewsCount: data.collectInterviewsCount,
                                                        interviewDurationMin: data.interviewDurationMin,
                                                        isPublic: data.isPublic,
                                                        maximumNumberOfInterviews: data.maximumNumberOfInterviews,
                                                        interviewResponseURL: data.interviewResponseURL,
                                                        reportCreated: data.reportCreated,
                                                    } as Theme;
                                                }
                                            }
                                        }
                                        return null;
                                    });
    
                                    const themeResults = await Promise.all(themePromises);
                                    const validThemes = themeResults.filter((theme): theme is Theme => theme !== null);
                                    setThemes(validThemes);
    
                                    const newThemeRefs = snapshot.docs.reduce((acc, doc) => {
                                        const themeRef = doc.data().themeReference as DocumentReference;
                                        if (themeRef) {
                                            acc[doc.id] = themeRef;
                                        }
                                        return acc;
                                    }, {} as {[key: string]: DocumentReference});
                                    setThemeRefs(newThemeRefs);
                                    setIsLoading(false);
                                });
    
                                return () => unsubscribe();
                            } else {
                                console.error("ユーザーに organizationId が設定されていません");
                            }
                        } else {
                            console.log("ユーザーは組織に属していません");
                        }
                    } else {
                        console.error("ユーザードキュメントが存在しません");
                    }
                } catch (error) {
                    console.error("ユーザーデータとテーマの取得中にエラーが発生しました:", error);
                    setIsLoading(false);
                }
            };
    
            fetchUserDataAndThemes();
        }
    }, [user, userId, db]);

    const selectTheme = (themeId: string, theme: string) => {
        setSelectedThemeId(themeId);
        setSelectedThemeRef(themeRefs[themeId]);
        setSelectThemeName(theme);
        router.push(`/client-view/${userId}/Report/${themeId}`);
    }

    const handleCreateTheme = () => {
        router.push(`/client-view/${userId}/AddTheme`);
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className='flex-grow p-6'>
            {themes.length > 0 ? (
                <ul className="rounded-lg mt-4 space-y-4">
                {themes.map((theme) => (
                    <li key={theme.themeId} className="bg-white">
                        <ClientsideThemeCard
                            themeNav={theme}
                            onClick={() => selectTheme(theme.themeId, theme.theme)}
                        />
                    </li>
                ))}
            </ul>
            ) : (
                <div className="flex flex-col items-center justify-center bg-gray-50 p-8">
                    <PlusCircle className="w-24 h-24 text-blue-500 mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">テーマがまだありません</h2>
                    <p className="text-lg text-gray-600 mb-8 text-center max-w-lg">
                        新しいテーマを作成して、インタビューを始めましょう！<br/>
                        プロジェクトに洞察を得るための第一歩です。
                    </p>
                    <button
                        onClick={handleCreateTheme}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-colors duration-300 flex items-center"
                    >
                        <PlusCircle className="mr-2" />
                        テーマを作成する
                    </button>
                </div>
            )}
        </div>
    );
}

export default Report
