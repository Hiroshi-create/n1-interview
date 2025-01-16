"use client";

import { useParams, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import PatternA from '../contents/analysisNav/PatternA';
import PatternB from '../contents/analysisNav/PatternB';
import PatternC from '../contents/analysisNav/PatternC';
import PatternD from '../contents/analysisNav/PatternD';
import AddTheme from '../contents/mainNav/AddTheme';
import Report from '../contents/mainNav/Report';

const TabContent = () => {
  const pathname = usePathname();
  const params = useParams();
  const tab = params.tab as string;

  // 遷移先のURLをローカルストレージに保存
  useEffect(() => {
    const saveLastVisitedUrl = (url: string) => {
      localStorage.setItem('lastVisitedUrl', url);
    };
    if (pathname) {
      saveLastVisitedUrl(pathname);
    }
  }, [pathname]);

  const renderContent = () => {
    switch (tab) {
      case 'AddTheme':
        return <AddTheme />;
      case 'Report':
        return <Report />;
      case 'patternA':
        return <PatternA />;
      case 'patternB':
        return <PatternB />;
      case 'patternC':
        return <PatternC />;
      case 'patternD':
        return <PatternD />;
      default:
        return <Report />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-neutral-700 px-4 py-3">
        <h1 className="text-xl font-semibold">{tab}</h1>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
};

export default TabContent;
