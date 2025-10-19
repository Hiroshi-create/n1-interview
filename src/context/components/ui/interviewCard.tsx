import { collection, FieldValue, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useAppsContext } from '@/context/AppContext';
import { db } from '../../../lib/firebase';
import { ThemeNav } from '@/context/interface/ThemeNav';

interface CardProps {
  themeNav: ThemeNav,
  onClick?: () => void;
}

const InterviewCard: React.FC<CardProps> = ({
  themeNav,
  onClick,
}) => {
  const router = useRouter();
  const { userId, setIsInterviewCollected } = useAppsContext();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [recruitmentClosed, setRecruitmentClosed] = useState<boolean>(false);
  const [interviewCollected, setInterviewCollected] = useState<boolean>(false);

  useEffect(() => {
    if (!userId || !themeNav.theme.themeId) return;
  
    const interviewsRef = collection(db, 'themes', themeNav.theme.themeId, 'interviews');
  
    const q = query(interviewsRef, where('intervieweeId', '==', userId));
  
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        setInterviewCollected(docData.interviewCollected || false);
      } else {
        setInterviewCollected(false);
      }
    });
  
    return () => unsubscribe();
  }, [userId, themeNav.theme.themeId]);

  const getHref = (href: string) => {
    return userId ? href.replace('[userId]', userId) : '#';
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (recruitmentClosed) return;
    const href = getHref(themeNav.href);
    if (onClick) {
      setIsInterviewCollected(interviewCollected);
      onClick();
    }
    if (href) {
      router.push(href);
    }
  };

  useEffect(() => {
    const deadline = themeNav.theme.deadline;
    const calculateTimeLeft = () => {
      if (!(deadline instanceof Timestamp)) {
        setTimeLeft('締切日時不明');
        setRecruitmentClosed(true);
        return;
      }

      const now = Timestamp.now();
      const difference = deadline.toMillis() - now.toMillis();

      const progressPercentage = (themeNav.theme.collectInterviewsCount / themeNav.theme.maximumNumberOfInterviews) * 100;
      const isOverAchieved = progressPercentage >= 100;

      if (difference > 0 && !isOverAchieved) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);

        if (days > 0) {
          setTimeLeft(`あと${days}日`);
        } else if (hours > 0) {
          setTimeLeft(`あと${hours}時間`);
        } else {
          setTimeLeft(`あと${minutes}分`);
        }
        setRecruitmentClosed(false);
      } else {
        setTimeLeft('締切済み');
        setRecruitmentClosed(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // 1分ごとに更新

    return () => clearInterval(timer);
  }, [themeNav.theme.deadline, themeNav.theme.collectInterviewsCount, themeNav.theme.maximumNumberOfInterviews]);

  const formatTimestamp = (timestamp: Timestamp | FieldValue) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('ja-JP');
    }
    return '日付不明';
  };

  const progressPercentage = (themeNav.theme.collectInterviewsCount / themeNav.theme.maximumNumberOfInterviews) * 100;
  const cappedProgressPercentage = Math.min(progressPercentage, 100);
  const isOverAchieved = progressPercentage >= 100;

  return (
    <div
      className={`bg-white p-3 lg:p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer hover:bg-gray-50 transition-all duration-200 border border-gray-200 flex flex-col h-full ${recruitmentClosed ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full truncate max-w-[60%]">
          {themeNav.organizationName}
        </span>
        <span className="text-xs text-gray-500">
          {formatTimestamp(themeNav.theme.createdAt)}
        </span>
      </div>
      <h2 className="text-sm md:text-base font-bold text-gray-800 leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
        {themeNav.theme.theme}
      </h2>
      <div className="mt-auto mt-3">
      <div className="flex justify-end mb-1">
        <p className="text-xs text-gray-600">
          {themeNav.theme.collectInterviewsCount} / {themeNav.theme.maximumNumberOfInterviews}
        </p>
      </div>
        <div className="w-full rounded-full h-2 mb-3 bg-gray-100">
          <div 
            className={`${isOverAchieved ? 'bg-blue-500' : 'bg-green-500'} bg-opacity-80 h-2 rounded-full transition-all duration-300`}
            style={{ width: `${cappedProgressPercentage}%` }}
          />
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-xs font-medium text-red-500">
              <Clock
                className="mr-1"
                height={14}
                width={14}
              />
              {timeLeft}
            </div>
            <div className={`text-xs font-semibold ${interviewCollected ? 'text-red-600' : 'text-blue-600'} transition-colors duration-200`}>
              {interviewCollected ? '回答済み' : '詳細 →'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;