"use client";

import { Sidebar } from '@/app/components/clients/Sidebar'
import { SidebarInset, SidebarProvider } from '@/context/components/ui/sidebar'

export default function ClientViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar />
        <SidebarInset className="flex-1 w-full bg-[#202124] text-white overflow-auto">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
