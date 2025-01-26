"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { useRouter } from "next/navigation";
import { doc, DocumentReference, getDoc } from "firebase/firestore";
import { interview_phases, operation_check_phases } from "./components/lists";

type AppProviderProps = {
  children: ReactNode;
}

type AppContextType = {
  user: User | null;
  userId: string | null,
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
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
  audioContext: AudioContext | null;
  initializeAudioContext: () => Promise<void>;
  operationCheckPhases: { template: string; text: string; isChecked: boolean; type: string }[];
  setOperationCheckPhases: React.Dispatch<React.SetStateAction<{ template: string; text: string; isChecked: boolean; type: string }[]>>;
  resetOperationCheckPhases: () => void;
  updateOperationCheckPhases: (index: number, isChecked: boolean) => void;

  // 仮
  interviewPhases: { template: string; text: string; isChecked: boolean; type: string }[];
  setInterviewPhases: React.Dispatch<React.SetStateAction<{ template: string; text: string; isChecked: boolean; type: string }[]>>;
  resetInterviewPhases: () => void;
  updateInterviewPhases: (index: number, isChecked: boolean) => void;

  resetContext: () => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  userId: null,
  setUser: () => {},
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
  isOperationCheck: true,
  setIsOperationCheck: () => {},
  requestMicPermission: async () => false,
  hasInteracted: false,
  setHasInteracted: () => {},
  audioContext: null,
  initializeAudioContext: async () => {},
  operationCheckPhases: [],
  setOperationCheckPhases: () => {},
  resetOperationCheckPhases: () => {},
  updateOperationCheckPhases: () => {},

  // 仮
  interviewPhases: [],
  setInterviewPhases: () => {},
  resetInterviewPhases: () => {},
  updateInterviewPhases: () => {},

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
  const [isOperationCheck, setIsOperationCheck] = useState<boolean>(true);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [operationCheckPhases, setOperationCheckPhases] = useState(operation_check_phases);
  const [interviewPhases, setInterviewPhases] = useState(interview_phases);  // 仮

  const resetOperationCheckPhases = () => {
    setOperationCheckPhases(operationCheckPhases.map(phase => ({ ...phase, isChecked: false })));
  };

  const updateOperationCheckPhases = (index: number, isChecked: boolean) => {
    setOperationCheckPhases(prevPhases => 
      prevPhases.map((phase, i) => 
        i === index ? { ...phase, isChecked } : phase
      )
    );
  };

  const resetInterviewPhases = () => {  // 仮
    setInterviewPhases(interviewPhases.map(phase => ({ ...phase, isChecked: false })));
  };

  const updateInterviewPhases = (index: number, isChecked: boolean) => {  // 仮
    setInterviewPhases(prevPhases => 
      prevPhases.map((phase, i) => 
        i === index ? { ...phase, isChecked } : phase
      )
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
  
      if (!newUser) {
        router.push("/home/");
      } else {
        const lastVisitedUrl = getLastVisitedUrl();
        if (lastVisitedUrl) {
          resetOperationCheckPhases();
          resetInterviewPhases();  // 仮
          setIsOperationCheck(false);
          router.push(lastVisitedUrl);
        } else {
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
    setSelectedThemeId(null);
    setSelectThemeName(null);
    setSelectedInterviewRef(null);
    setSelectedThemeRef(null);
  };

  return (
    <AppContext.Provider
      value={{ 
        user, 
        userId, 
        setUser, 
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
        audioContext,
        initializeAudioContext,
        operationCheckPhases,
        setOperationCheckPhases,
        resetOperationCheckPhases,
        updateOperationCheckPhases,

        // 仮
        interviewPhases,
        setInterviewPhases,
        resetInterviewPhases,
        updateInterviewPhases,

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