"use client";

import { Sidebar } from '@/app/components/clients/Sidebar';
import { Header } from '@/context/components/ui/header/header';
import { SidebarInset, SidebarProvider } from '@/context/components/ui/sidebar/sidebar';
import { useAppsContext } from "@/context/AppContext";

export default function DashboardContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, isMenuOpen, setIsMenuOpen } = useAppsContext();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen w-full bg-background relative">
        <Header 
          className="h-14 border-b border-slate-700 flex flex-row items-center justify-between z-10"
          handleLogoClickPath={`/client-view/${userId}/Report`}
        />
        <div className="flex flex-1 overflow-hidden">
          <div className={`absolute top-0 left-0 h-full z-20 transition-all duration-300 ${isMenuOpen ? 'w-72' : 'w-0'}`}>
            <Sidebar toggleMenu={toggleMenu} />
          </div>
          <SidebarInset className={`flex-1 w-full bg-purple-100/80 text-text overflow-auto py-4 ${isMenuOpen ? 'ml-72' : 'ml-0'}`}>
            <main className="px-8 mb-16">
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
