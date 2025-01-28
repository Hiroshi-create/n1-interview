"use client"

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation';
import InterviewHome from '@/app/components/users/InterviewHome';

const AutoInterview = () => {
  const pathname = usePathname();
  useEffect(() => {
    const saveLastVisitedUrl = (url: string) => {
      localStorage.setItem('lastVisitedUrl', url);
    };
    if (pathname) {
      saveLastVisitedUrl(pathname);
    }
  }, [pathname]);

  return (
    <div className="h-full flex flex-col p-4">
      <h1 className="text-secondary">interviewのホーム</h1>
      <InterviewHome />
    </div>
  )
}

export default AutoInterview