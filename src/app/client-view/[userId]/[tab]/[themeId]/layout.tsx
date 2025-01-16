"use client";

import { SidebarInset } from '@/context/components/ui/sidebar'

export default function ThemeDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarInset className="flex-1 w-full bg-[#202124] text-white overflow-auto">
        {children}
    </SidebarInset>
  )
}
