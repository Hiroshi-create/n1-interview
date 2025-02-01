"use client";

import { SidebarInset } from '@/context/components/ui/sidebar/sidebar'

export default function ThemeDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarInset className="flex-1 w-full bg-background text-text overflow-auto">
      {children}
    </SidebarInset>
  )
}