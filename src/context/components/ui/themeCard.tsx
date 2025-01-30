import { FieldValue, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { InterviewNav } from '@/context/interface/InterviewNav';
import { useAppsContext } from '@/context/AppContext';

interface CardProps {
  interviewNav: InterviewNav,
  onClick?: () => void;
}

const ThemeCard: React.FC<CardProps> = ({
  interviewNav,
  onClick,
}) => {
  const router = useRouter();
  const { userId } = useAppsContext();
  const [timeLeft, setTimeLeft] = useState<string>('');

  const getHref = (href: string) => {
    return userId ? href.replace('[userId]', userId) : '#';
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const href = getHref(interviewNav.href);
    if (onClick) {
      onClick();
    }
    if (href) {
      router.push(href);
    }
  };

  useEffect(() => {
    const deadline = interviewNav.theme.deadline;
    const calculateTimeLeft = () => {
      if (!(deadline instanceof Timestamp)) {
        setTimeLeft('締切日時不明');
        return;
      }

      const now = Timestamp.now();
      const difference = deadline.toMillis() - now.toMillis();

      if (difference > 0) {
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
      } else {
        setTimeLeft('締切済み');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // 1分ごとに更新

    return () => clearInterval(timer);
  }, [interviewNav.theme.deadline]);

  const formatTimestamp = (timestamp: Timestamp | FieldValue) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('ja-JP');
    }
    return '日付不明';
  };

  const progressPercentage = (interviewNav.theme.collectInterviewsCount / interviewNav.theme.maximumNumberOfInterviews) * 100;
  const cappedProgressPercentage = Math.min(progressPercentage, 100);
  const isOverAchieved = progressPercentage > 100;

  console.log('Progress Percentage:', progressPercentage);
  console.log('Collect Interviews Count:', interviewNav.theme.collectInterviewsCount);
  console.log('Maximum Number of Interviews:', interviewNav.theme.maximumNumberOfInterviews);

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-100 hover:shadow-lg transition-all duration-300 border border-gray-200 flex flex-col h-full"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
          {interviewNav.organizationName}
        </span>
        <span className="text-sm text-gray-500">
          作成日: {formatTimestamp(interviewNav.theme.createdAt)}
        </span>
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight mb-2 line-clamp-2">
        {interviewNav.theme.theme}
      </h2>
      <div className="mt-auto mt-6">
      <div className="flex justify-end mb-2">
        <p className="text-sm text-gray-600">
          {interviewNav.theme.collectInterviewsCount} / {interviewNav.theme.maximumNumberOfInterviews} 達成
        </p>
      </div>
        <div className="w-full rounded-full h-4 mb-4">
          <div 
            className={`${isOverAchieved ? 'bg-blue-500' : 'bg-green-500'} bg-opacity-70 h-4 rounded-full transition-all duration-300`}
            style={{ width: `${cappedProgressPercentage}%` }}
          />
        </div>
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm font-medium text-red-500">
              <Clock
                className="mr-2"
                height={16}
                width={16}
              />
              {timeLeft}
            </div>
            <div className="text-sm font-semibold text-blue-600 group-hover:text-blue-800 transition-colors duration-200">
              詳細を見る →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeCard;