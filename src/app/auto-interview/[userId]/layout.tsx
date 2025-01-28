"use client";

import { usePathname, useRouter } from 'next/navigation';
import Image from "next/image"
import Sidebar from '../../components/users/Sidebar'
import { SidebarInset, SidebarProvider } from '@/context/components/ui/sidebar'
import { useState } from 'react';
import { Header } from '@/context/components/ui/header';
import { useAppsContext } from '@/context/AppContext';
import { HiMenu } from 'react-icons/hi'

export default function AutoInterviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const { userId, isMenuOpen, setIsMenuOpen } = useAppsContext();
  const pathname = usePathname();
  const isInterviewPage = pathname?.includes('/interview');

  const handleLogoClick = () => {
    router.push(`/auto-interview/${userId}`);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen w-full bg-background relative">
        {!isInterviewPage && (
          <Header className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10">
            <div className="flex items-center">
              <button 
                onClick={toggleMenu}
                className="px-4 text-slate-600 hover:text-slate-800 transition-colors duration-200"
              >
                <HiMenu size={24} />
              </button>
              <Image
                src="/logo/logo_yoko.svg"
                alt="感性分析 Logo"
                width={120}
                height={40}
                className="select-none cursor-pointer"
                draggable="false"
                style={{ userSelect: 'none' }}
                onClick={handleLogoClick}
              />
            </div>
            <div className="flex-grow"></div>
          </Header>
        )}
        <div className="flex flex-1 overflow-hidden">
          <div className={`absolute top-0 left-0 h-full z-20 transition-all duration-300 ${isMenuOpen ? 'w-64' : 'w-0'}`}>
            <Sidebar toggleMenu={toggleMenu} />
          </div>
          <SidebarInset
            className={`flex-1 w-full bg-background overflow-auto ${isInterviewPage ? 'ml-0' : `py-8 text-text ${isMenuOpen ? 'ml-64' : 'ml-0'}`}`}
          >
            {isInterviewPage ? (
              children
            ) : (
              <main className="container mx-auto py-8 px-4">
                {children}
              </main>
            )}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
