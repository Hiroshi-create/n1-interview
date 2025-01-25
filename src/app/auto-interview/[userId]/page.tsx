"use client"

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation';

const AutoInterview = () => {
  
  // 遷移先のURLをローカルストレージに保存
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
    <div className="flex h-screen justify-center items-center">
      interviewのホーム
    </div>
  )
}

export default AutoInterview