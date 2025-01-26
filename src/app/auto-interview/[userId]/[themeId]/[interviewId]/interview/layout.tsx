"use client";

import { SidebarInset } from '@/context/components/ui/sidebar'

export default function AutoInterviewDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarInset className="flex-1 w-full bg-[#202124] text-white overflow-auto ml-0 relative">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/InterviewBackground.png')",
          backgroundPosition: "80% 100%"
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </SidebarInset>
  )
}
