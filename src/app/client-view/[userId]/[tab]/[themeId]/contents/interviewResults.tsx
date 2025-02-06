"use client"

import { useState, useEffect } from "react";
import type { Theme } from "@/stores/Theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaLock } from "react-icons/fa";
import styled from 'styled-components';

const LockedTab = styled(TabsTrigger)`
  @keyframes horizontal-shake {
    0% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-3px); }
    100% { transform: translateX(0); }
  }

  &.locked {
    animation: horizontal-shake 0.4s ease-in-out;
    position: relative;
    
    &::after {
      content: "🔒 解放するにはプランアップグレードが必要です";
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.8rem;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }

    &:hover::after {
      opacity: 1;
    }
  }
`;

interface TabConfig {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface ComponentProps {
  theme: Theme;
  showKanseiAiMarketer: boolean;
  tabsConfig: TabConfig[];
  defaultTab?: string;
  className?: string;
}

const InterviewResults = ({
  theme,
  showKanseiAiMarketer,
  tabsConfig,
  defaultTab = "summary",
  className = "w-full max-w-4xl mx-auto p-4"
}: ComponentProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleTabChange = (value: string) => {
    if (value === 'kanseiAiMarketer' && !showKanseiAiMarketer) {
      if (!isAnimating) {
        setIsAnimating(true);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      }
      return;
    }
    setActiveTab(value);
    setIsFullScreen(value === 'kanseiAiMarketer');
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div className={`${className} ${isFullScreen ? 'fixed h-full inset-0 z-50 bg-black p-0' : ''}`}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList 
          className="grid w-full" 
          style={{
            gridTemplateColumns: `repeat(${tabsConfig.length}, minmax(0, 1fr))`
          }}
        >
          {tabsConfig.map((tab) => {
            const isKanseiTab = tab.value === 'kanseiAiMarketer';
            const isLocked = isKanseiTab && !showKanseiAiMarketer;

            return (
              <LockedTab
                key={tab.value}
                value={tab.value}
                data-theme={theme}
                aria-disabled={isLocked}
                className={`group text-sm truncate transition-all duration-300 relative overflow-hidden ${
                  isKanseiTab 
                    ? `bg-gradient-to-r from-indigo-600 via-pink-600 to-blue-600
                      ${activeTab === tab.value ? 'opacity-100' : 'opacity-90'}
                      shadow-lg hover:shadow-xl hover:opacity-100` 
                    : 'hover:bg-accent hover:text-accent-foreground'
                } ${isLocked && isAnimating ? 'locked' : ''}`}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                  }
                }}
              >
                <span className="relative z-10 flex items-center">
                  <span className={isKanseiTab ? 'text-white' : ''}>
                    {tab.label}
                  </span>
                  {isLocked && (
                    <span className="ml-2 text-white">
                      <FaLock className="w-3 h-3" />
                    </span>
                  )}
                </span>
                {isKanseiTab && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute -inset-2 bg-[length:200%_200%] bg-gradient-to-r from-indigo-600 via-pink-600 to-blue-600 animate-gradient-flow" />
                  </div>
                )}
              </LockedTab>
            )
          })}
        </TabsList>
        {tabsConfig.map((tab) => (
          <TabsContent 
            key={tab.value} 
            value={tab.value}
            className={isFullScreen ? "h-[calc(100vh-3rem)]" : ""}
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default InterviewResults;
