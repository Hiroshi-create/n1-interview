"use client";

import { usePathname } from 'next/navigation';
import Sidebar from '../../components/users/Sidebar'
import { SidebarInset, SidebarProvider } from '@/context/components/ui/sidebar'

export default function AutoInterviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const isInterviewPage = pathname?.includes('/interview');

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {!isInterviewPage && <Sidebar />}
        <SidebarInset className={`flex-1 w-full bg-[#202124] text-white overflow-auto ${isInterviewPage ? 'ml-0' : ''}`}>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
