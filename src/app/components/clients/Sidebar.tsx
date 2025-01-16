"use client"

import * as React from "react"
import Image from "next/image"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/context/components/ui/sidebar"
import Link from "next/link"
import { useAppsContext } from "@/context/AppContext"
import { analysisNav, mainNav } from "@/context/components/lists"
import { auth } from "../../../../firebase"
import { SlLogout } from "react-icons/sl"

export function Sidebar({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { user, userId } = useAppsContext();

  const getHref = (href: string) => {
    return userId ? href.replace('[userId]', userId) : '#';
  }

  const handleLogout = () => {
    auth.signOut();
  }

  return (
    <div className='bg-custom-blue h-full overflow-y-auto px-3 flex flex-col'>
      <div className='flex-grow' {...props}>
        <SidebarHeader className="h-16 border-b border-sidebar-border flex">
          <div className="px-4 py-2">
            <Image
              src="/logo/logo_yoko.svg"
              alt="感性分析 Logo"
              width={120}
              height={40}
              className="text-white"
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="bg-slate-800 rounded-md">
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link href={getHref(item.href)} className="w-full transition-all duration-200 ease-in-out hover:bg-slate-700 hover:text-white rounded-md p-2">
                        <div className="flex items-center space-x-2 px-2">
                          <item.icon className="h-5 w-5 text-slate-100" />
                          <span className="text-slate-100 text-lg font-medium">{item.title}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="bg-slate-800 rounded-md">
            <SidebarGroupLabel className="text-slate-100 text-base font-semibold px-2 py-2">感性分析</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analysisNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link href={getHref(item.href)} className="w-full transition-all duration-200 ease-in-out hover:bg-slate-700 hover:text-white rounded-md p-2">
                        <div className="flex items-center space-x-2 px-2">
                          <item.icon className="h-4 w-4 text-slate-100" />
                          <span className="text-slate-100 text-lg font-medium">{item.title}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </div>
      {user && (
        <div className='mb-2 p-4 text-slate-100 text-base font-medium bg-slate-800 rounded-md'>
          <span className="block truncate">{user.email}</span>
        </div>
      )}
      <div
        onClick={() => handleLogout()}
        className='text-lg flex items-center justify-center space-x-2 mb-4 cursor-pointer p-3 text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 ease-in-out'
      >
        <SlLogout className="h-5 w-5" />
        <span className="font-medium">ログアウト</span>
      </div>
    </div>
  )
}
