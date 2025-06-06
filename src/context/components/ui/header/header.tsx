import * as React from "react";
import { cn } from "@/context/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useAppsContext } from "@/context/AppContext";
import { Brain, LogOut, Menu, MoreVertical } from 'lucide-react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "../button";
import ThreeDotIconDropdown from "./threeDotIconDropdown";
import { CreditCard, Settings, ExternalLink, FileText } from "lucide-react"
import UserProfile from "./userProfile";

const Header = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { handleLogoClickPath: string }
>(({ className, handleLogoClickPath, ...props }, ref) => {
  const router = useRouter();
  const pathname = usePathname();
  const { handleLogout, user, userId, isMenuOpen, setIsMenuOpen } = useAppsContext();

  const menuItems = [
    // {
    //   items: [
    //     { 
    //       icon: CreditCard, 
    //       title: "請求先アカウントの管理", 
    //       onClick: () => {
    //         console.log("請求先アカウントの管理ページへ遷移");
    //         // ここに遷移のロジックを追加
    //       }
    //     },
    //     { 
    //       icon: CreditCard, 
    //       title: "お支払い方法", 
    //       onClick: () => {
    //         console.log("お支払い方法ページへ遷移");
    //         // ここに遷移のロジックを追加
    //       }
    //     },
    //   ]
    // },
    {
      items: [
        { 
          icon: FileText, 
          title: "利用規約", 
          onClick: () => {
            window.open("/terms/TermsOfService", "_blank", "noopener,noreferrer");
          },
          secondaryIcon: ExternalLink,
        },
        { 
          icon: FileText, 
          title: "プライバシー", 
          onClick: () => {
            window.open("/terms/PrivacyPolicy", "_blank", "noopener,noreferrer");
          },
          secondaryIcon: ExternalLink,
        },
      ]
    },
    {
      items: [
        { 
          icon: CreditCard,
          title: "サブスクリプション", 
          onClick: () => {
            router.push(`/client-view/${userId}/subscriptions`);
          }
        }
      ]
    },
    {
      items: [
        { 
          icon: Settings, 
          title: "設定", 
          onClick: () => {
            router.push(`/client-view/client-preferences/${userId}`);
          }
        }
      ]
    },
    {
      items: [
        { 
          icon: Settings, 
          title: "ログアウト", 
          onClick: () => {
            handleLogout;
          }
        }
      ]
    },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogoClick = () => {
    router.push(handleLogoClickPath);
  };

  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-4", className)}
      {...props}
    >
      <div className="flex items-center justify-between w-full">
        {/* 左側のメニューアイコンとロゴ */}
        <div className="flex items-center">
          {user && (
            <button
              onClick={toggleMenu}
              className="p-2 mr-2 text-slate-600 hover:text-slate-800 transition-colors duration-200 rounded-full hover:bg-gray-300"
            >
              <Menu size={24} />
            </button>
          )}

          <div className="flex gap-6 md:gap-10">
            <Link href={handleLogoClickPath} className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-black" />
              <span className="inline-block text-xl font-bold">Auto N1 Interview</span>
            </Link>
          </div>
          
          {/* <Image
            src="/logo/logo_yoko.svg"
            alt="感性分析 Logo"
            width={120}
            height={40}
            className="select-none cursor-pointer px-2"
            draggable="false"
            style={{ userSelect: "none" }}
            onClick={handleLogoClick}
            priority
          /> */}
        </div>

        {/* 右側のリンクとボタン */}
        <div className="flex items-center gap-6">
          {/* ログインしていない場合 */}
          {!user ? (
            <>
              <div className="flex items-center gap-4 text-sm md:text-base text-text">
                <Link href="/users/login" className="hover-underline-animation">
                  Login
                </Link>
              </div>
              <Link href="/users" className="hover-underline-animation">
                <button className="bg-background text-text transition-all duration-300 text-sm md:text-base">
                  SIGN UP FOR FREE
                </button>
              </Link>
            </>
          ) : (
            // ログインしている場合
            <>
              <div className="flex items-center gap-4 text-sm md:text-base text-text">
                {pathname.startsWith('/client-view') && (
                  <>
                    <Link href={`/client-view/${userId}/dashboard`} className="hover-underline-animation">
                      Dashboard
                    </Link>
                    <span>|</span>
                  </>
                )}
                <UserProfile />
              </div>
              <ThreeDotIconDropdown menuItems={menuItems} />
            </>
          )}
        </div>
      </div>
    </div>
  );
});
Header.displayName = "Header";

export { Header };
