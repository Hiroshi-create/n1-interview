"use client"

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation';
import GuestUserHome from '@/app/components/guest-user/guestUserHome';

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
    <div>
      <GuestUserHome />
    </div>
  )
}

export default AutoInterview