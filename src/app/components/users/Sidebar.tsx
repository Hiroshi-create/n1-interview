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
import { db } from "../../../lib/firebase"
import { Brain, X } from 'lucide-react';
import { collection, DocumentReference, doc as firestoreDoc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { isValidThemeData } from '@/context/components/isValidDataCheck'
import { ThemeNav } from '@/context/interface/ThemeNav'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  toggleMenu: () => void;
}

export function Sidebar({ toggleMenu, ...props }: SidebarProps) {
  const router = useRouter()
  const {
    user,
    userId,
    setSelectedThemeId,
    setSelectedThemeRef,
    setSelectThemeName,
  } = useAppsContext();

  const getHref = (href: string) => {
    return userId ? href.replace('[userId]', userId) : '#';
  }

  const handleLogoClick = () => {
    router.push(`/auto-interview/${userId}`);
  }

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
    const theme = themeNav.theme;
    setSelectedThemeRef(themeRefs[theme.themeId]);
    setSelectedThemeId(theme.themeId);
    setSelectThemeName(theme.theme);
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
            <div className="flex gap-6">
              <Link href={`/auto-interview/${userId}`} className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-white text-black" />
                <span className="text-white text-xl font-bold">Auto N1 Interview</span>
              </Link>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          <SidebarGroup className="mb-4">
            <SidebarGroupLabel className="text-slate-400 text-sm font-semibold px-2 mb-2">テーマ</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {themesNav.map((themeNav) => (
                <SidebarMenuItem key={themeNav.theme.themeId}>
                  <SidebarMenuButton asChild isActive={themeNav.isActive}>
                    <Link
                      href={getHref(themeNav.href)}
                      className="w-full transition-all duration-200 ease-in-out hover:bg-slate-700 rounded-md p-2 flex items-center space-x-3"
                      onClick={() => selectTheme(themeNav)}
                    >
                      <div className="flex items-center space-x-2 px-2">
                      <span className="text-slate-300 text-base font-medium">{themeNav.theme.theme}</span>
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
