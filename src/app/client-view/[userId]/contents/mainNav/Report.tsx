"use client";

import React, { useEffect, useState } from 'react'
import { db } from '../../../../../../firebase';
import { collection, onSnapshot, query, getDoc, Timestamp, DocumentReference, doc, orderBy } from 'firebase/firestore';
import { useAppsContext } from '@/context/AppContext';
import { Theme } from '@/stores/Theme';
import { useRouter } from 'next/navigation';
import { isValidThemeData } from '@/context/components/isValidDataCheck';
import ClientsideThemeCard from '@/context/components/ui/clientsideThemeCard';

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

    useEffect(() => {
        if (user && userId) {
            const fetchUserDataAndThemes = async () => {
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

    return (
        <div className='flex-grow'>
            {/* <form onSubmit={handleSearch} className="mb-8">
                <div className="relative">
                <input
                    type="text"
                    // value={searchTerm}
                    // onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="テーマを検索..."
                    className="w-full p-3 pl-10 rounded-lg border border-gray-400"
                />
                <button 
                    type="submit" 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all"
                >
                    検索
                </button>
                </div>
            </form> */}
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
        </div>
    );
}

export default Report
