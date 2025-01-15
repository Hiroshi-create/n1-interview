"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { useRouter } from "next/navigation";
import { doc, DocumentReference, getDoc } from "firebase/firestore";

type AppProviderProps = {
  children: ReactNode;
}

type AppContextType = {
  user: User | null;
  userId: string | null,
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  selectedInterviewId: string | null,
  setSelectedInterviewId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedInterviewRef: DocumentReference | null,
  setSelectedInterviewRef: React.Dispatch<React.SetStateAction<DocumentReference | null>>;
  selectThemeName: string | null,
  setSelectThemeName: React.Dispatch<React.SetStateAction<string | null>>;
  resetContext: () => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  userId: null,
  setUser: () => {},
  selectedInterviewId: null,
  setSelectedInterviewId: () => {},
  selectedInterviewRef: null,
  setSelectedInterviewRef: () => {},
  selectThemeName: null,
  setSelectThemeName: () => {},
  resetContext: () => {},
});

// ページ遷移時に実行
const saveLastVisitedUrl = (url: string) => {
  localStorage.setItem('lastVisitedUrl', url);
};
  
// ログイン後やリロード時に実行
const getLastVisitedUrl = () => {
  return localStorage.getItem('lastVisitedUrl');
};

export function AppProvider({ children }: AppProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [selectedInterviewRef, setSelectedInterviewRef] = useState<DocumentReference | null>(null);
  const [selectThemeName, setSelectThemeName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
      setUser(newUser);
      setUserId(newUser ? newUser.uid : null);
  
      if (!newUser) {
        router.push("/home/");
      } else {
        const lastVisitedUrl = getLastVisitedUrl();
        if (lastVisitedUrl) {
          router.push(lastVisitedUrl);
        } else {
          // ユーザーの種類を判定
          const userDoc = await getDoc(doc(db, "users", newUser.uid));
          const userData = userDoc.data();
          if (userData && userData.inOrganization) {
            router.push(`/client-view/${newUser.uid}/Report`);
          } else {
            router.push(`/auto-interview/${newUser.uid}`);
          }
        }
      }
    });
  
    return () => {
      unsubscribe();
    }
  }, []);

  const resetContext = () => {
    setSelectedInterviewId(null);
    setSelectThemeName(null);
    setSelectedInterviewRef(null);
  };

  return (
    <AppContext.Provider
      value={{ 
        user, 
        userId, 
        setUser, 
        selectedInterviewId, 
        setSelectedInterviewId, 
        selectedInterviewRef, 
        setSelectedInterviewRef, 
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