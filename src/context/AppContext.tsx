// "use client";

// import { onAuthStateChanged, User } from "firebase/auth";
// import { createContext, ReactNode, useContext, useEffect, useState } from "react";
// import { auth } from "../../firebase";
// import { useRouter } from "next/navigation";

// type AppProviderProps = {
//     children: ReactNode;
// }

// type AppContextType = {
//     user: User | null;
//     userId: string | null,
//     setUser: React.Dispatch<React.SetStateAction<User | null>>;
//     selectedThemeId: string | null,
//     setSelectedThemeId: React.Dispatch<React.SetStateAction<string | null>>;
//     selectThemeName: string | null,
//     setSelectThemeName: React.Dispatch<React.SetStateAction<string | null>>;
//     resetContext: () => void;
//     getCookie: (name: string) => string | null;
//     setCookie: (name: string, value: string, maxAge: number) => void;
//     deleteCookie: (name: string) => void;
// }

// // AppContextをエクスポート
// export const AppContext = createContext<AppContextType>({
//     user: null,
//     userId: null,
//     setUser: () => {},
//     selectedThemeId: null,
//     setSelectedThemeId: () => {},
//     selectThemeName: null,
//     setSelectThemeName: () => {},
//     resetContext: () => {},
//     getCookie: () => null,
//     setCookie: () => {},
//     deleteCookie: () => {},
// });

// // Cookieを取得する関数
// function getCookie(name: string): string | null {
//     const cookies = document.cookie.split(';');
//     for (let cookie of cookies) {
//       const [cookieName, cookieValue] = cookie.trim().split('=');
//       if (cookieName === name) {
//         return decodeURIComponent(cookieValue);
//       }
//     }
//     return null;
// }

// // Cookieを設定する関数
// function setCookie(name: string, value: string, maxAge: number) {
//     document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
// }

// // Cookieを削除する関数
// function deleteCookie(name: string) {
//     document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
// }

// export function AppProvider({ children }: AppProviderProps) {
//     const [user, setUser] = useState<User | null>(null);
//     const [userId, setUserId] = useState<string | null>(null);
//     const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
//     const [selectThemeName, setSelectThemeName] = useState<string | null>(null);
//     const router = useRouter();

//     useEffect(() => {
//         const unsubscribe = onAuthStateChanged(auth, (newUser) => {
//             setUser(newUser);
//             setUserId(newUser ? newUser.uid : null)

//             if(!newUser) {
//                 setCookie('lastVisitedPage', window.location.href, 3600);
//                 router.push("/home/");
//             } else {
//                 const lastVisitedPage = getCookie('lastVisitedPage');
//                 if (lastVisitedPage) {
//                     deleteCookie('lastVisitedPage');
//                     router.push(lastVisitedPage);
//                 } else {
//                     router.push(`/auto-interview/${newUser.uid}`);
//                 }
//             }
//         });

//         return () => {
//             unsubscribe();
//         }
//     }, [router]);

//     const resetContext = () => {
//         setSelectedThemeId(null);
//         setSelectThemeName(null);
//     };

//     return (
//         <AppContext.Provider
//             value={{ 
//                 user, 
//                 userId, 
//                 setUser, 
//                 selectedThemeId, 
//                 setSelectedThemeId, 
//                 selectThemeName, 
//                 setSelectThemeName,
//                 resetContext,
//                 getCookie,
//                 setCookie,
//                 deleteCookie,
//             }}
//         >
//             {children}
//         </AppContext.Provider>
//     )
// }

// export function useAppContext() {
//     return useContext(AppContext);
// }






























"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { auth } from "../../firebase";
import { useRouter } from "next/navigation";

type AppProviderProps = {
    children: ReactNode;
}

type AppContextType = {
    user: User | null;
    userId: string | null,
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    selectedThemeId: string | null,
    setSelectedThemeId: React.Dispatch<React.SetStateAction<string | null>>;
    selectThemeName: string | null,
    setSelectThemeName: React.Dispatch<React.SetStateAction<string | null>>;
    resetContext: () => void;
}

const AppContext = createContext<AppContextType>({
    user: null,
    userId: null,
    setUser: () => {},
    selectedThemeId: null,
    setSelectedThemeId: () => {},
    selectThemeName: null,
    setSelectThemeName: () => {},
    resetContext: () => {},
});

export function AppProvider({ children }: AppProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [selectThemeName, setSelectThemeName] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (newUser) => {
            setUser(newUser);
            setUserId(newUser ? newUser.uid : null)

            if(!newUser) {
                router.push("/home/");
            } else {
                router.push(`/auto-interview/${newUser.uid}`);
            }
        });

        return () => {
            unsubscribe();
        }
    }, []);

    const resetContext = () => {
        setSelectedThemeId(null);
        setSelectThemeName(null);
    };

    return (
        <AppContext.Provider
            value={{ 
                user, 
                userId, 
                setUser, 
                selectedThemeId, 
                setSelectedThemeId, 
                selectThemeName, 
                setSelectThemeName,
                resetContext
            }}
        >
            {children}
        </AppContext.Provider>
    )
}

export function useAppsContext() {
    return useContext(AppContext); 
}