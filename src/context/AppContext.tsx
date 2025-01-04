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