"use client"

import * as React from "react"
import Image from "next/image"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/context/components/ui/sidebar/sidebar"
import Link from "next/link"
import { useAppsContext } from "@/context/AppContext"
import { analysisNav, mainNav } from "@/context/components/lists"
import { auth } from "../../../../firebase"
import { useRouter } from "next/navigation"
import { MdClose } from "react-icons/md"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  toggleMenu: () => void;
}

export function Sidebar({ toggleMenu, ...props }: SidebarProps) {
  const router = useRouter()
  const { user, userId } = useAppsContext();

  const getHref = (href: string) => {
    return userId ? href.replace('[userId]', userId) : '#';
  }

  const handleLogoClick = () => {
    router.push(`/client-view/${userId}/Report`);
  }

  return (
    <div className='bg-slate-900 h-full overflow-y-auto flex flex-col border-r border-slate-700 shadow-lg'>
      <div className='flex-grow' {...props}>
        <SidebarHeader className="h-14 border-b border-slate-700 flex flex-row items-center justify-start">
          <button 
            onClick={toggleMenu}
            className="px-4 text-slate-300 hover:text-slate-100 transition-colors duration-200"
          >
            <MdClose size={24} />
          </button>
          <div className="flex-grow flex justify-center">
            <Image
              src="/logo/logo_yoko.svg"
              alt="感性分析 Logo"
              width={120}
              height={40}
              className="select-none cursor-pointer"
              draggable="false"
              style={{ userSelect: 'none' }}
              onClick={handleLogoClick}
            />
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">
          <SidebarGroup className="mb-4">
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <Link
                      href={getHref(item.href)}
                      className="w-full transition-all duration-200 ease-in-out hover:bg-slate-700 rounded-md p-2 flex items-center space-x-3"
                    >
                      <item.icon className="h-5 w-5 text-slate-300" />
                      <span className="text-slate-300 text-base font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
  
          <SidebarGroup>
            <SidebarGroupLabel className="text-slate-400 text-sm font-semibold px-2 mb-2">感性分析</SidebarGroupLabel>
            <SidebarMenu>
              {analysisNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <Link href={getHref(item.href)} className="w-full transition-all duration-200 ease-in-out hover:bg-slate-700 rounded-md p-2 flex items-center space-x-3">
                      <item.icon className="h-4 w-4 text-slate-300" />
                      <span className="text-slate-300 text-base font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </div>
    </div>
  );
}
