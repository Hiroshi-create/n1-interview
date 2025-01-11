// import ClientViewContent from "./ClientViewContent";

// export default function ClientViewPage() {
//   return <ClientViewContent />;
// }










"use client";

import { Sidebar } from '@/app/components/clients/Sidebar'
import { SidebarInset, SidebarProvider } from '@/context/components/ui/sidebar'
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react'

const ClientView = () => {

  // 遷移先のURLをローカルストレージに保存
  const pathname = usePathname();
  useEffect(() => {
    const saveLastVisitedUrl = (url: string) => {
      localStorage.setItem('lastVisitedUrl', url);
    };
    if (pathname) {
      saveLastVisitedUrl(pathname);
    }
  }, [pathname]);

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="bg-[#202124] text-white">
        <div className="flex h-full items-center gap-2 border-b border-neutral-800 px-4">
          <h1 className="text-xl font-semibold">Functions</h1>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 rounded-lg border border-neutral-800">
            <p className="text-lg">最初のデプロイを待機しています</p>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              手順
            </button>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ClientView