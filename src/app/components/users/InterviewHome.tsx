"use client";

import { useAppsContext } from '@/context/AppContext';
import ThemeCard from '@/context/components/ui/themeCard';
import React, { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { collection, DocumentReference, FieldValue, getDoc, doc as firebaseDoc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Interviews } from '@/stores/Interviews';
import { Theme } from '@/stores/Theme';
import { isValidInterviewData, isValidThemeData } from '@/context/components/isValidDataCheck';

interface InterviewNav {
  interview: Interviews;
  theme: Theme;
  organizationName: string;
  href: string;
  isActive: boolean;
}

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
                  
                  // テーマデータの取得
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
                                createdAt: interviewData.createdAt,
                                questionCount: interviewData.questionCount,
                                themeId: interviewData.themeId,
                                reportCreated: interviewData.reportCreated,
                                interviewDurationMin: interviewData.interviewDurationMin,
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
  }

  const getHref = (href: string) => {
    return userId ? href.replace('[userId]', userId) : '#';
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="検索..."
            className="w-full p-3 pl-10 rounded-lg border border-secondary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {interviewsNav.map((interviewNav) => (
          <ThemeCard 
            key={interviewNav.interview.interviewId}
            title={interviewNav.theme.theme}
            href={getHref(interviewNav.href)}
            createdAt={interviewNav.interview.createdAt}
            onClick={() => {
              selectInterview(interviewNav);
            }}
            deadline={interviewNav.theme.deadline}
            organizationName={interviewNav.organizationName}
          />
        ))}
      </div>
    </div>
  );
}

export default InterviewHome;