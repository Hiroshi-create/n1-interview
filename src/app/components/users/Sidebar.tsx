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
} from "@/context/components/ui/sidebar/sidebar"
import Link from "next/link"
import { useAppsContext } from "@/context/AppContext"
import { auth, db } from "../../../../firebase"
import { X, LogOut } from 'lucide-react';
import { Interviews } from '@/stores/Interviews'
import { collection, DocumentReference, FieldValue, doc as firebaseDoc, getDoc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Theme } from '@/stores/Theme'
import { isValidInterviewData, isValidThemeData } from '@/context/components/isValidDataCheck'
import { InterviewNav } from '@/context/interface/InterviewNav'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  toggleMenu: () => void;
}

export function Sidebar({ toggleMenu, ...props }: SidebarProps) {
  const router = useRouter()
  const {
    user,
    userId,
    setSelectedThemeId,
    setSelectedInterviewId,
    setSelectedInterviewRef,
    setSelectThemeName
  } = useAppsContext();

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
                        let organizationName = "";
                        const clientDocRef = firebaseDoc(db, "clients", themeData.clientId);
                        if (clientDocRef) {
                          const clientDoc = await getDoc(clientDocRef);
                          if (clientDoc.exists()) {
                            organizationName = clientDoc.data().organizationName;
                          }
                        }

                        return {
                          interview: {
                            interviewId: doc.id,
                            intervieweeId: interviewData.intervieweeId,
                            answerInterviewId: interviewData.answerInterviewId,
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
                          // href: `/auto-interview/${userId}/${themeId}/${doc.id}/description`,
                          href: `/auto-interview/${userId}/${themeId}/description`,
                          isActive: false,
                        } as InterviewNav;
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
    console.log("サイドバーのinterviewId : " + interviewId)
    setSelectedInterviewId(interviewId);
    setSelectedInterviewRef(interviewRefs[interviewId]);
    setSelectedThemeId(interviewNav.theme.themeId);
    setSelectThemeName(interviewNav.theme.theme);
  }

  const handleLogout = () => {
    auth.signOut();
  }

  return (
    <div className='bg-slate-900 h-full overflow-y-auto flex flex-col border-r border-slate-700 shadow-lg'>
      <div className='flex-grow' {...props}>
        <SidebarHeader className="h-14 border-b border-slate-700 flex flex-row items-center justify-start">
          <button 
            onClick={toggleMenu}
            className="px-4 text-slate-300 hover:text-slate-100 transition-colors duration-200"
          >
            <X size={24} />
          </button>
          <div className="flex-grow flex justify-center">
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
                    onClick={() => selectInterview(interviewNav)}
                  >
                    <div className="flex items-center space-x-2 px-2">
                    <span className="text-slate-300 text-base font-medium">{interviewNav.theme.theme}</span>
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
    </div>
  );
}

export default Sidebar