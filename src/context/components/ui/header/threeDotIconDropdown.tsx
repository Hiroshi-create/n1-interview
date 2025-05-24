"use client"

import { LucideIcon, MoreVertical } from "lucide-react";
import { Button } from "../button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { useAppsContext } from "@/context/AppContext";
import { Settings } from "lucide-react"
import { useRouter } from "next/navigation";
import { useMemo } from "react";

interface MenuItem {
  items: {
    icon?: LucideIcon;
    title: string;
    onClick: () => void;
    secondaryIcon?: LucideIcon;
  }[];
}

interface ThreeDotIconDropdownProps {
  menuItems: MenuItem[];
}

export default function ThreeDotIconDropdown({ menuItems }: ThreeDotIconDropdownProps) {
  const router = useRouter();
  const { user, userId } = useAppsContext();

  const extendedMenuItems = useMemo(() => {
    // 例: テスト用メールアドレス
    const TEST_EMAIL = "hiroshi@kanseibunseki.com";
    if (user?.email === TEST_EMAIL) {
      return [
        ...menuItems,
        {
          items: [
            {
              icon: Settings,
              title: "テストチャット",
              onClick: () => {
                router.push(`/client-view/${userId}/test-chat`);
              },
            },
          ],
        },
      ];
    }
    return menuItems;
  }, [menuItems, user?.email]);

  const renderMenuItems = (items: MenuItem[]) => {
    return items.map((item, index) => (
      <div key={index}>
        {item.items.map((subItem, subIndex) => (
          <DropdownMenuItem
            key={subIndex}
            className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            onSelect={(event) => {
              event.preventDefault();
              subItem.onClick();
            }}
          >
            <div className="flex items-center">
              {subItem.icon && <subItem.icon className="mr-2 h-4 w-4 text-gray-500" />}
              <span>{subItem.title}</span>
            </div>
            {subItem.secondaryIcon && <subItem.secondaryIcon className="ml-2 h-4 w-4 text-gray-500" />}
          </DropdownMenuItem>
        ))}
        {index < items.length - 1 && <DropdownMenuSeparator className="my-1 h-px bg-gray-200" />}
      </div>
    ));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="p-2 text-slate-600 hover:text-slate-800 transition-colors duration-200 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-0"
        >
          <MoreVertical size={24} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        {renderMenuItems(extendedMenuItems)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
