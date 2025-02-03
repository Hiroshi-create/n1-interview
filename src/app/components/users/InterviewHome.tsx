"use client";

import { useAppsContext } from '@/context/AppContext';
import ThemeCard from '@/context/components/ui/interviewCard';
import React, { useEffect, useState } from 'react';
import { collection, DocumentReference, getDoc, doc as firebaseDoc, onSnapshot, orderBy, query, Timestamp, DocumentData, FieldValue } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { isValidInterviewData, isValidThemeData } from '@/context/components/isValidDataCheck';
import { InterviewNav } from '@/context/interface/InterviewNav';

const InterviewHome: React.FC = () => {
  const {
    user,
    userId,
    setSelectedThemeId,
    setSelectedInterviewId,
    setSelectedInterviewRef,
    setSelectThemeName
  } = useAppsContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [interviewsNav, setInterviewsNav] = useState<InterviewNav[]>([]);
  const [interviewRefs, setInterviewRefs] = useState<{[key: string]: DocumentReference}>({});

  useEffect(() => {
    if (user && userId) {
      const fetchInterviews = async () => {
        const interviewCollectionRef = collection(db, "users", userId, "answerInterviews");
        const q = query(interviewCollectionRef, orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const interviewPromises = snapshot.docs.map(async (doc) => {
            const interviewRef = doc.data().interviewReference as DocumentReference;
            if (interviewRef) {
              const interviewDoc = await getDoc(interviewRef);
              if (interviewDoc.exists()) {
                const interviewData = interviewDoc.data();
                if (isValidInterviewData(interviewData)) {
                  const parentDocRef = interviewRef.parent.parent;
                  if (parentDocRef) {
                    const themeDoc = await getDoc(parentDocRef);
                    const themeId = themeDoc.id;
                    if (themeDoc.exists()) {
                      const themeData = themeDoc.data();
                      if (isValidThemeData(themeData)) {
                        const clientDocRef = firebaseDoc(db, "clients", themeData.clientId);
                        if (clientDocRef) {
                          const clientDoc = await getDoc(clientDocRef);
                          if (clientDoc.exists()) {
                            const organizationName = clientDoc.data().organizationName;
                            return {
                              interview: {
                                interviewId: doc.id,
                                intervieweeId: interviewData.intervieweeId,
                                answerInterviewId: interviewData.answerInterviewId,
                                manageThemeId: interviewData.manageThemeId,
                                createdAt: interviewData.createdAt,
                                questionCount: interviewData.questionCount,
                                themeId: interviewData.themeId,
                                reportCreated: interviewData.reportCreated,
                                interviewCollected: interviewData.interviewCollected,
                                interviewDurationMin: interviewData.interviewDurationMin,
                                temporaryId: interviewData.temporaryId,
                                confirmedUserId: interviewData.confirmedUserId,
                              } as Interviews,
                              theme: {
                                themeId: themeId,
                                theme: themeData.theme,
                                createUserId: themeData.createUserId,
                                createdAt: themeData.createdAt,
                                deadline: themeData.deadline,
                                clientId: themeData.clientId,
                                interviewsRequestedCount: themeData.interviewsRequestedCount,
                                collectInterviewsCount: themeData.collectInterviewsCount,
                                interviewDurationMin: themeData.interviewDurationMin,
                                isPublic: themeData.isPublic,
                                maximumNumberOfInterviews: themeData.maximumNumberOfInterviews,
                                interviewResponseURL: themeData.interviewResponseURL,
                              } as Theme,
                              organizationName: organizationName,
                              href: `/auto-interview/${userId}/${themeId}/${doc.id}/description`,
                              isActive: false,
                            } as InterviewNav;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            return null;
          });
          const interviewResults = await Promise.all(interviewPromises);
          const validInterviews = interviewResults.filter((interview): interview is InterviewNav => interview !== null);
          setInterviewsNav(validInterviews);
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

  const selectInterview = (interviewNav: InterviewNav) => {
    const interviewId = interviewNav.interview.interviewId;
    console.log("ホームのinterviewId : " + interviewId)
    setSelectedInterviewId(interviewId);
    setSelectedInterviewRef(interviewRefs[interviewId]);
    setSelectedThemeId(interviewNav.theme.themeId);
    setSelectThemeName(interviewNav.theme.theme);
  };

  const formatTimestamp = (timestamp: Timestamp | FieldValue) => {
      if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleDateString('ja-JP');
      }
      return '日付不明';
    };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/search_themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialQuery: searchTerm,
          userId: userId,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `サーバーエラー: ${response.status}`);
      }
  
      const data = await response.json();
  
      if (Array.isArray(data.interviewNav) && data.interviewNav.length > 0) {
        const validInterviews: InterviewNav[] = data.interviewNav.map((validInterview: any) => {
          return {
            interview: {
              interviewId: validInterview.interview.interviewId,
              intervieweeId: validInterview.interview.intervieweeId,
              answerInterviewId: validInterview.interview.answerInterviewId,
              manageThemeId: validInterview.interview.manageThemeId,
              createdAt: Timestamp.fromDate(new Date(validInterview.interview.createdAt)),
              questionCount: validInterview.interview.questionCount,
              reportCreated: validInterview.interview.reportCreated,
              interviewCollected: validInterview.interview.interviewCollected,
              interviewDurationMin: validInterview.interview.interviewDurationMin,
              themeId: validInterview.interview.themeId,
              temporaryId: validInterview.interview.temporaryId,
              confirmedUserId: validInterview.interview.confirmedUserId,
            } as Interviews,
            theme: {
              themeId: validInterview.theme.themeId,
              theme: validInterview.theme.theme,
              createUserId: validInterview.theme.createUserId,
              createdAt: Timestamp.fromDate(new Date(validInterview.theme.createdAt)),
              deadline: Timestamp.fromDate(new Date(validInterview.theme.deadline)),
              clientId: validInterview.theme.clientId,
              interviewsRequestedCount: validInterview.theme.interviewsRequestedCount,
              collectInterviewsCount: validInterview.theme.collectInterviewsCount,
              interviewDurationMin: validInterview.theme.interviewDurationMin,
              isPublic: validInterview.theme.isPublic,
              maximumNumberOfInterviews: validInterview.theme.maximumNumberOfInterviews,
              interviewResponseURL: validInterview.theme.interviewResponseURL,
            } as Theme,
            organizationName: validInterview.organizationName,
            href: validInterview.href,
            isActive: validInterview.isActive
          } as InterviewNav;
        });
        setInterviewsNav(validInterviews);
        
        if (data.interviewRefs && typeof data.interviewRefs === 'object') {
          const convertedRefs: {[key: string]: DocumentReference<DocumentData, DocumentData>} = {};
          Object.entries(data.interviewRefs).forEach(([key, path]) => {
            if (typeof path === 'string') {
              convertedRefs[key] = firebaseDoc(db, path) as DocumentReference<DocumentData, DocumentData>;
            }
          });
          setInterviewRefs(convertedRefs);
        } else {
          console.log("interviewRefsが見つからないか、正しい形式ではありません");
          setInterviewRefs({});
        }
      } else {
        console.log("検索結果が見つかりませんでした");
        setInterviewsNav([]);
        setInterviewRefs({});
      }
    } catch (error) {
      console.error('検索エラー:', error);
      setInterviewsNav([]);
      setInterviewRefs({});
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {interviewsNav.map((interviewNav) => (
          <ThemeCard 
            key={interviewNav.interview.interviewId}
            interviewNav={interviewNav}
            onClick={() => {
              selectInterview(interviewNav);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default InterviewHome;