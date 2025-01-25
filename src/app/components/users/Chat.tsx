"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo, useCallback } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAppsContext } from '@/context/AppContext';
import LoadingIcons from 'react-loading-icons';
import { Message } from '@/stores/Message';
import Bubble from '@/context/components/ui/bubble';
import { useRouter } from 'next/navigation';
import ConfirmationDialog from '@/context/components/ui/confirmationDialog';
import TwoChoices from '@/context/components/ui/twoChoices';

interface OperationCheckResponse {
  messages: Message[];
  phases: Phase[];
  operationCheckComplete?: boolean;
}

type ChatContextType = {
    chat: (message: string) => Promise<void>;
    messages: Message[];
    isLoading: boolean;
    cameraZoomed: boolean;
    setCameraZoomed: React.Dispatch<React.SetStateAction<boolean>>;
    isPaused: boolean;
    setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
    isTimerStarted: boolean;
    showTwoChoices: boolean;
    setShowTwoChoices: React.Dispatch<React.SetStateAction<boolean>>;
    selectThemeName: string | undefined;
    loading: boolean;
    message: Message | null;
    onMessagePlayed: () => void;
    themeId: string | undefined;
    isThinking: boolean;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type ChatProviderProps = {
  children: ReactNode;
};

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const {
    selectedInterviewId,
    isOperationCheck,
    setIsOperationCheck,
    selectedInterviewRef,
    selectThemeName,
    operationCheckPhases,
    setOperationCheckPhases,
  } = useAppsContext();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInterviewInitialized, setIsInterviewInitialized] = useState(false);
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [showTwoChoices, setShowTwoChoices] = useState(false);

  useEffect(() => {
    if (isOperationCheck && !isInterviewInitialized && !isLoading && !isTimerStarted) {
      const initializeInterview = async () => {
        setIsLoading(true);
        try {
          await chat("インタビューを開始");
          setIsInterviewInitialized(true);
          setIsTimerStarted(true);
        } finally {
          setIsLoading(false);
        }
      };
      initializeInterview();
    }
  }, [isOperationCheck, isInterviewInitialized, isLoading]);

  useEffect(() => {
    let unsubscribe: () => void;
    if (selectedInterviewId && selectedInterviewRef) {
      const fetchMessages = async () => {
        try {
          const messagesCollectionRef = collection(selectedInterviewRef, "messages");
          const q = query(messagesCollectionRef, orderBy("createdAt"));
          unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map((doc) => doc.data() as Message);
            setMessages(newMessages);
            console.log('Messages:', JSON.stringify(newMessages, null, 2));
            // メッセージが空で初期化されていない場合、初期メッセージを送信
            if (newMessages.length === 0 && !isInitialized && !isOperationCheck && !isInterviewInitialized) {
              chat("初期メッセージ");
              setIsInitialized(true);
            } 
          }, (error) => {
            console.error("メッセージの取得中にエラーが発生しました:", error);
          });
        } catch (error) {
          console.error("メッセージの取得中にエラーが発生しました:", error);
        }
      };
      fetchMessages();
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedInterviewId, selectedInterviewRef, isOperationCheck]);

  const chat = useCallback(async (messageText: string) => {
    if (isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // 既存のリクエストをキャンセル
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setLoading(true);
    setIsThinking(true);

    try {
      if (!selectedInterviewRef) {
        throw new Error('インタビューが選択されていません');
      }

      if (!isOperationCheck) {
        console.log("--- 動作確認中です。 ---")
        const response = await fetch('/api/operation_check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText,
            interviewRefPath: selectedInterviewRef.path,
            phases: operationCheckPhases, // 現在のoperationCheckPhasesを送信
          }),
        });
      
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `サーバーエラー: ${response.status}`);
        }
      
        const data: OperationCheckResponse = await response.json();
      
        if (data.operationCheckComplete) {
          setIsOperationCheck(true);
          return;
        }
      
        if (data.messages && data.messages.length > 0) {
          setMessage(data.messages[0]);
          setOperationCheckPhases(data.phases); // 返ってきたphasesで更新
          
          // 現在のフェーズのタイプに応じてshowTwoChoicesを設定
          const currentPhase = data.phases.find(phase => !phase.isChecked);
          if (currentPhase && currentPhase.type === "two_choices") {
            setShowTwoChoices(true);
          } else {
            setShowTwoChoices(false);
          }
        } else {
          throw new Error('サーバーからの応答が不正です');
        }
      } else {
        console.log("--- インタビューが始まりました。 ---")
        const response = await fetch('/api/interview_server', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: messageText, interviewRefPath: selectedInterviewRef.path }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `サーバーエラー: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log("data.interviewEnd : " + data.interviewEnd)
        if (data.interviewEnd) {
          console.log("レポート作成開始")
          setIsTimerStarted(false);
          // インタビュー終了時にレポート生成APIを呼び出す
          const reportResponse = await fetch('/api/report/individualReport', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ themeId: selectedInterviewId, interviewRefPath: selectedInterviewRef.path }),
          });

          if (!reportResponse.ok) {
            throw new Error('レポート生成に失敗しました');
          }

          const reportData = await reportResponse.json();
          console.log('生成されたレポート:', reportData.report);
          return;
        }
        
        if (data.messages && data.messages.length > 0) {
          setMessage(data.messages[0]);
        } else {
          throw new Error('サーバーからの応答が不正です');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('チャット処理中にエラーが発生しました:', error.message);
      } else {
        console.error('チャット処理中に予期せぬエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
      setLoading(false);
      setIsThinking(false);
    }
  }, [isLoading, selectedInterviewRef, isOperationCheck, operationCheckPhases]);
  
  const onMessagePlayed = useCallback(async () => {
    setMessage(null);
  }, []);

  return (
    <ChatContext.Provider value={{
      chat,
      messages,
      isLoading,
      cameraZoomed,
      setCameraZoomed,
      isPaused,
      setIsPaused,
      isTimerStarted,
      showTwoChoices,
      setShowTwoChoices,
      selectThemeName: selectThemeName ?? undefined,
      loading,
      message,
      onMessagePlayed,
      themeId: selectedInterviewId ?? undefined,
      isThinking,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatはChatProvider内で使用する必要があります");
  }
  return context;
};

const MessageBox: React.FC<{ message: Message; style: React.CSSProperties }> = ({ message, style }) => {
  return (
    <div className={`mb-4 flex ${message.sender === "user" ? "justify-start" : "justify-end"}`}>
      <Bubble
        direction={message.sender === "user" ? "bottom-l" : "bottom-r"}
        backgroundColor={message.sender === "user" ? "rgb(34, 197, 94)" : "rgb(59, 130, 246)"}
        textColor="white"
        maxWidth="300px"
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
      </Bubble>
    </div>
  );
};

const Chat: React.FC = () => {
  const router = useRouter();
  const { userId } = useAppsContext();
  const { messages, isLoading, selectThemeName, chat, showTwoChoices, setShowTwoChoices } = useChat();
  const scrollDiv = useRef<HTMLDivElement>(null);
  const [visibleMessages, setVisibleMessages] = useState<{ message: Message; opacity: number }[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const handleScroll = useCallback(() => {
    if (scrollDiv.current) {
      const { scrollTop, clientHeight, scrollHeight } = scrollDiv.current;
      const visibleRange = clientHeight;

      const newVisibleMessages = reversedMessages.map((message, index) => {
        return { message, opacity: Math.max(0.05, Math.min(1)) }; // 最小透明度を0.2に設定
      });

      setVisibleMessages(newVisibleMessages);
    }
  }, [reversedMessages]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  useEffect(() => {
    if (scrollDiv.current) {
      scrollDiv.current.scrollTop = 0;
    }
  }, [messages]);

  useEffect(() => {
    if (dialogRef.current) {
      if (showConfirmation) {
        dialogRef.current.showModal();
      } else {
        dialogRef.current.close();
      }
    }
  }, [showConfirmation]);

  const handleConfirmation = () => {
    setShowConfirmation(!showConfirmation);
  };

  // ホームに戻る
  const handleConfirmationResponse = (response: 'yes' | 'no') => {
    if (response === 'yes') {
      router.push(`/auto-interview/${userId}`);
    }
    setShowConfirmation(false);
  };

  // 2択の質問
  const handleSelect = (option: string) => {
    console.log(`Selected option: ${option}`);
    const isChecked = option === "はい";
    chat(isChecked ? "はい" : "いいえ");
    setShowTwoChoices(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-gray-600 bg-opacity-40 z-10 p-4 shadow-md flex items-center">
        <button 
          onClick={handleConfirmation}
          className="mr-6 text-white hover:text-gray-200 hover:bg-gray-700 transition-all duration-200 rounded-full p-2"
          aria-label="ホームに戻る"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        <ConfirmationDialog
          isOpen={showConfirmation}
          onClose={handleConfirmationResponse}
          title="確認"
          message="ホームに戻りますか？"
        />
        
        <h1 className="text-lg font-semibold text-white">{selectThemeName}</h1>
      </div>
      <div 
        className="flex-grow overflow-y-auto p-4 space-y-4 pb-[20vh]" 
        ref={scrollDiv} 
        onScroll={handleScroll}
      >
        <div className="space-y-16 min-h-full">
          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <LoadingIcons.Oval stroke="#000000" strokeOpacity={0.5} speed={0.75} />
            </div>
          )}
          {reversedMessages.filter((message, index, array) => {
            if (message.sender === "bot") {
              return index !== array.findIndex(m => m.sender === "bot");
            }
            return true;
          }).map((message, index) => (
            <MessageBox
              key={index}
              message={message}
              style={{
                opacity: visibleMessages[index]?.opacity || 1,
                transition: 'opacity 0.3s ease-in-out'
              }}
            />
          ))}
        </div>
      </div>

      <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="mb-auto mt-[10vh] mr-[10vw]">
          {messages && 
           messages.length > 0 && 
           messages[messages.length - 1].sender === "bot" && (
            <Bubble
              isCreatePortal={true}
              portalPosition={{ x: 0.28, y: -0.8 }}
              direction="bottom-r"
              backgroundColor="rgb(59, 130, 246)"
              textColor="white"
              maxWidth="560px"
            >
              <p className="text-lg leading-relaxed whitespace-pre-wrap break-words">
                {messages[messages.length - 1].text}
              </p>
            </Bubble>
          )}
        </div>
        {showTwoChoices && (
          <TwoChoices
            option1="はい"
            option2="いいえ"
            onSelect={handleSelect}
            position={{ x: 0, y: 0 }}
          />
        )}
      </div>
    </div>
  );
};

export default Chat;