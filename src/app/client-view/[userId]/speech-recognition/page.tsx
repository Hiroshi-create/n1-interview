"use client";

import { useEffect, useState } from 'react';
import { useAppsContext } from '@/context/AppContext';
import { useLastVisitedUrl } from '@/context/hooks/useLastVisitedUrl';
import SpeechRecognition from './contents/speechRecognition';

const DashboardContent = () => {
  const { user, userId } = useAppsContext();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive");
  const [isLoading, setIsLoading] = useState(true);

  useLastVisitedUrl();

  useEffect(() => {
    // 必要なサービス連携処理のみ残す（例：認証・サブスクリプション状態取得など）
    if (user && userId) {
      // ここで必要に応じてサブスクリプション状態などを取得
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [user, userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className='flex flex-row h-full'>
      <div className="w-full border bg-white bg-gray-100 shadow-md rounded-lg mb-12 transition-all duration-300">
        <SpeechRecognition />
      </div>
    </div>
  );
}

export default DashboardContent;
