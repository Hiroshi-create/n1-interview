"use client"

import { useEffect, useRef, useState } from "react"
import type { Theme } from "@/stores/Theme"
import { FaPaperPlane } from "react-icons/fa"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import styles from './kanseiAiMarketer.module.css';

interface Message {
  id: string
  text: string
  sender: "user" | "ai"
  timestamp: string
  read: boolean
  isLoading?: boolean
  error?: string
}

interface ComponentProps {
  theme: Theme
  height?: string
}




const KanseiAiMarketer = ({ theme, height = "h-96" }: ComponentProps): JSX.Element => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [isInitializing, setIsInitializing] = useState(true)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [imageLoaded, setImageLoaded] = useState(false)
    const [isComposing, setIsComposing] = useState(false)
    const router = useRouter()
    
    // ユーザー認証状態を取得
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid)
            } else {
                // パスからuserIdを取得
                const pathSegments = window.location.pathname.split('/')
                const userIndex = pathSegments.indexOf('client-view')
                if (userIndex !== -1 && pathSegments[userIndex + 1]) {
                    setUserId(pathSegments[userIndex + 1])
                }
            }
        })
        
        return () => unsubscribe()
    }, [])

    // スクロールを最下部に移動
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
        }
    }
    
    useEffect(() => {
        scrollToBottom()
    }, [messages])
    
    // AI Marketerとのチャット処理
    const handleSend = async () => {
        if (newMessage.trim() && !isLoading) {
            setIsLoading(true)
            setError(null)
            
            const userMsg: Message = {
                id: Date.now().toString(),
                text: newMessage,
                sender: "user",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: true
            }
            
            // ローディング状態のAIメッセージを追加
            const aiMsgId = (Date.now() + 1).toString()
            const loadingMsg: Message = {
                id: aiMsgId,
                text: "LOADING",  // 特別なマーカー
                sender: "ai",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false,
                isLoading: true
            }
            
            // メッセージを保存してからクリア
            const messageText = newMessage
            
            setMessages(prev => [...prev, userMsg, loadingMsg])
            setNewMessage("")
            
            // テキストエリアのサイズをリセット
            if (textareaRef.current) {
                textareaRef.current.style.height = '80px'
            }
            
            try {
                // AI Marketer APIを呼び出し
                const response = await fetch('/api/ai-marketer/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sessionId: sessionId || `temp-${Date.now()}`,
                        themeId: theme.themeId,
                        themeName: theme.theme,
                        message: messageText,  // 保存したメッセージテキストを使用
                        userId: userId || 'anonymous',
                        context: {
                            focusArea: 'general'
                        }
                    })
                })
                
                if (!response.ok) {
                    const errorData = await response.text()
                    console.error('APIエラーレスポンス:', errorData)
                    throw new Error(`AI応答の取得に失敗しました: ${response.status}`)
                }
                
                const data = await response.json()
                console.log('API応答受信:', data)
                
                // AIの応答でメッセージを更新（ローディング状態は維持）
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMsgId 
                            ? {
                                ...msg,
                                text: data.response || data.message || 'エラーが発生しました',
                                read: true,
                                isLoading: true  // まだローディング状態を維持
                            }
                            : msg
                    )
                )
                
                // 少し遅延させてからローディング状態を解除（アニメーション効果のため）
                setTimeout(() => {
                    setMessages(prev => 
                        prev.map(msg => 
                            msg.id === aiMsgId 
                                ? {
                                    ...msg,
                                    isLoading: false
                                }
                                : msg
                        )
                    )
                }, 500)  // 0.5秒後にローディング解除
                
                // 提案された質問を設定（もしあれば）
                if (data.suggestions) {
                    setSuggestions(data.suggestions)
                }
                
                // セッションIDを保存（初回のみ）
                if (!sessionId && data.sessionId) {
                    setSessionId(data.sessionId)
                }
                
            } catch (error) {
                console.error('AI応答エラー:', error)
                
                // エラーメッセージを詳細に
                const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました'
                
                // エラー時はローディングメッセージをエラーメッセージに更新
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMsgId 
                            ? {
                                ...msg,
                                text: `エラーが発生しました: ${errorMessage}\n\nもう一度お試しください。`,
                                read: true,
                                isLoading: false,
                                error: 'true'
                            }
                            : msg
                    )
                )
                setError(`メッセージの送信に失敗しました: ${errorMessage}`)
            } finally {
                setIsLoading(false)
            }
        }
    }
    
    // 既存のチャット履歴を読み込み
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!theme.themeId || !userId) return;
            
            try {
                // Firestoreからチャット履歴をリアルタイムで取得
                const messagesRef = collection(db, 'themes', theme.themeId, 'ai-marketer');
                const q = query(messagesRef, orderBy('createdAt', 'asc'));
                
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const loadedMessages: Message[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        // 現在のユーザーのメッセージのみ表示
                        if (data.userId === userId) {
                            const timestamp = data.timestamp instanceof Timestamp ? 
                                data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                                new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            
                            loadedMessages.push({
                                id: doc.id,
                                text: data.text,
                                sender: data.sender,
                                timestamp: timestamp,
                                read: data.read || true,
                                isLoading: false
                            });
                        }
                    });
                    
                    if (loadedMessages.length > 0) {
                        setMessages(loadedMessages);
                    } else {
                        // チャット履歴がない場合は初期メッセージを表示
                        const welcomeMsg: Message = {
                            id: "welcome-1",
                            text: `こんにちは！「${theme.theme}」に関するインタビュー分析結果をご覧いただきありがとうございます。\n\nサマリーレポートを基に、マーケティング戦略や行動経済学的な洞察について\nお話しできます。どのような観点から分析をご希望ですか？\n\n例えば：\n- 顧客ペルソナの詳細分析\n- 競合他社との差別化戦略\n- 価格設定の最適化\n- プロモーション戦略の提案\n\nお気軽にご質問ください。`,
                            sender: "ai",
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            read: true,
                            isLoading: false
                        };
                        setMessages([welcomeMsg]);
                    }
                    setIsInitializing(false);
                });
                
                return () => unsubscribe();
            } catch (error) {
                console.error('チャット履歴の読み込みエラー:', error);
                setIsInitializing(false);
            }
        };
        
        loadChatHistory();
    }, [theme.themeId, theme.theme, userId])

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = newMessage.trim()
            ? `${Math.min(textareaRef.current.scrollHeight, 400)}px`
            : '80px'
        }
    }

    useEffect(() => {
        adjustTextareaHeight()
    }, [newMessage])

    return (
        <div className={`rounded-xl h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl overflow-hidden ${isLoading ? styles.gradientFlow : ''}`}>
            <Image
                src="/images/emotions/Embarrassed.png"
                alt="説明テキスト"
                width={240}
                height={240}
                draggable={false}
                onLoadingComplete={() => setImageLoaded(true)}
                style={{
                    position: 'absolute',
                    top: '10%',
                    left: '88%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                    opacity: imageLoaded ? 0.2 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                }}
            />
            <Image
                src="/images/emotions/Sparkling.png"
                alt="説明テキスト"
                width={120}
                height={120}
                draggable={false}
                onLoadingComplete={() => setImageLoaded(true)}
                style={{
                    position: 'absolute',
                    top: '88%',
                    left: '18%',
                    transform: 'translate(-50%, -50%) rotate(-5deg)',
                    zIndex: 1,
                    opacity: imageLoaded ? 0.2 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                }}
            />
            <Image
                src="/images/emotions/Flame.png"
                alt="説明テキスト"
                width={360}
                height={360}
                draggable={false}
                onLoadingComplete={() => setImageLoaded(true)}
                style={{
                    position: 'absolute',
                    top: '32%',
                    left: '10%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                    opacity: imageLoaded ? 0.2 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                }}
            />
            <Image
                src="/images/emotions/Heart.png"
                alt="説明テキスト"
                width={380}
                height={380}
                draggable={false}
                onLoadingComplete={() => setImageLoaded(true)}
                style={{
                    position: 'absolute',
                    top: '80%',
                    left: '90%',
                    transform: 'translate(-50%, -50%) rotate(-30deg)',
                    zIndex: 1,
                    opacity: imageLoaded ? 0.2 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                }}
            />
            {/* ヘッダーセクション */}
            <div className="flex items-center p-3 relative overflow-hidden">
                {/* アニメーション用の背景レイヤー */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute -inset-[2px] bg-[length:200%_200%] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-flow opacity-70" />
                </div>
                
                {/* コンテンツ */}
                <div className="relative z-10 ml-2">
                    <h2 className="text-lg font-bold text-white drop-shadow-sm leading-tight mb-0">感性 AI Marketer</h2>
                    <p className="text-[10px] text-purple-200 leading-tight">インタビュー結果を用いた提案</p>
                </div>
            </div>
    
            {/* メッセージ表示エリア */}
            <div 
                className={`flex-1 overflow-y-auto p-4 scroll-dark bg-gradient-to-b from-gray-900 to-gray-800 relative`}
                style={height ? { height: `calc(${height} - 12rem)` } : undefined}
            >
                <div className="relative z-10 space-y-4">
                    {messages.map((message, index) => (
                        <div 
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end pr-4' : 'justify-start'} items-end gap-2 ${styles.messageAppear}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="pr-4">
                                {message.sender === 'ai' && (
                                    <div className={`relative ${message.isLoading ? styles.pulsingIcon : ''}`}>
                                        <img 
                                            src="/images/KanseiAiIcon.png"
                                            height={40}
                                            width={40}
                                            className="mb-3 ml-2 bg-transparent"
                                        />
                                        {message.isLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center mb-3 ml-2">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-50 animate-ping"></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className={`relative max-w-[80%] rounded-2xl ${
                                message.sender === 'user' 
                                    ? `bg-gradient-to-br px-6 py-2  from-blue-600 to-blue-500 text-white`
                                    : message.isLoading 
                                        ? `bg-gradient-to-br from-purple-600/20 to-blue-600/20 px-8 py-4 backdrop-blur-sm border border-purple-500/30`
                                        : `bg-gray-700 px-8 py-4 text-gray-100`
                                } shadow-md`}
                            >
                                {message.isLoading && message.text === "LOADING" ? (
                                    <div className="flex items-center space-x-3">
                                        <div className="flex space-x-2">
                                            <div className={`${styles.typingDot} bg-purple-400`} style={{ animationDelay: '0ms' }}></div>
                                            <div className={`${styles.typingDot} bg-blue-400`} style={{ animationDelay: '150ms' }}></div>
                                            <div className={`${styles.typingDot} bg-pink-400`} style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                        <span className="text-sm text-gray-300 ml-2 animate-pulse">
                                            分析中...
                                        </span>
                                        <div className="absolute -top-1 -right-1">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                                            </span>
                                        </div>
                                    </div>
                                ) : message.isLoading && message.text !== "LOADING" ? (
                                    // メッセージが到着したが、まだローディング表示を維持
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="flex space-x-2">
                                                <div className={`${styles.typingDot} bg-purple-400 opacity-60`} style={{ animationDelay: '0ms' }}></div>
                                                <div className={`${styles.typingDot} bg-blue-400 opacity-60`} style={{ animationDelay: '150ms' }}></div>
                                                <div className={`${styles.typingDot} bg-pink-400 opacity-60`} style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]}
                                            className={`text-sm mb-1 markdown-content text-white ${styles.animateFadeIn}`}
                                            components={{
                                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-3 text-white border-b border-gray-600 pb-2" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3 text-white" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2 text-white" {...props} />,
                                                h4: ({node, ...props}) => <h4 className="text-base font-medium mt-3 mb-1 text-white" {...props} />,
                                                p: ({node, ...props}) => <p className="my-2 text-white leading-relaxed" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc list-outside space-y-1 pl-6 my-3 text-white" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal list-outside space-y-1 pl-6 my-3 text-white" {...props} />,
                                                li: ({node, ...props}) => <li className="my-1 text-white" {...props} />,
                                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-400 pl-4 py-2 my-3 bg-gray-700/30 rounded-r italic text-gray-200" {...props} />,
                                                a: ({node, ...props}) => <a className="text-blue-300 hover:text-blue-200 underline transition-colors" {...props} />,
                                                strong: ({node, ...props}) => (
                                                    <strong className="font-bold text-white" {...props} />
                                                ),
                                                em: ({node, ...props}) => (
                                                    <em className="italic text-gray-200" {...props} />
                                                ),
                                                code: ({node, inline, ...props}) => 
                                                    inline ? (
                                                        <code className="bg-gray-700 text-purple-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                                    ) : (
                                                        <code className="block bg-gray-800 text-gray-200 p-3 rounded-lg my-3 overflow-x-auto font-mono text-sm" {...props} />
                                                    ),
                                                pre: ({node, ...props}) => (
                                                    <pre className="bg-gray-800 rounded-lg p-3 my-3 overflow-x-auto" {...props} />
                                                ),
                                                table: ({node, ...props}) => (
                                                    <div className="overflow-x-auto my-4">
                                                        <table className="min-w-full border-collapse border border-gray-600" {...props} />
                                                    </div>
                                                ),
                                                thead: ({node, ...props}) => (
                                                    <thead className="bg-gray-700" {...props} />
                                                ),
                                                tbody: ({node, ...props}) => (
                                                    <tbody className="divide-y divide-gray-600" {...props} />
                                                ),
                                                tr: ({node, ...props}) => (
                                                    <tr className="hover:bg-gray-700/50 transition-colors" {...props} />
                                                ),
                                                th: ({node, ...props}) => (
                                                    <th className="border border-gray-600 px-4 py-2 text-left font-semibold text-white" {...props} />
                                                ),
                                                td: ({node, ...props}) => (
                                                    <td className="border border-gray-600 px-4 py-2 text-white" {...props} />
                                                ),
                                                hr: ({node, ...props}) => (
                                                    <hr className="my-4 border-gray-600" {...props} />
                                                ),
                                            }}
                                        >
                                            {message.text}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    className="text-sm mb-1 markdown-content text-white"
                                    components={{
                                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-3 text-white border-b border-gray-600 pb-2" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3 text-white" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2 text-white" {...props} />,
                                        h4: ({node, ...props}) => <h4 className="text-base font-medium mt-3 mb-1 text-white" {...props} />,
                                        p: ({node, ...props}) => <p className="my-2 text-white leading-relaxed" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc list-outside space-y-1 pl-6 my-3 text-white" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal list-outside space-y-1 pl-6 my-3 text-white" {...props} />,
                                        li: ({node, ...props}) => <li className="my-1 text-white" {...props} />,
                                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-400 pl-4 py-2 my-3 bg-gray-700/30 rounded-r italic text-gray-200" {...props} />,
                                        a: ({node, ...props}) => <a className="text-blue-300 hover:text-blue-200 underline transition-colors" {...props} />,
                                        strong: ({node, ...props}) => (
                                            <strong className="font-bold text-white" {...props} />
                                        ),
                                        em: ({node, ...props}) => (
                                            <em className="italic text-gray-200" {...props} />
                                        ),
                                        code: ({node, inline, ...props}) => 
                                            inline ? (
                                                <code className="bg-gray-700 text-purple-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                            ) : (
                                                <code className="block bg-gray-800 text-gray-200 p-3 rounded-lg my-3 overflow-x-auto font-mono text-sm" {...props} />
                                            ),
                                        pre: ({node, ...props}) => (
                                            <pre className="bg-gray-800 rounded-lg p-3 my-3 overflow-x-auto" {...props} />
                                        ),
                                        table: ({node, ...props}) => (
                                            <div className="overflow-x-auto my-4">
                                                <table className="min-w-full border-collapse border border-gray-600" {...props} />
                                            </div>
                                        ),
                                        thead: ({node, ...props}) => (
                                            <thead className="bg-gray-700" {...props} />
                                        ),
                                        tbody: ({node, ...props}) => (
                                            <tbody className="divide-y divide-gray-600" {...props} />
                                        ),
                                        tr: ({node, ...props}) => (
                                            <tr className="hover:bg-gray-700/50 transition-colors" {...props} />
                                        ),
                                        th: ({node, ...props}) => (
                                            <th className="border border-gray-600 px-4 py-2 text-left font-semibold text-white" {...props} />
                                        ),
                                        td: ({node, ...props}) => (
                                            <td className="border border-gray-600 px-4 py-2 text-white" {...props} />
                                        ),
                                        hr: ({node, ...props}) => (
                                            <hr className="my-4 border-gray-600" {...props} />
                                        ),
                                    }}
                                >
                                    {message.text}
                                </ReactMarkdown>
                                )}
                                <div className="flex items-center justify-end mt-1 space-x-1">
                                    {/* <span className="text-[10px] opacity-70">{message.timestamp}</span> */}
                                    {message.sender === 'user' && (
                                        <span className={`text-[10px] ${message.read ? 'text-blue-300' : 'text-gray-400'}`}>
                                            {message.read ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </div>
                                <div className={`absolute ${
                                    message.sender === 'ai' ? '-left-1.5' : '-right-1.5'} bottom-[6px] w-3 h-3 ${
                                    message.sender === 'user' ? 'bg-blue-600' : 'bg-gray-700'} transform rotate-45`} />
                            </div>
                        </div>
                    ))}
                </div>
                {/* スクロール用の空要素 */}
                <div ref={messagesEndRef} className="h-4" />
            </div>
    
            {/* 入力エリア */}
            <div className="p-3 bg-gradient-to-t from-gray-900 to-gray-800 border-t border-gray-700 relative">
                {isLoading && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 animate-pulse"></div>
                )}
                <div className="max-w-3xl mx-auto">
                    <div className="relative flex flex-col gap-2">
                        <div className={`relative flex items-center gap-2 rounded-2xl border-2 ${isLoading ? 'border-purple-500/50' : 'border-gray-600/50'} bg-gray-800 shadow-2xl mb-2 group focus-within:border-blue-500 transition-all duration-300`}>
                            {isLoading && <div className={styles.loadingBar} />}

                            {/* テキストエリア改良 */}
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onCompositionStart={() => setIsComposing(true)}
                                onCompositionEnd={() => setIsComposing(false)}
                                onKeyDown={(e) => {
                                    // 日本語入力中（IME使用中）は送信しない
                                    if (isComposing) return;
                                    
                                    // Enterキーで送信、Shift+Enterで改行
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                className="flex-1 bg-transparent text-white placeholder-gray-500/80 text-sm resize-none focus:outline-none p-4 min-h-[44px] pr-12 leading-relaxed scroll-dark"
                                style={{
                                    lineHeight: '1.6rem',
                                    height: '80px',
                                    overflowY: 'auto'
                                }}
                                placeholder={isLoading ? "AIが応答中..." : "メッセージを入力... (Enterで送信, Shift+Enterで改行)"}
                                disabled={isLoading}
                            />

                            {/* 送信ボタン改良 */}
                            <div className="absolute right-2 bottom-2 flex items-center gap-2">
                                <span className="text-xs text-gray-500/80 font-mono">
                                    {newMessage.length}/500
                                </span>
                                <button
                                    onClick={() => handleSend()}
                                    className={`p-2 rounded-xl relative overflow-hidden ${
                                    newMessage.trim() && !isLoading
                                        ? "bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg" 
                                        : isLoading 
                                            ? "bg-gradient-to-br from-purple-600 to-blue-600 animate-pulse cursor-wait"
                                            : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                                    } transition-all transform active:scale-95 ${isLoading ? styles.sendButtonLoading : ''}`}
                                    disabled={!newMessage.trim() || isLoading}
                                >
                                    {isLoading ? (
                                        <div className="animate-spin">
                                            <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    ) : (
                                        <FaPaperPlane className="w-5 h-5 text-white/90 hover:text-white transition-colors" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default KanseiAiMarketer