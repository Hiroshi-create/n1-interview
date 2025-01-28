"use client";

import { SidebarInset } from '@/context/components/ui/sidebar'

export default function DescriptionDetailLayout({
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