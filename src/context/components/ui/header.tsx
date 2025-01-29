import * as React from "react";
import { cn } from "@/context/lib/utils";
import { useRouter } from "next/navigation";
import { useAppsContext } from "@/context/AppContext";
import { Menu } from 'lucide-react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "./button";

const Header = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { handleLogoClickPath: string }
>(({ className, handleLogoClickPath, ...props }, ref) => {
  const router = useRouter();
  const { handleLogout, user, isMenuOpen, setIsMenuOpen } = useAppsContext();

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
          <button
            onClick={toggleMenu}
            className="px-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
          >
            <Menu size={24} />
          </button>
          <Image
            src="/logo/logo_yoko.svg"
            alt="感性分析 Logo"
            width={120}
            height={40}
            className="select-none cursor-pointer px-2"
            draggable="false"
            style={{ userSelect: "none" }}
            onClick={handleLogoClick}
          />
        </div>

        {/* 右側のリンクとボタン */}
        <div className="flex items-center gap-6">
          {/* ログインしていない場合 */}
          {!user ? (
            <>
              <div className="flex items-center gap-4 text-sm md:text-base text-text">
                <Link href="#" className="hover-underline-animation">
                  Contact
                </Link>
                <span>|</span>
                <Link href="#" className="hover-underline-animation">
                  Support
                </Link>
                <span>|</span>
                <Link href="/users/login" className="hover-underline-animation">
                  Login
                </Link>
              </div>
              <Link href="/users" className="hover-underline-animation">
                <Button className="bg-background text-text hover:bg-primary transition-all duration-300 text-sm md:text-base">
                  SIGN UP FOR FREE
                </Button>
              </Link>
            </>
          ) : (
            // ログインしている場合
            <>
              <div className="flex items-center gap-4 text-sm md:text-base text-text">
                <Link href="#" className="hover-underline-animation">
                  Dashboard
                </Link>
                <span>|</span>
                <Link href="#" className="hover-underline-animation">
                  Account
                </Link>
              </div>
              <Button
                onClick={handleLogout}
                className="bg-background text-text hover:bg-primary transition-all duration-300 text-sm md:text-base hover-underline-animation"
              >
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
Header.displayName = "Header";

export { Header };
