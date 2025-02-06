"use client"

import { useEffect, useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronDown, LogOut, Plus, User as UserIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "../button"
import { useAppsContext } from "@/context/AppContext"
import LoadingIcons from "react-loading-icons"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../../../../../firebase"
import { User } from "@/stores/User"
import { useRouter } from "next/navigation"
import { Avatar } from "@/components/ui/avatar"
import { AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"

export default function UserProfile() {
    const router = useRouter();
    const { handleLogout, user, userId, isUserAccount, setIsUserAccount } = useAppsContext();
    const [userData, setUserData] = useState<User | null>(null);
    const [organizationName, setOrganizationName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            if (userId) {
                try {
                    const userDocRef = doc(db, "users", userId);
                    const userDocSnap = await getDoc(userDocRef);
                    
                    if (userDocSnap.exists()) {
                        const userDataFromFirestore = userDocSnap.data() as User;
                        setUserData(userDataFromFirestore);

                        // 組織情報の取得
                        if (userDataFromFirestore.inOrganization && userDataFromFirestore.organizationId) {
                            const orgDocRef = doc(db, "clients", userDataFromFirestore.organizationId);
                            const orgDocSnap = await getDoc(orgDocRef);
                            if (orgDocSnap.exists()) {
                                setOrganizationName(orgDocSnap.data().organizationName);
                            }
                        }
                    } else {
                        console.log("ユーザーデータが見つかりません");
                    }
                } catch (error) {
                    console.error("データの取得中にエラーが発生しました:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchUserData();
    }, [userId]);

    if (loading || !user || !user.email || !userData) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <LoadingIcons.SpinningCircles className="w-4 h-4 text-primary" />
            </div>
        );
    }

    if (isUserAccount === null) {
        return <></>;
    }

    const changeOrganization = () => {
        if (isUserAccount) {
            setIsUserAccount(false);
            router.push(`/client-view/${userId}/Report`);
        } else if (!isUserAccount) {
            setIsUserAccount(true);
            router.push(`/auto-interview/${userId}`)
        } else {
            alert("アカウントの登録またはログインはしていますか？");
        }
    }

    const name = userData?.userNickname || "ユーザー";
    const avatarUrl = "/placeholder.svg";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Link href="#" className="hover-underline-animation text-sm md:text-base text-text focus:outline-none">
                    Account
                </Link>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0" align="end">
                {/* ユーザー情報セクション */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center space-x-4 mr-4">
                        {isUserAccount ? (
                            <>
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={avatarUrl} alt={name} />
                                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-xl font-semibold mb-0">Hi, {name} ! </h2>
                                    <p className="text-sm text-muted-foreground">{userData?.email}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src="/placeholder.svg" alt="組織アカウント" />
                                    <AvatarFallback>{organizationName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm text-muted-foreground mt-2">組織</p>
                                    <h2 className="text-xl font-semibold">{organizationName}</h2>
                                </div>
                            </>
                        )}
                    </div>
                    {/* <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-gray-100 rounded-full"
                        onClick={() => {
                            // Handle close
                        }}
                    >
                        <ChevronDown className="h-5 w-5" />
                    </Button> */}
                </div>

                {/* 組織アカウント情報 */}
                {userData.inOrganization && userData.organizationId && organizationName && (
                    <>
                        <div className="px-6 py-3">
                            <div className="shadow-md rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-100 transition-colors duration-200"
                                    onClick={changeOrganization}
                                >
                                    {isUserAccount ? (
                                        <>
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src="/placeholder.svg" alt="組織アカウント" />
                                                <AvatarFallback>{organizationName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col items-start">
                                                <p className="text-sm font-semibold text-gray-800">{organizationName}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={avatarUrl} alt={name} />
                                                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col items-start">
                                                <p className="text-sm font-semibold text-gray-800 text-left">{name}</p>
                                                <p className="text-xs text-muted-foreground">{userData?.email}</p>
                                            </div>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* アカウント操作メニュー */}
                <div className="px-2 pt-2 pb-1">
                    {/* <DropdownMenuItem className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 rounded-md transition-colors duration-200">
                        <Plus className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium">別のアカウントを追加</span>
                    </DropdownMenuItem> */}
                    <DropdownMenuItem
                        className="flex items-center gap-3 px-8 py-3 hover:bg-gray-100 rounded-md transition-colors duration-200"
                        onSelect={handleLogout}
                    >
                        <LogOut className="h-5 w-5 mr-2 text-gray-600" />
                        <span className="text-sm font-medium">サインアウト</span>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
