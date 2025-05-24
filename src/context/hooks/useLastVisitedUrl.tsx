"use client"

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useLastVisitedUrl() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      localStorage.setItem('lastVisitedUrl', pathname);
    }
  }, [pathname]);
}
