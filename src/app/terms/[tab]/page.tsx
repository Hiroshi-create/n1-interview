"use client";

import { useParams } from 'next/navigation';
import { termsTabConfig } from '@/context/components/lists'

const TabContent = () => {
  const params = useParams();
  const tab = (params.tab as string) || 'PrivacyPolicy';

  const getTabContent = () => {
    switch (tab) {
      case 'PrivacyPolicy':
        return termsTabConfig.find(config => config.key === 'PrivacyPolicy');
      case 'TermsOfService':
        return termsTabConfig.find(config => config.key === 'TermsOfService');
      default:
        return termsTabConfig[0];
    }
  };

  const { title, component: Content } = getTabContent() || termsTabConfig[0];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-neutral-700 px-4 py-3">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <Content />
      </div>
    </div>
  );
};

export default TabContent;
