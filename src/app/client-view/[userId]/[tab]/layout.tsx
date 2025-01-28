"use client";

import { Sidebar } from '@/app/components/clients/Sidebar'
import { SidebarInset, SidebarProvider } from '@/context/components/ui/sidebar'

export default function TabContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background text-text">
        <Sidebar />
        <SidebarInset className="flex-1 w-full bg-background text-text overflow-auto py-8">
          <main className="container mx-auto py-8 px-4">
            <div className="bg-white shadow-md rounded-lg p-6">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
