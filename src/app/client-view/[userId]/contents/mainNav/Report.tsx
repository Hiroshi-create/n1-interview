"use client";

import React, { useEffect, useState } from 'react'
import { db } from '../../../../../../firebase';
import { collection, onSnapshot, query, getDoc, Timestamp, DocumentReference, doc, orderBy } from 'firebase/firestore';
import { useAppsContext } from '@/context/AppContext';
import { Theme } from '@/stores/Theme';
import { useRouter } from 'next/navigation';
import { isValidThemeData } from '@/context/components/isValidDataCheck';

const Report = () => {
    const { user, userId, setSelectedThemeId, setSelectedThemeRef, setSelectThemeName } = useAppsContext();
    const router = useRouter();

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
                                                        themeId: doc.id,
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
        console.log("Type of themeRef:", typeof themeRefs[themeId]);
        console.log("themeRef:", themeRefs[themeId]);
        setSelectedThemeRef(themeRefs[themeId]);
        setSelectThemeName(theme);

        router.push(`/client-view/${userId}/Report/${themeId}`);
    }

    return (
        <div className='flex-grow'>
            <ul className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-300 mt-4">
                {themes.map((theme) => (
                    <li 
                        key={theme.themeId}
                        className='cursor-pointer border-b border-gray-300 p-4 hover:bg-gray-100 transition-colors duration-300'
                        onClick={() => selectTheme(theme.themeId, theme.theme)}
                    >
                        <span style={{ color: '#121212' }}>{theme.theme}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Report
