"use client";

import { usePathname } from 'next/navigation';
import Sidebar from '../../../components/users/Sidebar'
import { SidebarInset, SidebarProvider } from '@/context/components/ui/sidebar/sidebar';
import { Header } from '@/context/components/ui/header/header';
import { useAppsContext } from '@/context/AppContext';

export default function AutoInterviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isMenuOpen, setIsMenuOpen } = useAppsContext();
  const pathname = usePathname();
  const isInterviewPage = pathname?.includes('/interview');

  // setIsMenuOpen(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen w-full bg-background relative">
        {!isInterviewPage && (
          <Header 
            className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10"
            handleLogoClickPath={`/home`}
          />
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
