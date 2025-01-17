"use client"

import React, { useEffect } from 'react'
import Sidebar from '../../components/users/Sidebar'
import Chat, { ChatProvider } from '../../components/users/Chat'
import App from "../../components/users/App";
import { usePathname } from 'next/navigation';
import { useAppsContext } from '@/context/AppContext';


const AutoInterview = () => {
  const { requestMicPermission, micPermission } = useAppsContext();
  
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

  // マイク、音声の許可を取得
  useEffect(() => {
    if (micPermission === null) {
      requestMicPermission();
    }
  }, []);

  return (
    <div className="flex h-screen justify-center items-center">
      <div className="h-full flex" style={{ width: "1280px" }}>
        <div className="w-1/5 h-full border-r">
          <Sidebar />
        </div>
        <div className="w-4/5 h-full relative">
          <ChatProvider>
            <div className="absolute inset-0 pb-12">
              <Chat />
            </div>
            <div className="w-4/5 absolute inset-0 z-10">
              <App />
            </div>
          </ChatProvider>
        </div>
      </div>
    </div>
  )
}

export default AutoInterview