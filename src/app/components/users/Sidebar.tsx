"use client"

import React, { useEffect, useState } from 'react'
import Image from "next/image"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/context/components/ui/sidebar"
import Link from "next/link"
import { useAppsContext } from "@/context/AppContext"
import { auth, db } from "../../../../firebase"
import { SlLogout } from "react-icons/sl"
import { Interviews } from '@/stores/Interviews'
import { collection, DocumentReference, FieldValue, getDoc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

interface InterviewNav {
  interview: Interviews;
  href: string;
  isActive: boolean;
}

export function Sidebar({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter()
  const { user, userId, setSelectedThemeId, setIsOperationCheck, setSelectedInterviewId, setSelectedInterviewRef, setSelectThemeName } = useAppsContext();

  const getHref = (href: string) => {
    return userId ? href.replace('[userId]', userId) : '#';
  }

  const handleLogoClick = () => {
    router.push(`/auto-interview/${userId}`);
  }

  const [interviewsNav, setInterviewsNav] = useState<InterviewNav[]>([]);
  const [interviewRefs, setInterviewRefs] = useState<{[key: string]: DocumentReference}>({});

  useEffect(() => {
    if(user && userId) {
      const fetchInterviews = async () => {
        const interviewCollectionRef = collection(db, "users", userId, "answerInterviews");
        const q = query(interviewCollectionRef, orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const interviewPromises = snapshot.docs.map(async (doc) => {
            const interviewRef = doc.data().interviewReference as DocumentReference;
            if (interviewRef) {
              const interviewDoc = await getDoc(interviewRef);
              if (interviewDoc.exists()) {
                const data = interviewDoc.data();
                if (isValidInterviewData(data)) {
                  const pathSegments = interviewRef.path.split('/');
                  const themeId = pathSegments[pathSegments.length - 3];
                  return {
                    interview: {
                      interviewId: doc.id,
                      intervieweeId: data.intervieweeId,
                      createdAt: data.createdAt,
                      questionCount: data.questionCount,
                      theme: data.theme,
                      reportCreated: data.reportCreated,
                    } as Interviews,
                    href: `/auto-interview/${userId}/${themeId}/${doc.id}/description`,
                    isActive: false,
                  } as InterviewNav;
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

  const selectInterview = (interviewId: string, theme: string) => {
    const pathSegments = interviewRefs[interviewId].path.split('/');
    const themeId = pathSegments[pathSegments.length - 3];
    setSelectedInterviewId(interviewId);
    console.log("Type of interviewRef:", typeof interviewRefs[interviewId]);
    console.log("interviewRef:", interviewRefs[interviewId]);
    setSelectedInterviewRef(interviewRefs[interviewId]);
    setSelectedThemeId(themeId);
    setSelectThemeName(theme);
  }

  const handleLogout = () => {
    auth.signOut();
  }

  return (
    <div className='bg-slate-900 h-full overflow-y-auto flex flex-col border-r border-slate-700 shadow-lg'>
      <div className='flex-grow' {...props}>
        <SidebarHeader className="h-16 border-b border-slate-700 flex items-center justify-center">
            <div className="px-4">
              <Image
                src="/logo/logo_yoko.svg"
                alt="感性分析 Logo"
                width={120}
                height={40}
                className="select-none cursor-pointer"
                draggable="false"
                style={{ userSelect: 'none' }}
                onClick={handleLogoClick}
              />
            </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          <SidebarGroup className="mb-4">
            <SidebarGroupLabel className="text-slate-400 text-sm font-semibold px-2 mb-2">テーマ</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {interviewsNav.map((interviewNav) => (
                <SidebarMenuItem key={interviewNav.interview.interviewId}>
                  <SidebarMenuButton asChild isActive={interviewNav.isActive}>
                  <Link
                    href={getHref(interviewNav.href)}
                    className="w-full transition-all duration-200 ease-in-out hover:bg-slate-700 rounded-md p-2 flex items-center space-x-3"
                    onClick={() => selectInterview(interviewNav.interview.interviewId, interviewNav.interview.theme)}
                  >
                    <div className="flex items-center space-x-2 px-2">
                    <span className="text-slate-300 text-base font-medium">{interviewNav.interview.theme}</span>
                    </div>
                  </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </div>
      {user && (
        <div className='mx-3 mb-2 p-3 text-slate-300 text-sm font-medium bg-slate-800 rounded-md'>
        <span className="block truncate">{user.email}</span>
        </div>
      )}
      <div
        onClick={() => handleLogout()}
        className='mx-3 mb-4 text-base flex items-center justify-center space-x-2 cursor-pointer p-3 text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 ease-in-out'
      >
        <SlLogout className="h-5 w-5" />
        <span className="font-medium">ログアウト</span>
      </div>
    </div>
  );
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