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
      <div className="flex h-screen w-full bg-background">
        {!isInterviewPage && <Sidebar />}
        <SidebarInset className={`flex-1 w-full bg-background overflow-auto ${isInterviewPage ? 'ml-0' : 'py-8 text-text'}`}>
          {isInterviewPage ? (
            children
          ) : (
            <main className="container mx-auto py-8 px-4">
              <div className="bg-white shadow-md rounded-lg p-6">
                {children}
              </div>
            </main>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
