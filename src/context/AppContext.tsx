"use client";

import { multiFactor, onAuthStateChanged, User } from "firebase/auth";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { doc, DocumentReference, getDoc } from "firebase/firestore";
import { interview_phases, operation_check_phases } from "./components/lists";

type AppProviderProps = {
  children: ReactNode;
}

type AppContextType = {
  handleLogout: () => Promise<void>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  userId: string | null,
  setUserId: React.Dispatch<React.SetStateAction<string | null>>,
  selectedInterviewId: string | null,
  setSelectedInterviewId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedThemeId: string | null,
  setSelectedThemeId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedInterviewRef: DocumentReference | null,
  setSelectedInterviewRef: React.Dispatch<React.SetStateAction<DocumentReference | null>>;
  selectedThemeRef: DocumentReference | null,
  setSelectedThemeRef: React.Dispatch<React.SetStateAction<DocumentReference | null>>;
  selectThemeName: string | null,
  setSelectThemeName: React.Dispatch<React.SetStateAction<string | null>>;
  isOperationCheck: boolean;
  setIsOperationCheck: React.Dispatch<React.SetStateAction<boolean>>;
  micPermission: boolean | null;
  setMicPermission: React.Dispatch<React.SetStateAction<boolean | null>>;
  requestMicPermission: () => Promise<boolean>;
  hasInteracted: boolean;
  setHasInteracted: React.Dispatch<React.SetStateAction<boolean>>;
  isInterviewCollected: boolean;
  setIsInterviewCollected: React.Dispatch<React.SetStateAction<boolean>>;
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  audioContext: AudioContext | null;
  initializeAudioContext: () => Promise<void>;
  operationCheckPhases: { template: string; text: string; isChecked: boolean; type: string }[];
  setOperationCheckPhases: React.Dispatch<React.SetStateAction<{ template: string; text: string; isChecked: boolean; type: string }[]>>;
  resetOperationCheckPhases: () => void;
  updateOperationCheckPhases: (index: number, isChecked: boolean) => void;
  remainingTimeGetter: (() => number | null) | null;
  setRemainingTimeGetter: React.Dispatch<React.SetStateAction<(() => number | null) | null>>;

  // 仮
  interviewPhases: { template: string; text: string; isChecked: boolean; type: string }[];
  setInterviewPhases: React.Dispatch<React.SetStateAction<{ template: string; text: string; isChecked: boolean; type: string }[]>>;
  resetInterviewPhases: () => void;
  updateInterviewPhases: (updates: {index: number; isChecked: boolean;}[]) => void;

  isUserAccount: boolean | null;
  setIsUserAccount: React.Dispatch<React.SetStateAction<boolean | null>>;

  checkMFAStatus: (user: User) => Promise<void>;

  resetContext: () => void;
}

const AppContext = createContext<AppContextType>({
  handleLogout: async () => {},
  user: null,
  setUser: () => {},
  userId: null,
  setUserId: () => {},
  selectedInterviewId: null,
  setSelectedInterviewId: () => {},
  selectedThemeId: null,
  setSelectedThemeId: () => {},
  selectedInterviewRef: null,
  setSelectedInterviewRef: () => {},
  selectedThemeRef: null,
  setSelectedThemeRef: () => {},
  selectThemeName: null,
  setSelectThemeName: () => {},
  micPermission: null,
  setMicPermission: () => {},
  isOperationCheck: false,
  setIsOperationCheck: () => {},
  requestMicPermission: async () => false,
  hasInteracted: false,
  setHasInteracted: () => {},
  isInterviewCollected: false,
  setIsInterviewCollected: () => {},
  isMenuOpen: true,
  setIsMenuOpen: () => {},
  audioContext: null,
  initializeAudioContext: async () => {},
  operationCheckPhases: [],
  setOperationCheckPhases: () => {},
  resetOperationCheckPhases: () => {},
  updateOperationCheckPhases: () => {},
  remainingTimeGetter: null,
  setRemainingTimeGetter: () => {},

  // 仮
  interviewPhases: [],
  setInterviewPhases: () => {},
  resetInterviewPhases: () => {},
  updateInterviewPhases: () => {},

  isUserAccount: null,
  setIsUserAccount: () => {},

  checkMFAStatus: async () => {},

  resetContext: () => {},
});

