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
    <div className='bg-custom-blue h-full overflow-y-auto px-5 flex flex-col'>
      <div className='flex-grow' {...props}>
        <SidebarHeader className="h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-4">
            <Image
              src="/logo/logo_yoko.svg"
              alt="感性分析 Logo"
              width={120}
              height={120}
              className="text-white"
            />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link href={getHref(item.href)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>感性分析</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analysisNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link href={getHref(item.href)}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
        <div className='mb-2 p-4 text-slate-100 text-lg font-medium'>
          {user.email}
        </div>
      )}
      <div
        onClick={() => handleLogout()}
        className='text-lg flex items-center justify-evenly mb-2 cursor-pointer p-4 text-slate-100 hover:bg-slate-700 duration'
      >
        <SlLogout />
        <span>ログアウト</span>
      </div>
    </div>
  )
}
