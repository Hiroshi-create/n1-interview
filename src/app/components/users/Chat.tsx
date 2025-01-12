"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { useAppsContext } from '@/context/AppContext';
import LoadingIcons from 'react-loading-icons';
import { Message } from '@/stores/Message';

type ChatContextType = {
    chat: (message: string) => Promise<void>;
    messages: Message[];
    isLoading: boolean;
    cameraZoomed: boolean;
    setCameraZoomed: React.Dispatch<React.SetStateAction<boolean>>;
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
  const { selectedThemeId, selectThemeName } = useAppsContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void;
    if (selectedThemeId) {
      const fetchMessages = async () => {
        try {
          const themeDocRef = doc(db, "themes", selectedThemeId);
          const messagesCollectionRef = collection(themeDocRef, "messages");
          const q = query(messagesCollectionRef, orderBy("createdAt"));
          unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map((doc) => doc.data() as Message);
            setMessages(newMessages);
            console.log('Messages:', JSON.stringify(newMessages, null, 2));
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
  }, [selectedThemeId]);

  const chat = async (messageText: string) => {
    setIsLoading(true);
    setLoading(true);
    setIsThinking(true);

    try {
      if (!selectedThemeId) {
        throw new Error('テーマが選択されていません');
      }

      const response = await fetch('/api/interview_server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText, themeId: selectedThemeId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `サーバーエラー: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.interviewEnd) {
        // インタビュー終了時にレポート生成APIを呼び出す
        const reportResponse = await fetch('/api/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ themeId: selectedThemeId }),
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
  };
  
  const onMessagePlayed = useCallback(async () => {
    setMessage(null);
    try {
      const response = await fetch('/api/clear_audios', { method: 'POST' });
      if (!response.ok) {
        throw new Error('音声ファイルのクリーンアップに失敗しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('音声ファイルのクリーンアップ中にエラーが発生しました:', error.message);
      } else {
        console.error('音声ファイルのクリーンアップ中に予期せぬエラーが発生しました');
      }
    }
  }, []);

  return (
    <ChatContext.Provider value={{
      chat,
      messages,
      isLoading,
      cameraZoomed,
      setCameraZoomed,
      selectThemeName: selectThemeName ?? undefined,
      loading,
      message,
      onMessagePlayed,
      themeId: selectedThemeId ?? undefined,
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
    <div className={`mb-2 ${message.sender === "user" ? "text-right" : "text-left"}`}>
      <div 
        className={`inline-block rounded px-4 py-2 ${
          message.sender === "user" ? "bg-blue-500" :
          message.type === "report" ? "bg-yellow-500" : "bg-green-500"
        }`}
        style={style}
      >
        <p className="text-white" style={style}>{message.text}</p>
      </div>
    </div>
  );
};

const Chat: React.FC = () => {
  const { messages, isLoading, selectThemeName } = useChat();
  const scrollDiv = useRef<HTMLDivElement>(null);
  const [visibleMessages, setVisibleMessages] = useState<{ message: Message; opacity: number }[]>([]);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const handleScroll = useCallback(() => {
    if (scrollDiv.current) {
      const { scrollTop, clientHeight, scrollHeight } = scrollDiv.current;
      const visibleRange = clientHeight;

      const newVisibleMessages = reversedMessages.map((message, index) => {
        const elementTop = (index / reversedMessages.length) * scrollHeight;
        const elementBottom = ((index + 1) / reversedMessages.length) * scrollHeight;
        const visibilityStart = scrollTop;
        const visibilityEnd = scrollTop + visibleRange;

        let opacity = 1;
        if (elementBottom < visibilityStart || elementTop > visibilityEnd) {
          opacity = 0.1;
        } else {
          const normalizedPosition = (elementTop - visibilityStart) / visibleRange;
          opacity = 1 - normalizedPosition * 0.7;
        }

        return { message, opacity: Math.max(0.3, Math.min(1, opacity)) };
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

  return (
    <div className="h-full flex flex-col p-4">
      <h1 className="text-2xl text-white font-semibold mb-4">{selectThemeName}</h1>
      <div 
        ref={scrollDiv} 
        className="flex-grow overflow-y-auto mb-4 relative"
        onScroll={handleScroll}
      >
        {isLoading && <LoadingIcons.SpinningCircles />}
        {visibleMessages.map(({ message, opacity }, index) => (
          <MessageBox 
            key={index} 
            message={message} 
            style={{ opacity }}
          />
        ))}
      </div>
    </div>
  );
};

export default Chat;