const saveLastVisitedUrl = (url: string) => {
  localStorage.setItem('lastVisitedUrl', url);
};

const getLastVisitedUrl = () => {
  return localStorage.getItem('lastVisitedUrl');
};

export function AppProvider({ children }: AppProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedInterviewRef, setSelectedInterviewRef] = useState<DocumentReference | null>(null);
  const [selectedThemeRef, setSelectedThemeRef] = useState<DocumentReference | null>(null);
  const [selectThemeName, setSelectThemeName] = useState<string | null>(null);
  const [isOperationCheck, setIsOperationCheck] = useState<boolean>(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [isInterviewCollected, setIsInterviewCollected] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [operationCheckPhases, setOperationCheckPhases] = useState(operation_check_phases);
  const [remainingTimeGetter, setRemainingTimeGetter] = useState<(() => number | null) | null>(null);
  const [interviewPhases, setInterviewPhases] = useState(interview_phases);  // 仮
  const [isUserAccount, setIsUserAccount] = useState<boolean | null>(null);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      resetContext();
      router.push("/home/");
    } catch (error) {
      router.push("/home/");
      console.error("ログアウトエラー:", error);
    }
  };

  const resetOperationCheckPhases = () => {
    setOperationCheckPhases(operationCheckPhases.map(phase => ({ ...phase, isChecked: false })));
  };

  const updateOperationCheckPhases = (index: number, isChecked: boolean) => {  // 使われていない？
    setOperationCheckPhases(prevPhases => 
      prevPhases.map((phase, i) => 
        i === index ? { ...phase, isChecked } : phase
      )
    );
  };

  const resetInterviewPhases = () => {  // 仮
    setInterviewPhases(interviewPhases.map(phase => ({ ...phase, isChecked: false })));
  };

  const updateInterviewPhases = (updates: { index: number; isChecked: boolean }[]) => {  // 仮
    setInterviewPhases(prevPhases => 
      prevPhases.map((phase, i) => {
        const update = updates.find(u => u.index === i);
        return update ? { ...phase, isChecked: update.isChecked } : phase;
      })
    );
  };

  const initializeAudioContext = async () => {
    if (!audioContext) {
      try {
        const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (newAudioContext.state === 'suspended') {
          await newAudioContext.resume();
        }
        setAudioContext(newAudioContext);
      } catch (error) {
        console.error('AudioContext初期化エラー:', error);
      }
    }
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission(true);
      return true;
    } catch (error) {
      console.error("マイク許可エラー:", error);
      setMicPermission(false);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
      setUser(newUser);
      setUserId(newUser ? newUser.uid : null);
      if (newUser) {
        // ユーザーがログインしている場合の処理
        await checkMFAStatus(newUser);
        // router.push(`/home`);
      } else {
        // ユーザーがログアウトしている場合の処理
        // router.push(`/home`);
      }
    });
  
    // クリーンアップ関数
    return () => {
      unsubscribe();
    }
  }, []);

  const checkMFAStatus = async (newUser: User) => {
    try {
      const lastVisitedUrl = getLastVisitedUrl();
      const mfaEnabled = multiFactor(newUser).enrolledFactors.length > 0;
      const currentPath = window.location.pathname;
      
      if (mfaEnabled) {
        // MFAが有効な場合、ユーザーを認証済みとして扱う
        if (lastVisitedUrl) {
          if (currentPath.startsWith('/auto-interview')) {
            setIsUserAccount(true);
          } else if (currentPath.startsWith('/client-view')) {
            setIsUserAccount(false);
          }
          router.push(lastVisitedUrl);
        } else {
          const userDoc = await getDoc(doc(db, "users", newUser.uid));
          const userData = userDoc.data();
          if (userData && userData.inOrganization) {
            // router.push(`/client-view/${newUser.uid}/Report`);
          } else {
            router.push(`/auto-interview/${newUser.uid}`);
          }
        }
      } else {
        // MFAが無効な場合、TOTP設定画面に誘導
        if (newUser.tenantId === null) {
          // テナントに属さないユーザー
          setIsUserAccount(true);
          router.push(`/auto-interview/${newUser.uid}`);
        } else if (!isUserAccount) {

          // router.push('/clients/login');
        } else {
          router.push(`/auto-interview/${newUser.uid}`);
        }
      }
    } catch (error) {
      console.error('MFA状態の確認中にエラーが発生しました:', error);
      // エラー処理
    }
  };
  

  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, async (newUser) => {
  //     setUser(newUser);
  //     setUserId(newUser ? newUser.uid : null);
  //     const lastVisitedUrl = getLastVisitedUrl();

  //     const currentPath = window.location.pathname;
  //     if (currentPath.startsWith('/terms/')) {
  //       return;
  //     }
  
  //     if (newUser) {
  //       if (currentPath.startsWith('/auto-interview/guest-user')) {
  //         handleLogout();
  //         return;
  //       }
  //       if (lastVisitedUrl) {
  //         resetOperationCheckPhases();
  //         resetInterviewPhases();  // 仮
  //         if (currentPath.startsWith('/auto-interview/')) {
  //           setIsUserAccount(true);
  //         } else if (currentPath.startsWith('/client-view/')) {
  //           setIsUserAccount(false);
  //         }
  //         router.push(lastVisitedUrl);
  //       } else {
  //         const userDoc = await getDoc(doc(db, "users", newUser.uid));
  //         const userData = userDoc.data();
  //         if (userData && userData.inOrganization) {
  //           // router.push(`/client-view/${newUser.uid}/Report`);
  //         } else {
  //           router.push(`/auto-interview/${newUser.uid}`);
  //         }
  //       }
  //     } else {
  //       if (currentPath.startsWith('/auto-interview/guest-user')) {
  //         return;
  //       } else {
  //         router.push(`/home`);
  //       }
  //     }
  //   });
  
  //   return () => {
  //     unsubscribe();
  //   }
  // }, []);

  const resetContext = () => {
    setSelectedInterviewId(null);
    setSelectedThemeId(null);
    setSelectThemeName(null);
    setSelectedInterviewRef(null);
    setSelectedThemeRef(null);
  };

  return (
    <AppContext.Provider
      value={{ 
        handleLogout,
        user, 
        setUser, 
        userId, 
        setUserId, 
        selectedInterviewId, 
        setSelectedInterviewId, 
        selectedThemeId, 
        setSelectedThemeId, 
        selectedInterviewRef, 
        setSelectedInterviewRef, 
        selectedThemeRef, 
        setSelectedThemeRef, 
        selectThemeName, 
        setSelectThemeName,
        isOperationCheck, 
        setIsOperationCheck, 
        micPermission,
        setMicPermission,
        requestMicPermission,
        hasInteracted,
        setHasInteracted,
        isInterviewCollected,
        setIsInterviewCollected,
        isMenuOpen,
        setIsMenuOpen,
        audioContext,
        initializeAudioContext,
        operationCheckPhases,
        setOperationCheckPhases,
        resetOperationCheckPhases,
        updateOperationCheckPhases,
        remainingTimeGetter,
        setRemainingTimeGetter,

        // 仮
        interviewPhases,
        setInterviewPhases,
        resetInterviewPhases,
        updateInterviewPhases,

        isUserAccount,
        setIsUserAccount,

        checkMFAStatus,

        resetContext,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppsContext() {
  return useContext(AppContext); 
}