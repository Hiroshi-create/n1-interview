"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAppsContext } from '@/context/AppContext';
import LoadingIcons from 'react-loading-icons';
import { FieldValue } from 'firebase/firestore';

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
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

type Message = {
  text: string;
  sender: string;
  createdAt: Timestamp | FieldValue;
  type: string;
  lipsync?: LipSync;
  facialExpression?: string;
  animation?: string;
  opacity?: number;
}

interface LipSync {
  mouthCues: Array<{ start: number; end: number; value: string; }>;
}

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
            // ここでメッセージをコンソールに出力
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

    try {
      if (!selectedThemeId) {
        throw new Error('テーマが選択されていません');
      }

      const response = await fetch('/api/chat_server', {
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
          // const visiblePortion = Math.min(elementBottom, visibilityEnd) - Math.max(elementTop, visibilityStart);
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




























// "use client";

// import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo, useCallback } from 'react';
// import { collection, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
// import { db } from '../../../firebase';
// import { useAppsContext } from '@/context/AppContext';
// import LoadingIcons from 'react-loading-icons';
// import { FieldValue } from 'firebase/firestore';

// type ChatContextType = {
//     chat: (message: string) => Promise<void>;
//     messages: Message[];
//     isLoading: boolean;
//     cameraZoomed: boolean;
//     setCameraZoomed: React.Dispatch<React.SetStateAction<boolean>>;
//     selectThemeName: string | undefined;
//     loading: boolean;
//     message: Message | null;
//     onMessagePlayed: () => void;
//     themeId: string | undefined;
// };

// const ChatContext = createContext<ChatContextType | undefined>(undefined);

// type Message = {
//   text: string;
//   sender: string;
//   createdAt: Timestamp | FieldValue;
//   type: string;
//   lipsync?: LipSync;
//   facialExpression?: string;
//   animation?: string;
//   opacity?: number;
// }

// interface LipSync {
//   mouthCues: Array<{ start: number; end: number; value: string; }>;
// }

// type ChatProviderProps = {
//   children: ReactNode;
// };

// export const ChatProvider = ({ children }: ChatProviderProps) => {
//   const { selectedThemeId, selectThemeName } = useAppsContext();
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [cameraZoomed, setCameraZoomed] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState<Message | null>(null);

//   useEffect(() => {
//     let unsubscribe: () => void;
//     if (selectedThemeId) {
//       const fetchMessages = async () => {
//         const themeDocRef = doc(db, "themes", selectedThemeId);
//         const messagesCollectionRef = collection(themeDocRef, "messages");
//         const q = query(messagesCollectionRef, orderBy("createdAt"));
//         unsubscribe = onSnapshot(q, (snapshot) => {
//           const newMessages = snapshot.docs.map((doc) => doc.data() as Message);
//           setMessages(newMessages);
//         });
//       };
//       fetchMessages();
//     }
//     return () => {
//       if (unsubscribe) {
//         unsubscribe();
//       }
//     };
//   }, [selectedThemeId]);

//   const chat = async (messageText: string) => {
//     setIsLoading(true);
//     setLoading(true);

//     try {
//       const response = await fetch('/api/chat_server', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ message: messageText, themeId: selectedThemeId }),
//       });
      
//       if (!response.ok) {
//         throw new Error('サーバーとの通信に失敗しました');
//       }
      
//       const data = await response.json();
      
//       if (data.messages && data.messages.length > 0) {
//         setMessage(data.messages[0]);
//       }
//     } catch (error) {
//       console.error('チャット処理中にエラーが発生しました:', error);
//     } finally {
//       setIsLoading(false);
//       setLoading(false);
//     }
//   };
  
//   const onMessagePlayed = () => {
//     setMessage(null);
//   };

//   return (
//     <ChatContext.Provider value={{
//       chat,
//       messages,
//       isLoading,
//       cameraZoomed,
//       setCameraZoomed,
//       selectThemeName: selectThemeName ?? undefined,
//       loading,
//       message,
//       onMessagePlayed,
//       themeId: selectedThemeId ?? undefined,
//     }}>
//       {children}
//     </ChatContext.Provider>
//   );
// };

// export const useChat = () => {
//   const context = useContext(ChatContext);
//   if (!context) {
//     throw new Error("useChatはChatProvider内で使用する必要があります");
//   }
//   return context;
// };

// const MessageBox: React.FC<{ message: Message; style: React.CSSProperties }> = ({ message, style }) => {
//   return (
//     <div className={`mb-2 ${message.sender === "user" ? "text-right" : "text-left"}`}>
//       <div 
//         className={`inline-block rounded px-4 py-2 ${
//           message.sender === "user" ? "bg-blue-500" :
//           message.type === "report" ? "bg-yellow-500" : "bg-green-500"
//         }`}
//         style={style}
//       >
//         <p className="text-white" style={style}>{message.text}</p>
//       </div>
//     </div>
//   );
// };

// const Chat: React.FC = () => {
//   const { messages, isLoading, selectThemeName } = useChat();
//   const scrollDiv = useRef<HTMLDivElement>(null);
//   const [visibleMessages, setVisibleMessages] = useState<{ message: Message; opacity: number }[]>([]);

//   const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

//   const handleScroll = useCallback(() => {
//     if (scrollDiv.current) {
//       const { scrollTop, clientHeight, scrollHeight } = scrollDiv.current;
//       const visibleRange = clientHeight;

//       const newVisibleMessages = reversedMessages.map((message, index) => {
//         const elementTop = (index / reversedMessages.length) * scrollHeight;
//         const elementBottom = ((index + 1) / reversedMessages.length) * scrollHeight;
//         const visibilityStart = scrollTop;
//         const visibilityEnd = scrollTop + visibleRange;

//         let opacity = 1;
//         if (elementBottom < visibilityStart || elementTop > visibilityEnd) {
//           opacity = 0.1;
//         } else {
//           const visiblePortion = Math.min(elementBottom, visibilityEnd) - Math.max(elementTop, visibilityStart);
//           const normalizedPosition = (elementTop - visibilityStart) / visibleRange;
//           opacity = 1 - normalizedPosition * 0.7;
//         }

//         return { message, opacity: Math.max(0.3, Math.min(1, opacity)) };
//       });

//       setVisibleMessages(newVisibleMessages);
//     }
//   }, [reversedMessages]);

//   useEffect(() => {
//     handleScroll();
//   }, [handleScroll]);

//   useEffect(() => {
//     if (scrollDiv.current) {
//       scrollDiv.current.scrollTop = 0;
//     }
//   }, [messages]);

//   return (
//     <div className="h-full flex flex-col p-4">
//       <h1 className="text-2xl text-white font-semibold mb-4">{selectThemeName}</h1>
//       <div 
//         ref={scrollDiv} 
//         className="flex-grow overflow-y-auto mb-4 relative"
//         onScroll={handleScroll}
//       >
//         {isLoading && <LoadingIcons.SpinningCircles />}
//         {visibleMessages.map(({ message, opacity }, index) => (
//           <MessageBox 
//             key={index} 
//             message={message} 
//             style={{ opacity }}
//           />
//         ))}
//       </div>
//     </div>
//   );
// };

// export default Chat;






































// // // "use client";

// // // import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
// // // import OpenAI from "openai";
// // // import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
// // // import { db } from '../../../firebase';
// // // import { useAppsContext } from '@/context/AppContext';
// // // import LoadingIcons from 'react-loading-icons';
// // // import { FieldValue } from 'firebase/firestore';

// // // type ChatContextType = {
// // //   chat: (message: string) => Promise<void>;
// // //   messages: Message[];
// // //   isLoading: boolean;
// // //   cameraZoomed: boolean;
// // //   setCameraZoomed: React.Dispatch<React.SetStateAction<boolean>>;
// // //   selectThemaName: string | undefined;
// // //   loading: boolean;
// // //   message: string | null;
// // // };

// // // const ChatContext = createContext<ChatContextType | undefined>(undefined);

// // // type Message = {
// // //     text: string;
// // //     sender: string;
// // //     createdAt: Timestamp | FieldValue;
// // //     type: string;
// // //     audio?: string;
// // //     lipsync?: LipSync;
// // //     facialExpression?: string;
// // //     animation?: string;
// // // }

// // // interface LipSync {
// // //   mouthCues: Array<{
// // //     start: number;
// // //     end: number;
// // //     value: string;
// // //   }>;
// // // }

// // // const templates = {
// // //   personal_attributes: `あなたは{theme}についてインタビューを行うインタビュアーです。回答者の基本的なプロフィールを収集します。これまでの会話コンテキスト: {context} 質問生成の指針: - まず，デモグラフィック情報（年齢、職業、家族構成は必須）を聞く - ライフスタイルや価値観に関する質問を含める - {theme}に関連する趣味や習慣について尋ねる - １対話で複数の質問を投げかけない - １対話につき質問は１つとする`,
// // //   usage_situation: `あなたは{theme}についてインタビューを行うインタビュアーです。{theme}の利用状況や消費シーンについて詳しく探ります。これまでの会話コンテキスト: {context} 質問生成の指針: - {theme}をどのような場面で利用するか，具体的なエピソードなどを交えて - 利用した時の満足と不満について，具体的なエピソードなどを交えて - {theme}を利用する際の感情や期待を，具体的なエピソードなどを交えて - {theme}を利用するにあたりこんなものがあれば，みたいな要望を，具体的なエピソードなどを交えて - 各対話につき質問は１つに絞る - なぜそう思ったのかを深掘りする - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する`,
// // //   purchase_intention: `あなたは{theme}についてインタビューを行うインタビュアーです。{theme}の選択意思決定プロセスについて深掘りします。これまでの会話コンテキスト: {context} 質問生成の指針: - 選択時に重視する要素（価格、品質、ブランドなど）を聞き，なぜそれを重視するのか深掘りする - 選択のきっかけや情報源を具体的に聞く - 選択後の満足度や不満を具体的に聞く - 各対話につき質問は１つに絞る - なぜそう思ったのかを深掘りする - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する`,
// // //   competitor_analysis: `あなたは{theme}についてインタビューを行うインタビュアーです。競合製品やブランドに対する認識を調査します。これまでの会話コンテキスト: {context} 質問生成の指針: - 知っている競合ブランドやその特徴を，具体的なエピソードなどを交えて - 競合サービスとの比較や選択理由を，具体的なエピソードなどを交えて - 競合サービスに対する印象や期待を，具体的なエピソードなどを交えて - 各対話につき質問は１つに絞る - なぜそう思ったのかを深掘りする`,
// // //   summary: `テーマ: {theme} インタビュー全体を分析し、以下の形式で詳細なレポートを作成してください： 1. インタビューの概要: ここに{theme}に関するインタビューの全体的な概要を記載 2. 主要な発見事項: ここに{theme}に関する重要な発見や洞察を記載 3. ユーザーの特性と行動パターン: ここに{theme}に関連するユーザーの特徴や行動傾向を記載 4. {theme}に対する意見や要望: ここに{theme}についてのユーザーの具体的な意見や改善要望を記載 5. 競合分析の結果: ここに{theme}の競合製品やサービスに関する分析結果を記載 6. 結論と推奨事項: ここに{theme}に関する総括と今後のアクションプランを記載 これまでの会話コンテキスト:{context}`,
// // // };

// // // type ChatProviderProps = {
// // //   children: ReactNode;
// // // };

// // // export const ChatProvider = ({ children }: ChatProviderProps) => {
// // //     const openai = new OpenAI({
// // //       apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
// // //       dangerouslyAllowBrowser: true,
// // //     });
  
// // //     const { selectedThema, selectThemaName, resetContext } = useAppsContext();
// // //     const [messages, setMessages] = useState<Message[]>([]);
// // //     const [isLoading, setIsLoading] = useState(false);
// // //     const [currentTemplate, setCurrentTemplate] = useState("personal_attributes");
// // //     const [context, setContext] = useState("");
// // //     const [questionCount, setQuestionCount] = useState(0);
// // //     const [cameraZoomed, setCameraZoomed] = useState(true);
// // //     const [loading, setLoading] = useState(false);
// // //     const [message, setMessage] = useState<string | null>(null);

// // //     useEffect(() => {
// // //         let unsubscribe: () => void;
      
// // //         if (selectedThema) {
// // //           const fetchMessages = async () => {
// // //             const themaDocRef = doc(db, "themas", selectedThema);
// // //             const messagesCollectionRef = collection(themaDocRef, "messages");
// // //             const q = query(messagesCollectionRef, orderBy("createdAt"));
// // //             unsubscribe = onSnapshot(q, (snapshot) => {
// // //               const newMessages = snapshot.docs.map((doc) => doc.data() as Message);
// // //               setMessages(newMessages);
// // //             });
// // //           };
      
// // //           fetchMessages();
// // //         }
      
// // //         return () => {
// // //           if (unsubscribe) {
// // //             unsubscribe();
// // //           }
// // //         };
// // //       }, [selectedThema]);

// // //   const resetInterview = useCallback(() => {
// // //     setMessages([]);
// // //     setContext("");
// // //     setQuestionCount(0);
// // //     setCurrentTemplate("personal_attributes");
// // //     resetContext();
// // //   }, [resetContext]);

// // //   const processMessageWithServer = async (text: string): Promise<Message> => {
// // //     const response = await fetch('/api/chat_server', {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify({ message: text }),
// // //     });
// // //     if (!response.ok) {
// // //       throw new Error('サーバーとの通信に失敗しました');
// // //     }
// // //     const data = await response.json();
// // //     return data.messages[0];
// // //   };

// // //   const chat = async (message: string) => {
// // //     setIsLoading(true);
// // //     let botResponseText: string | null = null;
// // //     try {
// // //         const messageData: Message = {
// // //             text: message,
// // //             sender: "user",
// // //             createdAt: serverTimestamp(),
// // //             type: "interview",
// // //         };

// // //         const themaDocRef = doc(db, "themas", selectedThema!);
// // //         const messageCollectionRef = collection(themaDocRef, "messages");
// // //         await addDoc(messageCollectionRef, messageData);

// // //         const updatedContext = context + "\nUser: " + message;
// // //         setContext(updatedContext);

// // //         if (questionCount === 0) {
// // //         setCurrentTemplate("personal_attributes");
// // //         await addDoc(messageCollectionRef, {
// // //             text: "現在のフェーズ: プロフィール",
// // //             sender: "bot",
// // //             createdAt: serverTimestamp(),
// // //             type: "interview",
// // //         });
// // //         } else if (questionCount === 1) {
// // //         setCurrentTemplate("usage_situation");
// // //         await addDoc(messageCollectionRef, {
// // //             text: "現在のフェーズ: 利用状況の把握",
// // //             sender: "bot",
// // //             createdAt: serverTimestamp(),
// // //             type: "interview",
// // //         });
// // //         } else if (questionCount === 2) {
// // //         setCurrentTemplate("purchase_intention");
// // //         await addDoc(messageCollectionRef, {
// // //             text: "現在のフェーズ: 購入意思の把握",
// // //             sender: "bot",
// // //             createdAt: serverTimestamp(),
// // //             type: "interview",
// // //         });
// // //         } else if (questionCount === 3) {
// // //         setCurrentTemplate("competitor_analysis");
// // //         await addDoc(messageCollectionRef, {
// // //             text: "現在のフェーズ: 競合調査",
// // //             sender: "bot",
// // //             createdAt: serverTimestamp(),
// // //             type: "interview",
// // //         });
// // //         } else if (questionCount >= 4) {
// // //         await addDoc(messageCollectionRef, {
// // //             text: "インタビューを終了します。ありがとうございました。",
// // //             sender: "bot",
// // //             createdAt: serverTimestamp(),
// // //             type: "interview",
// // //         });
// // //         const reportPrompt = templates.summary
// // //             .replace("{theme}", selectThemaName!)
// // //             .replace("{context}", updatedContext);

// // //         const reportResponse = await openai.chat.completions.create({
// // //             messages: [
// // //             { role: "system", content: "あなたは優秀なマーケティングアナリストです。" },
// // //             { role: "user", content: reportPrompt }
// // //             ],
// // //             model: "gpt-4"
// // //         });

// // //         const report = reportResponse.choices[0].message.content;
// // //         await addDoc(messageCollectionRef, {
// // //             text: report,
// // //             sender: "bot",
// // //             createdAt: serverTimestamp(),
// // //             type: "report"
// // //         });

// // //         resetInterview();
// // //         setIsLoading(false);
// // //         return;
// // //         }

// // //         const prompt = templates[currentTemplate as keyof typeof templates]
// // //         .replace("{theme}", selectThemaName!)
// // //         .replace("{context}", updatedContext);

// // //         const gpt4oResponse = await openai.chat.completions.create({
// // //         messages: [
// // //             { role: "system", content: prompt },
// // //             { role: "user", content: message }
// // //         ],
// // //         model: "gpt-4"
// // //         });

// // //         botResponseText = gpt4oResponse.choices[0].message.content ?? null;

// // //         if (botResponseText !== null) {
// // //             try {
// // //               const processedMessage = await processMessageWithServer(botResponseText);
// // //               await addDoc(messageCollectionRef, {
// // //                 ...processedMessage,
// // //                 sender: "bot",
// // //                 createdAt: serverTimestamp(),
// // //                 type: "interview",
// // //               });
// // //               setContext(prevContext => prevContext + "\nBot: " + botResponseText);
// // //               setQuestionCount(prevCount => prevCount + 1);
// // //             } catch (error) {
// // //               console.error('メッセージ処理中にエラーが発生しました:', error);
// // //               await addDoc(messageCollectionRef, {
// // //                 text: "申し訳ありません。エラーが発生しました。",
// // //                 sender: "bot",
// // //                 createdAt: serverTimestamp(),
// // //                 type: "error",
// // //               });
// // //             }
// // //           } else {
// // //             console.error('botResponseTextがnullです');
// // //             await addDoc(messageCollectionRef, {
// // //               text: "申し訳ありません。応答の生成中にエラーが発生しました。",
// // //               sender: "bot",
// // //               createdAt: serverTimestamp(),
// // //               type: "error",
// // //             });
// // //           }
// // //         } catch (error) {
// // //             console.error('チャット処理中にエラーが発生しました:', error);
// // //             // エラー処理
// // //           } finally {
// // //             setIsLoading(false);
// // //             setLoading(false);
// // //             setMessage(botResponseText);
// // //           }
// // //   };

// // //     return (
// // //         <ChatContext.Provider value={{
// // //             chat,
// // //             messages,
// // //             isLoading,
// // //             cameraZoomed,
// // //             setCameraZoomed,
// // //             selectThemaName: selectThemaName ?? undefined,
// // //             loading,
// // //             message,
// // //         }}>
// // //             {children}
// // //         </ChatContext.Provider>
// // //     );
// // // };

// // // export const useChat = () => {
// // //     const context = useContext(ChatContext);
// // //     if (!context) {
// // //       throw new Error("useChatはChatProvider内で使用する必要があります");
// // //     }
// // //     return context;
// // //   };

// // // const Chat = () => {
// // //     const { messages, isLoading, selectThemaName } = useChat();
// // //     const scrollDiv = useRef<HTMLDivElement>(null);
  
// // //     return (
// // //       <div className='bg-gray-500 h-full p-4 flex flex-col'>
// // //         <h1 className='text-2xl text-white font-semibold mb-4'>{selectThemaName}</h1>
// // //         <div className='flex-grow overflow-y-auto mb-4' ref={scrollDiv}>
// // //           {messages.map((message, index) => (
// // //             <div key={index} className={message.sender === "user" ? "text-right" : "text-left"}>
// // //               <div className={
// // //                 message.sender === "user" ? 'bg-blue-500 inline-block rounded px-4 py-2 mb-2' :
// // //                 message.type === "report" ? 'bg-yellow-500 inline-block rounded px-4 py-2 mb-2 w-full' :
// // //                 'bg-green-500 inline-block rounded px-4 py-2 mb-2'
// // //               }>
// // //                 <p className='text-white'>{message.text}</p>
// // //                 {message.audio && <audio src={`data:audio/mp3;base64,${message.audio}`} controls />}
// // //                 {message.facialExpression && <p>表情: {message.facialExpression}</p>}
// // //                 {message.animation && <p>アニメーション: {message.animation}</p>}
// // //               </div>
// // //             </div>
// // //           ))}
// // //           {isLoading && <LoadingIcons.SpinningCircles />}
// // //         </div>
// // //       </div>
// // //     );
// // // };

// // // export default Chat;
























// // // // "use client";

// // // // import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
// // // // import OpenAI from "openai";
// // // // import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
// // // // import { db } from '../../../firebase';
// // // // import { useAppsContext } from '@/context/AppContext';
// // // // import LoadingIcons from 'react-loading-icons';

// // // // type ChatContextType = {
// // // //   chat: (message: string) => Promise<void>;
// // // //   messages: Message[];
// // // //   isLoading: boolean;
// // // //   cameraZoomed: boolean;
// // // //   setCameraZoomed: React.Dispatch<React.SetStateAction<boolean>>;
// // // //   selectThemaName: string | undefined;
// // // //   loading: boolean;
// // // //   message: string | null;
// // // // };

// // // // const ChatContext = createContext<ChatContextType | undefined>(undefined);

// // // // type Message = {
// // // //   text: string;
// // // //   sender: string;
// // // //   createdAt: Timestamp;
// // // //   type: string;
// // // // }

// // // // const templates = {
// // // //   personal_attributes: `あなたは{theme}についてインタビューを行うインタビュアーです。回答者の基本的なプロフィールを収集します。これまでの会話コンテキスト: {context} 質問生成の指針: - まず，デモグラフィック情報（年齢、職業、家族構成は必須）を聞く - ライフスタイルや価値観に関する質問を含める - {theme}に関連する趣味や習慣について尋ねる - １対話で複数の質問を投げかけない - １対話につき質問は１つとする`,
// // // //   usage_situation: `あなたは{theme}についてインタビューを行うインタビュアーです。{theme}の利用状況や消費シーンについて詳しく探ります。これまでの会話コンテキスト: {context} 質問生成の指針: - {theme}をどのような場面で利用するか，具体的なエピソードなどを交えて - 利用した時の満足と不満について，具体的なエピソードなどを交えて - {theme}を利用する際の感情や期待を，具体的なエピソードなどを交えて - {theme}を利用するにあたりこんなものがあれば，みたいな要望を，具体的なエピソードなどを交えて - 各対話につき質問は１つに絞る - なぜそう思ったのかを深掘りする - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する`,
// // // //   purchase_intention: `あなたは{theme}についてインタビューを行うインタビュアーです。{theme}の選択意思決定プロセスについて深掘りします。これまでの会話コンテキスト: {context} 質問生成の指針: - 選択時に重視する要素（価格、品質、ブランドなど）を聞き，なぜそれを重視するのか深掘りする - 選択のきっかけや情報源を具体的に聞く - 選択後の満足度や不満を具体的に聞く - 各対話につき質問は１つに絞る - なぜそう思ったのかを深掘りする - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する`,
// // // //   competitor_analysis: `あなたは{theme}についてインタビューを行うインタビュアーです。競合製品やブランドに対する認識を調査します。これまでの会話コンテキスト: {context} 質問生成の指針: - 知っている競合ブランドやその特徴を，具体的なエピソードなどを交えて - 競合サービスとの比較や選択理由を，具体的なエピソードなどを交えて - 競合サービスに対する印象や期待を，具体的なエピソードなどを交えて - 各対話につき質問は１つに絞る - なぜそう思ったのかを深掘りする`,
// // // //   summary: `テーマ: {theme} インタビュー全体を分析し、以下の形式で詳細なレポートを作成してください： 1. インタビューの概要: ここに{theme}に関するインタビューの全体的な概要を記載 2. 主要な発見事項: ここに{theme}に関する重要な発見や洞察を記載 3. ユーザーの特性と行動パターン: ここに{theme}に関連するユーザーの特徴や行動傾向を記載 4. {theme}に対する意見や要望: ここに{theme}についてのユーザーの具体的な意見や改善要望を記載 5. 競合分析の結果: ここに{theme}の競合製品やサービスに関する分析結果を記載 6. 結論と推奨事項: ここに{theme}に関する総括と今後のアクションプランを記載 これまでの会話コンテキスト:{context}`,
// // // // };

// // // // type ChatProviderProps = {
// // // //   children: ReactNode;
// // // // };

// // // // export const ChatProvider = ({ children }: ChatProviderProps) => {
// // // //   const openai = new OpenAI({
// // // //     apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
// // // //     dangerouslyAllowBrowser: true,
// // // //   });

// // // //   const { selectedThema, selectThemaName, resetContext } = useAppsContext();
// // // //   const [messages, setMessages] = useState<Message[]>([]);
// // // //   const [isLoading, setIsLoading] = useState(false);
// // // //   const [currentTemplate, setCurrentTemplate] = useState("personal_attributes");
// // // //   const [context, setContext] = useState("");
// // // //   const [questionCount, setQuestionCount] = useState(0);
// // // //   const [cameraZoomed, setCameraZoomed] = useState(true);
// // // //   const [loading, setLoading] = useState(false);
// // // //   const [message, setMessage] = useState<string | null>(null);

// // // //   useEffect(() => {
// // // //     if (selectedThema) {
// // // //       const fetchMessages = async () => {
// // // //         const themaDocRef = doc(db, "themas", selectedThema);
// // // //         const messagesCollectionRef = collection(themaDocRef, "messages");
// // // //         const q = query(messagesCollectionRef, orderBy("createdAt"));
// // // //         const sShot = onSnapshot(q, (snapshot) => {
// // // //           const newMessages = snapshot.docs.map((doc) => doc.data() as Message);
// // // //           setMessages(newMessages);
// // // //         });
// // // //         return () => {
// // // //           sShot();
// // // //         };
// // // //       };
// // // //       fetchMessages();
// // // //     }
// // // //   }, [selectedThema]);

// // // //   const resetInterview = useCallback(() => {
// // // //     setMessages([]);
// // // //     setContext("");
// // // //     setQuestionCount(0);
// // // //     setCurrentTemplate("personal_attributes");
// // // //     resetContext();
// // // //   }, [resetContext]);

// // // //   const chat = async (message: string) => {
// // // //     setIsLoading(true);
// // // //     const messageData = {
// // // //       text: message,
// // // //       sender: "user",
// // // //       createdAt: serverTimestamp(),
// // // //       type: "interview",
// // // //     };
// // // //     const themaDocRef = doc(db, "themas", selectedThema!);
// // // //     const messageCollectionRef = collection(themaDocRef, "messages");
// // // //     await addDoc(messageCollectionRef, messageData);

// // // //     const updatedContext = context + "\nUser: " + message;
// // // //     setContext(updatedContext);

// // // //     if (questionCount === 0) {
// // // //       setCurrentTemplate("personal_attributes");
// // // //       await addDoc(messageCollectionRef, {
// // // //         text: "現在のフェーズ: プロフィール",
// // // //         sender: "bot",
// // // //         createdAt: serverTimestamp(),
// // // //         type: "interview",
// // // //       });
// // // //     } else if (questionCount === 1) {
// // // //       setCurrentTemplate("usage_situation");
// // // //       await addDoc(messageCollectionRef, {
// // // //         text: "現在のフェーズ: 利用状況の把握",
// // // //         sender: "bot",
// // // //         createdAt: serverTimestamp(),
// // // //         type: "interview",
// // // //       });
// // // //     } else if (questionCount === 2) {
// // // //       setCurrentTemplate("purchase_intention");
// // // //       await addDoc(messageCollectionRef, {
// // // //         text: "現在のフェーズ: 購入意思の把握",
// // // //         sender: "bot",
// // // //         createdAt: serverTimestamp(),
// // // //         type: "interview",
// // // //       });
// // // //     } else if (questionCount === 3) {
// // // //       setCurrentTemplate("competitor_analysis");
// // // //       await addDoc(messageCollectionRef, {
// // // //         text: "現在のフェーズ: 競合調査",
// // // //         sender: "bot",
// // // //         createdAt: serverTimestamp(),
// // // //         type: "interview",
// // // //       });
// // // //     } else if (questionCount >= 4) {
// // // //       await addDoc(messageCollectionRef, {
// // // //         text: "インタビューを終了します。ありがとうございました。",
// // // //         sender: "bot",
// // // //         createdAt: serverTimestamp(),
// // // //         type: "interview",
// // // //       });
// // // //       const reportPrompt = templates.summary
// // // //         .replace("{theme}", selectThemaName!)
// // // //         .replace("{context}", updatedContext);
// // // //       const reportResponse = await openai.chat.completions.create({
// // // //         messages: [
// // // //           { role: "system", content: "あなたは優秀なマーケティングアナリストです。" },
// // // //           { role: "user", content: reportPrompt }
// // // //         ],
// // // //         model: "gpt-4"
// // // //       });
// // // //       const report = reportResponse.choices[0].message.content;
// // // //       await addDoc(messageCollectionRef, {
// // // //         text: report,
// // // //         sender: "bot",
// // // //         createdAt: serverTimestamp(),
// // // //         type: "report"
// // // //       });
// // // //       resetInterview();
// // // //       setIsLoading(false);
// // // //       return;
// // // //     }

// // // //     const prompt = templates[currentTemplate as keyof typeof templates]
// // // //       .replace("{theme}", selectThemaName!)
// // // //       .replace("{context}", updatedContext);
// // // //     const gpt4oResponse = await openai.chat.completions.create({
// // // //       messages: [
// // // //         { role: "system", content: prompt },
// // // //         { role: "user", content: message }
// // // //       ],
// // // //       model: "gpt-4"
// // // //     });
// // // //     const botResponse = gpt4oResponse.choices[0].message.content;
// // // //     await addDoc(messageCollectionRef, {
// // // //       text: botResponse,
// // // //       sender: "bot",
// // // //       createdAt: serverTimestamp(),
// // // //       type: "interview",
// // // //     });
// // // //     setContext(prevContext => prevContext + "\nBot: " + botResponse);
// // // //     setQuestionCount(prevCount => prevCount + 1);
// // // //     setIsLoading(false);
// // // //     setLoading(false);
// // // //     setMessage(botResponse);
// // // //   };

// // // //   return (
// // // //     <ChatContext.Provider value={{
// // // //       chat,
// // // //       messages,
// // // //       isLoading,
// // // //       cameraZoomed,
// // // //       setCameraZoomed,
// // // //       selectThemaName: selectThemaName ?? undefined,
// // // //       loading,
// // // //       message,
// // // //     }}>
// // // //       {children}
// // // //     </ChatContext.Provider>
// // // //   );
// // // // };

// // // // export const useChat = () => {
// // // //   const context = useContext(ChatContext);
// // // //   if (!context) {
// // // //     throw new Error("useChatはChatProvider内で使用する必要があります");
// // // //   }
// // // //   return context;
// // // // };

// // // // const Chat = () => {
// // // //   const { messages, isLoading, selectThemaName } = useChat();
// // // //   const scrollDiv = useRef<HTMLDivElement>(null);

// // // //   return (
// // // //     <div className='bg-gray-500 h-full p-4 flex flex-col'>
// // // //       <h1 className='text-2xl text-white font-semibold mb-4'>{selectThemaName}</h1>
// // // //       <div className='flex-grow overflow-y-auto mb-4' ref={scrollDiv}>
// // // //         {messages.map((message, index) => (
// // // //           <div key={index} className={message.sender === "user" ? "text-right" : "text-left"}>
// // // //             <div className={
// // // //               message.sender === "user" ? 'bg-blue-500 inline-block rounded px-4 py-2 mb-2' :
// // // //               message.type === "report" ? 'bg-yellow-500 inline-block rounded px-4 py-2 mb-2 w-full' :
// // // //               'bg-green-500 inline-block rounded px-4 py-2 mb-2'
// // // //             }>
// // // //               <p className='text-white'>{message.text}</p>
// // // //             </div>
// // // //           </div>
// // // //         ))}
// // // //         {isLoading && <LoadingIcons.SpinningCircles />}
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Chat;































// // // // // "use client";

// // // // // import React, { useCallback, useEffect, useRef, useState } from 'react'
// // // // // import { FaPaperPlane } from 'react-icons/fa';
// // // // // import OpenAI from "openai"
// // // // // import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
// // // // // import { db } from '../../../firebase';
// // // // // import { useAppsContext } from '@/context/AppContext';
// // // // // import LoadingIcons from 'react-loading-icons'

// // // // // type Message = {
// // // // //     text: string;
// // // // //     sender: string;
// // // // //     createdAt: Timestamp;
// // // // //     type: string;
// // // // // }

// // // // // const templates = {
// // // // //     personal_attributes: `
// // // // //     あなたは{theme}についてインタビューを行うインタビュアーです。
// // // // //     回答者の基本的なプロフィールを収集します。
// // // // //     これまでの会話コンテキスト: {context}
// // // // //     質問生成の指針:
// // // // //     - まず，デモグラフィック情報（年齢、職業、家族構成は必須）を聞く
// // // // //     - ライフスタイルや価値観に関する質問を含める
// // // // //     - {theme}に関連する趣味や習慣について尋ねる
// // // // //     - １対話で複数の質問を投げかけない
// // // // //     - １対話につき質問は１つとする
// // // // //     `,
// // // // //     usage_situation: `
// // // // //     あなたは{theme}についてインタビューを行うインタビュアーです。
// // // // //     {theme}の利用状況や消費シーンについて詳しく探ります。
// // // // //     これまでの会話コンテキスト: {context}
// // // // //     質問生成の指針:
// // // // //     - {theme}をどのような場面で利用するか，具体的なエピソードなどを交えて
// // // // //     - 利用した時の満足と不満について，具体的なエピソードなどを交えて
// // // // //     - {theme}を利用する際の感情や期待を，具体的なエピソードなどを交えて
// // // // //     - {theme}を利用するにあたりこんなものがあれば，みたいな要望を，具体的なエピソードなどを交えて
// // // // //     - 各対話につき質問は１つに絞る
// // // // //     - なぜそう思ったのかを深掘りする
// // // // //     - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する
// // // // //     `,
// // // // //     purchase_intention: `
// // // // //     あなたは{theme}についてインタビューを行うインタビュアーです。
// // // // //     {theme}の選択意思決定プロセスについて深掘りします。
// // // // //     これまでの会話コンテキスト: {context}
// // // // //     質問生成の指針:
// // // // //     - 選択時に重視する要素（価格、品質、ブランドなど）を聞き，なぜそれを重視するのか深掘りする
// // // // //     - 選択のきっかけや情報源を具体的に聞く
// // // // //     - 選択後の満足度や不満を具体的に聞く
// // // // //     - 各対話につき質問は１つに絞る
// // // // //     - なぜそう思ったのかを深掘りする
// // // // //     - 必要があれば，「それは他のお店でも満たしていないニーズでしょうか？」と確認する
// // // // //     `,
// // // // //     competitor_analysis: `
// // // // //     あなたは{theme}についてインタビューを行うインタビュアーです。
// // // // //     競合製品やブランドに対する認識を調査します。
// // // // //     これまでの会話コンテキスト: {context}
// // // // //     質問生成の指針:
// // // // //     - 知っている競合ブランドやその特徴を，具体的なエピソードなどを交えて
// // // // //     - 競合サービスとの比較や選択理由を，具体的なエピソードなどを交えて
// // // // //     - 競合サービスに対する印象や期待を，具体的なエピソードなどを交えて
// // // // //     - 各対話につき質問は１つに絞る
// // // // //     - なぜそう思ったのかを深掘りする
// // // // //     `,
// // // // //     // summary: `
// // // // //     // テーマ: {theme}
// // // // //     // インタビュー全体を分析し、以下の形式で分析レポートを作成してください：
// // // // //     // 1. どんな{theme}が選ばれるか:ここに記載
// // // // //     // 2. 今の{theme}を選んだ理由:ここに記載
// // // // //     // 3. 他社{theme}と比較したときの魅力:ここに記載
// // // // //     // 4. これから{theme}を選ぶとしたらどこを重視するか:ここに記載
// // // // //     // 5. {theme}における不満や問題:ここに記載
// // // // //     // 6. {theme}において新しく求める特徴や機能:ここに記載
// // // // //     // これまでの会話コンテキスト: {context}
// // // // //     // `,
// // // // //     summary: `
// // // // //     テーマ: {theme}
// // // // //     インタビュー全体を分析し、以下の形式で詳細なレポートを作成してください：

// // // // //     1. インタビューの概要:
// // // // //     ここに{theme}に関するインタビューの全体的な概要を記載

// // // // //     2. 主要な発見事項:
// // // // //     ここに{theme}に関する重要な発見や洞察を記載

// // // // //     3. ユーザーの特性と行動パターン:
// // // // //     ここに{theme}に関連するユーザーの特徴や行動傾向を記載

// // // // //     4. {theme}に対する意見や要望:
// // // // //     ここに{theme}についてのユーザーの具体的な意見や改善要望を記載

// // // // //     5. 競合分析の結果:
// // // // //     ここに{theme}の競合製品やサービスに関する分析結果を記載

// // // // //     6. 結論と推奨事項:
// // // // //     ここに{theme}に関する総括と今後のアクションプランを記載

// // // // //     これまでの会話コンテキスト:{context}
// // // // //     `,
// // // // // }

// // // // // const Chat = () => {

// // // // //     const openai = new OpenAI({
// // // // //         apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY,
// // // // //         dangerouslyAllowBrowser: true,
// // // // //     });

// // // // //     const { selectedThema, selectThemaName, resetContext } = useAppsContext();
// // // // //     const [inputMessage, setInputMessage] = useState<string>("");
// // // // //     const [messages, setMessages] = useState<Message[]>([]);
// // // // //     const [isLoading, setIsLoading] = useState<boolean>(false);
    
// // // // //     const [currentTemplate, setCurrentTemplate] = useState<string>("personal_attributes");
// // // // //     const [context, setContext] = useState<string>("");
// // // // //     const [questionCount, setQuestionCount] = useState<number>(0);

// // // // //     const scrollDiv = useRef<HTMLDivElement>(null);

// // // // //     // 各Themaにおけるメッセージを取得
// // // // //     useEffect(() => {
// // // // //         if(selectedThema) {
// // // // //             const fetchMessages = async () => {
// // // // //                 const themaDocRef = doc(db, "themas", selectedThema);
// // // // //                 const messagesCollectionRef = collection(themaDocRef, "messages");

// // // // //                 const q = query(messagesCollectionRef, orderBy("createdAt"));

// // // // //                 const sShot = onSnapshot(q, (snapshot) => {
// // // // //                     const newMessages = snapshot.docs.map((doc) => doc.data() as Message);
// // // // //                     setMessages(newMessages);
// // // // //                 });
// // // // //                 return () => {  // メモリリークを防ぐためにクリーンアップ
// // // // //                     sShot();
// // // // //                 };
// // // // //             };
// // // // //             fetchMessages();
// // // // //         }
// // // // //     }, [selectedThema])

// // // // //     useEffect(() => {
// // // // //         if(scrollDiv.current) {
// // // // //             const element = scrollDiv.current;
// // // // //             element.scrollTo({
// // // // //                 top: element.scrollHeight,
// // // // //                 behavior: "smooth",
// // // // //             })
// // // // //         }
// // // // //     }, [messages])

// // // // //     const resetInterview = useCallback(() => {
// // // // //         setMessages([]);
// // // // //         setContext("");
// // // // //         setQuestionCount(0);
// // // // //         setCurrentTemplate("personal_attributes");
// // // // //         resetContext();
// // // // //     }, [resetContext]);

// // // // //     const sendMessage = async () => {
// // // // //         if (!inputMessage.trim()) return;
// // // // //         const messageData = {
// // // // //             text: inputMessage,
// // // // //             sender: "user",
// // // // //             createdAt: serverTimestamp(),
// // // // //             type: "interview",
// // // // //         }
        
// // // // //         const themaDocRef = doc(db, "themas", selectedThema!);
// // // // //         const messageCollectionRef = collection(themaDocRef, "messages");
// // // // //         await addDoc(messageCollectionRef, messageData);
// // // // //         setInputMessage("");
// // // // //         setIsLoading(true);
        
// // // // //         const updatedContext = context + "\nUser: " + inputMessage;
// // // // //         setContext(updatedContext);
        
// // // // //         if (questionCount === 0) {
// // // // //             setCurrentTemplate("personal_attributes");
// // // // //             await addDoc(messageCollectionRef, {
// // // // //                 text: "現在のフェーズ: プロフィール",
// // // // //                 sender: "bot",
// // // // //                 createdAt: serverTimestamp(),
// // // // //                 type: "interview",
// // // // //             });
// // // // //         } else if (questionCount === 1) {
// // // // //             setCurrentTemplate("usage_situation");
// // // // //             await addDoc(messageCollectionRef, {
// // // // //                 text: "現在のフェーズ: 利用状況の把握",
// // // // //                 sender: "bot",
// // // // //                 createdAt: serverTimestamp(),
// // // // //                 type: "interview",
// // // // //             });
// // // // //         } else if (questionCount === 2) {
// // // // //             setCurrentTemplate("purchase_intention");
// // // // //             await addDoc(messageCollectionRef, {
// // // // //                 text: "現在のフェーズ: 購入意思の把握",
// // // // //                 sender: "bot",
// // // // //                 createdAt: serverTimestamp(),
// // // // //                 type: "interview",
// // // // //             });
// // // // //         } else if (questionCount === 3) {
// // // // //             setCurrentTemplate("competitor_analysis");
// // // // //             await addDoc(messageCollectionRef, {
// // // // //                 text: "現在のフェーズ: 競合調査",
// // // // //                 sender: "bot",
// // // // //                 createdAt: serverTimestamp(),
// // // // //                 type: "interview",
// // // // //             });
// // // // //         } else if (questionCount >= 4) {
// // // // //             await addDoc(messageCollectionRef, {
// // // // //               text: "インタビューを終了します。ありがとうございました。",
// // // // //               sender: "bot",
// // // // //               createdAt: serverTimestamp(),
// // // // //               type: "interview",
// // // // //             });
      
// // // // //             // レポート作成用エージェントの呼び出し
// // // // //             const reportPrompt = templates.summary
// // // // //               .replace("{theme}", selectThemaName!)
// // // // //               .replace("{context}", updatedContext);
// // // // //             const reportResponse = await openai.chat.completions.create({
// // // // //               messages: [
// // // // //                 {role: "system", content: "あなたは優秀なマーケティングアナリストです。"},
// // // // //                 {role: "user", content: reportPrompt}
// // // // //               ],
// // // // //               model: "gpt-4"
// // // // //             });
// // // // //             const report = reportResponse.choices[0].message.content;
// // // // //             console.log("生成されたレポート:", report);
            
// // // // //             // レポートをFirebaseに保存
// // // // //             await addDoc(messageCollectionRef, {
// // // // //                 text: report,
// // // // //                 sender: "bot",
// // // // //                 createdAt: serverTimestamp(),
// // // // //                 type: "report"
// // // // //             });

// // // // //             resetInterview();
// // // // //             setIsLoading(false);
// // // // //             return;
// // // // //         }
    
// // // // //         const prompt = templates[currentTemplate as keyof typeof templates]
// // // // //             .replace("{theme}", selectThemaName!)
// // // // //             .replace("{context}", updatedContext);
    
// // // // //         const gpt4oResponse = await openai.chat.completions.create({
// // // // //             messages: [
// // // // //                 {role: "system", content: prompt},
// // // // //                 {role: "user", content: inputMessage}
// // // // //             ],
// // // // //             model: "gpt-4"
// // // // //         });
    
// // // // //         setIsLoading(false);
// // // // //         const botResponse = gpt4oResponse.choices[0].message.content;
// // // // //         await addDoc(messageCollectionRef, {
// // // // //             text: botResponse,
// // // // //             sender: "bot",
// // // // //             createdAt: serverTimestamp(),
// // // // //             type: "interview",
// // // // //         });

// // // // //         setContext(prevContext => prevContext + "\nBot: " + botResponse);
// // // // //         setQuestionCount(prevCount => prevCount + 1);
// // // // //     };

// // // // //     return (
// // // // //         <div className='bg-gray-500 h-full p-4 flex flex-col'>
// // // // //             <h1 className='text-2xl text-white font-semibold mb-4'>{selectThemaName}</h1>
// // // // //             <div className='flex-grow overflow-y-auto mb-4' ref={scrollDiv}>
// // // // //                 {messages.map((message, index) => (
// // // // //                 <div key={index} className={message.sender === "user" ? "text-right" : "text-left"}>
// // // // //                     <div className={
// // // // //                     message.sender === "user"
// // // // //                         ? 'bg-blue-500 inline-block rounded px-4 py-2 mb-2'
// // // // //                         : message.type === "report"
// // // // //                         ? 'bg-yellow-500 inline-block rounded px-4 py-2 mb-2 w-full'
// // // // //                         : 'bg-green-500 inline-block rounded px-4 py-2 mb-2'
// // // // //                     }>
// // // // //                     <p className='text-white'>{message.text}</p>
// // // // //                     </div>
// // // // //                 </div>
// // // // //                 ))}
// // // // //                 {isLoading && <LoadingIcons.SpinningCircles />}
// // // // //             </div>

// // // // //             <div className='flex-shrink-0 relative'>
// // // // //                 <input
// // // // //                     type='text'
// // // // //                     placeholder='Send a Message'
// // // // //                     className='border-2 rounded w-full pr-10 focus:outline-none p-2'
// // // // //                     onChange={(e) => setInputMessage(e.target.value)}
// // // // //                     value={inputMessage}
// // // // //                     onKeyDown={(e) => {
// // // // //                         if (e.key === 'Enter' && e.shiftKey) {
// // // // //                             e.preventDefault(); // デフォルトの改行を防止
// // // // //                             sendMessage();
// // // // //                         }
// // // // //                     }}
// // // // //                 />
// // // // //                 <button className='absolute inset-y-0 right-4 flex items-center' onClick={() => sendMessage()}>
// // // // //                     <FaPaperPlane />
// // // // //                 </button>
// // // // //             </div>
// // // // //         </div>
// // // // //     )
// // // // // }

// // // // // export default Chat