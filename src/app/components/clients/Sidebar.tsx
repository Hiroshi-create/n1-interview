"use client"

import * as React from "react"
import Image from "next/image"
import { Database, FileCode2, FlaskConical, Home, KeyRound, LayoutDashboard, Server, Settings, Sparkles, Users } from 'lucide-react'

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

// Navigation items data
const mainNav = [
  {
    title: "プロジェクトの概要",
    icon: Home,
    href: "#",
  },
  {
    title: "生成 AI",
    icon: Sparkles,
    href: "#",
  },
  {
    title: "Build with Gemini",
    icon: FlaskConical,
    href: "#",
  },
]

const projectNav = [
  {
    title: "Authentication",
    icon: Users,
    href: "#",
  },
  {
    title: "Firestore Database", 
    icon: Database,
    href: "#",
  },
  {
    title: "Hosting",
    icon: Server,
    href: "#",
  },
  {
    title: "Functions",
    icon: FileCode2,
    href: "#",
    isActive: true,
  },
]

export function Sidebar({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
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
                  <SidebarMenuButton asChild>
                    <a href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>プロジェクト ショートカット</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <a href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>プロダクトのカテゴリ</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <LayoutDashboard className="h-4 w-4" />
                  <span>構築</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="h-4 w-4" />
                  <span>実行</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <KeyRound className="h-4 w-4" />
                  <span>分析</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </div>
  )
}
