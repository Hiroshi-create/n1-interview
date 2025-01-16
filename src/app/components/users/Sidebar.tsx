"use client";

import React, { useEffect, useState } from 'react'
import { SlLogout } from "react-icons/sl";
import { auth, db } from '../../../../firebase';
import { collection, onSnapshot, query, getDoc, Timestamp, FieldValue, DocumentReference } from 'firebase/firestore';
import { useAppsContext } from '@/context/AppContext';
import { Interviews } from '@/stores/Interviews';

const Sidebar = () => {
    const { user, userId, setSelectedInterviewId, setSelectedInterviewRef, setSelectThemeName } = useAppsContext();

    const [interviews, setInterviews] = useState<Interviews[]>([]);
    const [interviewRefs, setInterviewRefs] = useState<{[key: string]: DocumentReference}>({});

    useEffect(() => {
        if(user && userId) {
            const fetchInterviews = async () => {
                const interviewCollectionRef = collection(db, "users", userId, "answerInterviews");
                const q = query(interviewCollectionRef);
                
                const unsubscribe = onSnapshot(q, async (snapshot) => {
                    const interviewPromises = snapshot.docs.map(async (doc) => {
                        const interviewRef = doc.data().interviewReference as DocumentReference;
                        if (interviewRef) {
                            const interviewDoc = await getDoc(interviewRef);
                            if (interviewDoc.exists()) {
                                const data = interviewDoc.data();
                                if (isValidInterviewData(data)) {
                                    return {
                                        interviewId: doc.id, // ここを変更
                                        intervieweeId: data.intervieweeId,
                                        createdAt: data.createdAt,
                                        questionCount: data.questionCount,
                                        theme: data.theme,
                                        reportCreated: data.reportCreated,
                                    } as Interviews;
                                }
                            }
                        }
                        return null;
                    });

                    const interviewResults = await Promise.all(interviewPromises);
                    const validInterviews = interviewResults.filter((interview): interview is Interviews => interview !== null);
                    setInterviews(validInterviews);

                    const newInterviewRefs = snapshot.docs.reduce((acc, doc) => {
                        const interviewRef = doc.data().interviewReference as DocumentReference;
                        if (interviewRef) {
                            acc[doc.id] = interviewRef;
                        }
                        return acc;
                    }, {} as {[key: string]: DocumentReference});
                    setInterviewRefs(newInterviewRefs);
                });

                return () => unsubscribe();
            };

            fetchInterviews();
        }
    }, [user, userId]);

    const selectInterview = (interviewId: string, theme: string) => {
        setSelectedInterviewId(interviewId);
        console.log("Type of interviewRef:", typeof interviewRefs[interviewId]);
        console.log("interviewRef:", interviewRefs[interviewId]);
        setSelectedInterviewRef(interviewRefs[interviewId]);
        setSelectThemeName(theme);
    }

    const handleLogout = () => {
        auth.signOut();
    }

    return (
        <div className='bg-custom-blue h-full overflow-y-auto px-3 flex flex-col'>
            <div className='flex-grow'>
                <ul className="space-y-1 py-4">
                    {interviews.map((interview) => (
                        <li 
                            key={interview.interviewId}
                            className='cursor-pointer transition-all duration-200 ease-in-out bg-slate-800 hover:bg-slate-700 rounded-md'
                            onClick={() => selectInterview(interview.interviewId, interview.theme)}
                        >
                            <div className="p-2">
                                <div className="flex items-center space-x-2 px-2">
                                    <span className="text-slate-100 text-base font-medium">{interview.theme}</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            {user && (
                <div className='mb-2 p-4 text-slate-100 text-base font-medium bg-slate-800 rounded-md'>
                    <span className="block truncate">{user.email}</span>
                </div>
            )}
            <div
                onClick={() => handleLogout()}
                className='text-base flex items-center justify-center space-x-2 mb-4 cursor-pointer p-3 text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 ease-in-out'
            >
                <SlLogout className="h-5 w-5" />
                <span className="font-medium">ログアウト</span>
            </div>
        </div>
    )
}

function isValidInterviewData(data: unknown): data is Interviews {
    return (
        typeof data === 'object' &&
        data !== null &&
        'intervieweeId' in data &&
        'createdAt' in data &&
        'questionCount' in data &&
        'theme' in data &&
        'reportCreated' in data &&
        typeof (data as any).intervieweeId === 'string' &&
        (data as any).createdAt instanceof Timestamp || (data as any).createdAt instanceof FieldValue &&
        typeof (data as any).questionCount === 'number' &&
        typeof (data as any).theme === 'string' &&
        typeof (data as any).reportCreated === 'boolean'
    );
}

export default Sidebar
