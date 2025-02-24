"use client";

import { useAppsContext } from '@/context/AppContext';
import React, { useEffect, useState } from 'react';
import { collection, DocumentReference, getDoc, doc as firestoreDoc, onSnapshot, orderBy, query, Timestamp, DocumentData, FieldValue } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Theme } from '@/stores/Theme';
import { isValidThemeData } from '@/context/components/isValidDataCheck';
import InterviewCard from '@/context/components/ui/interviewCard';
import { ThemeNav } from '@/context/interface/ThemeNav';

const InterviewHome: React.FC = () => {
  const {
    user,
    userId,
    setSelectedThemeId,
    setSelectedThemeRef,
    setSelectThemeName,
  } = useAppsContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [themesNav, setThemesNav] = useState<ThemeNav[]>([]);
    const [themeRefs, setThemeRefs] = useState<{[key: string]: DocumentReference}>({});

  useEffect(() => {
    if(user && userId) {
      const themeCollectionRef = collection(db, "themes");
      const q = query(themeCollectionRef, orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const themePromises = snapshot.docs.map(async (doc) => {
          const themeData = doc.data();
          if (isValidThemeData(themeData)) {
            let organizationName = "";
            const clientDocRef = firestoreDoc(db, "clients", themeData.clientId);
            const clientDoc = await getDoc(clientDocRef);
            if (clientDoc.exists()) {
              organizationName = clientDoc.data().organizationName;
            }

            return {
              theme: {
                themeId: doc.id,
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
                reportCreated: themeData.reportCreated,
              },
              organizationName: organizationName,
              href: `/auto-interview/${userId}/${doc.id}/description`,
              isActive: false,
            } as ThemeNav;
          }
          return null;
        });

        const themeResults = await Promise.all(themePromises);
        const validThemes = themeResults.filter((theme): theme is ThemeNav => theme !== null);
        setThemesNav(validThemes);

        const newThemeRefs: {[key: string]: DocumentReference} = {};
        snapshot.docs.forEach((doc) => {
          const themeRef = doc.ref;
          newThemeRefs[doc.id] = themeRef;
        });
        setThemeRefs(newThemeRefs);
      });

      return () => unsubscribe();
    }
  }, [user, userId]);

  const selectTheme = (themeNav: ThemeNav) => {
    // const interviewId = interviewNav.interview.interviewId;
    // console.log("ホームのinterviewId : " + interviewId)
    // setSelectedInterviewId(interviewId);
    // setSelectedInterviewRef(interviewRefs[interviewId]);
    // setSelectedThemeId(interviewNav.theme.themeId);
    // setSelectThemeName(interviewNav.theme.theme);

    const theme = themeNav.theme;
    setSelectedThemeRef(themeRefs[theme.themeId]);
    setSelectedThemeId(theme.themeId);
    setSelectThemeName(theme.theme);
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
        const validInterviews: ThemeNav[] = data.interviewNav.map((validInterview: any) => {
          return {
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
              reportCreated: validInterview.theme.reportCreated,
            } as Theme,
            organizationName: validInterview.organizationName,
            href: validInterview.href,
            isActive: validInterview.isActive
          } as ThemeNav;
        });
        setThemesNav(validInterviews);
        
        if (data.interviewRefs && typeof data.interviewRefs === 'object') {
          const convertedRefs: {[key: string]: DocumentReference<DocumentData, DocumentData>} = {};
          Object.entries(data.interviewRefs).forEach(([key, path]) => {
            if (typeof path === 'string') {
              convertedRefs[key] = firestoreDoc(db, path) as DocumentReference<DocumentData, DocumentData>;
            }
          });
          setThemeRefs(convertedRefs);
        } else {
          console.log("interviewRefsが見つからないか、正しい形式ではありません");
          setThemeRefs({});
        }
      } else {
        console.log("検索結果が見つかりませんでした");
        setThemesNav([]);
        setThemeRefs({});
      }
    } catch (error) {
      console.error('検索エラー:', error);
      setThemesNav([]);
      setThemeRefs({});
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
        {themesNav.map((themeNav) => (
          <InterviewCard 
            key={themeNav.theme.themeId}
            themeNav={themeNav}
            onClick={() => {
              selectTheme(themeNav);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default InterviewHome;