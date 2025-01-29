import { FieldValue, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { FiClock } from 'react-icons/fi';

interface CardProps {
  title: string;
  createdAt: Timestamp | FieldValue;
  onClick?: () => void;
  href?: string;
  deadline: Timestamp;
  organizationName: string;
}

const ThemeCard: React.FC<CardProps> = ({
  title,
  createdAt,
  onClick,
  href,
  deadline,
  organizationName
}) => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>('');

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick();
    }
    if (href) {
      router.push(href);
    }
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
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
  }, [deadline]);

  const formatCreatedAt = (timestamp: Timestamp | FieldValue) => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString('ja-JP');
    }
    return '日付不明';
  };

  return (
    <div
      className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:bg-gray-100 hover:shadow-lg transition-all duration-300 border border-gray-200 flex flex-col h-full"
      onClick={handleClick}
    >
      <div className="flex flex-col mb-4 flex-grow">
        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full self-start mb-2">
          {organizationName}
        </span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2 line-clamp-2">{title}</h2>
      </div>
      <div className="mt-auto">
        <p className="text-sm text-gray-500 mb-4">作成日: {formatCreatedAt(createdAt)}</p>
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm font-medium text-red-500">
              <FiClock className="mr-1" />
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
