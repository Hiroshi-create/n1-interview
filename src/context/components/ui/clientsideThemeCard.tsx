import React, { useState } from 'react';
import { Theme } from "@/stores/Theme";
import { Clock, Users, Timer, Eye, EyeOff, Calendar, Link } from 'lucide-react';

interface CardProps {
  themeNav: Theme,
  onClick?: () => void;
}

const ClientsideThemeCard: React.FC<CardProps> = ({ themeNav, onClick }) => {
    const [isCopied, setIsCopied] = useState(false);
    const interviewResponseURL = themeNav.interviewResponseURL ?? "取得に失敗しました...";
    const formatTimestamp = (timestamp: any) => {
        if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toLocaleDateString('ja-JP');
        }
        return '日付不明';
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(interviewResponseURL).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000); // 3秒後に元に戻す
        });
    };

    const handleCopyClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // カード全体のonClickの発火を防ぐ
        copyToClipboard();
    };

    const calculateTimeLeft = (deadline: any) => {
        if (deadline && typeof deadline.toDate === 'function') {
            const now = new Date();
            const deadlineDate = deadline.toDate();
            const difference = deadlineDate.getTime() - now.getTime();

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);

                if (days > 0) return `あと${days}日`;
                if (hours > 0) return `あと${hours}時間`;
                return `あと${minutes}分`;
            }
        }
        return '締切済み';
    };

    const progressPercentage = (themeNav.collectInterviewsCount / themeNav.maximumNumberOfInterviews) * 100;
    const cappedProgressPercentage = Math.min(progressPercentage, 100);

    return (
        <div 
            className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300 cursor-pointer hover:bg-gray-100"
            onClick={onClick}
        >
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{themeNav.theme}</h2>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${themeNav.isPublic ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex items-center`}>
                    {themeNav.isPublic ? <Eye className="mr-1" size={12} /> : <EyeOff className="mr-1" size={12} />}
                    {themeNav.isPublic ? '公開' : '非公開'}
                </span>
            </div>
            <div className="flex flex-wrap justify-between text-gray-600 mb-3">
                <div className="w-full sm:w-1/2 flex items-center mb-2">
                    <Calendar className="mr-2" size={14} />
                    <span>作成日: {formatTimestamp(themeNav.createdAt)}</span>
                </div>
                <div className="w-full sm:w-1/2 flex items-center mb-2">
                    <Clock className="mr-2" size={14} />
                    <span>締切日: {formatTimestamp(themeNav.deadline)}</span>
                </div>
                <div className="w-full sm:w-1/2 flex items-center">
                    <Timer className="mr-2" size={14} />
                    <span>インタビュー時間: {themeNav.interviewDurationMin}分</span>
                </div>
                <div className="w-full sm:w-1/2 flex items-center">
                    <Users className="mr-2" size={14} />
                    <span>リクエスト数: {themeNav.interviewsRequestedCount}</span>
                </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span className="font-semibold">進捗状況</span>
                <span>{themeNav.collectInterviewsCount} / {themeNav.maximumNumberOfInterviews}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${cappedProgressPercentage}%` }}
                ></div>
            </div>
            <div className="text-right">
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {calculateTimeLeft(themeNav.deadline)}
                </span>
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2 bg-gray-200 p-2 rounded-md">
                        <Link size={16} className="text-gray-500" />
                        <input
                            type="text"
                            value={interviewResponseURL}
                            readOnly
                            className="flex-grow bg-transparent text-sm text-gray-700 focus:outline-none"
                        />
                        <button
                            onClick={handleCopyClick}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-300 ${
                                isCopied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                            } hover:opacity-90`}
                        >
                            {isCopied ? '✔︎ 完了' : 'コピー'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientsideThemeCard;
