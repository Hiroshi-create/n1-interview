"use client"

import { useEffect, useRef, useState } from "react"
import { FaPaperPlane } from "react-icons/fa"
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from "next/image";

interface Message {
  id: string
  text: string
  sender: "user" | "ai"
  timestamp: string
  read: boolean
}

const TestChat = (): JSX.Element => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [messages, setMessages] = useState<Message[]>(
        [
        {
        id: "1",
        text: "こんにちは！インタビューのフィードバックをご確認ください",
        sender: "ai",
        timestamp: "10:00 AM",
        read: true
        }
    ]);
    const [newMessage, setNewMessage] = useState("")
    const [imageLoaded, setImageLoaded] = useState(false)

    const handleSend = () => {
        if (newMessage.trim()) {
            setMessages([...messages, {
                id: Date.now().toString(),
                text: newMessage,
                sender: "user",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false
            }])
            setNewMessage("")
            // テキストエリアのサイズをリセット
            if (textareaRef.current) {
                textareaRef.current.style.height = '80px'
            }
        }
    }

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
        <div className={`rounded-xl h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-800 shadow-2xl overflow-hidden relative`}>
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
                    <h2 className="text-lg font-bold text-white drop-shadow-sm leading-tight mb-0">テストチャット</h2>
                    <p className="text-[10px] text-purple-200 leading-tight">テストチャット</p>
                </div>
            </div>
    
            {/* メッセージ表示エリア */}
            <div 
                className={`flex-1 overflow-y-auto p-4 scroll-dark bg-gradient-to-b from-gray-900 to-gray-800 pb-32 relative`}
                // style={height ? { height: `calc(${height} - 8rem)` } : undefined}
            >
                <div className="relative z-10 space-y-4">
                    {messages.map((message) => (
                        <div 
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end pr-4' : 'justify-start'} items-end gap-2`}
                        >
                            <div className="pr-4">
                                {message.sender === 'ai' && (
                                    <img 
                                        src="/images/KanseiAiIcon.png"
                                        height={40}
                                        width={40}
                                        className="mb-3 ml-2 bg-transparent"
                                    />
                                )}
                            </div>
                            <div className={`relative max-w-[80%] rounded-2xl ${
                                message.sender === 'user' 
                                    ? `bg-gradient-to-br px-6 py-2  from-blue-600 to-blue-500 text-white`
                                    : `bg-gray-700 px-8 py-4 text-gray-100`
                                } shadow-md`}
                            >
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    className="text-sm mb-1 markdown-content text-white"
                                    components={{
                                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-2 mb-4 text-white" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-2 mb-3 text-white" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2 text-white" {...props} />,
                                        h4: ({node, ...props}) => <h4 className="text-base font-medium mt-3 mb-1 text-white" {...props} />,
                                        p: ({node, ...props}) => <p className="my-4 text-white" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc list-outside space-y-1 pl-6 ml-4 text-white" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal list-outside space-y-1 pl-6 ml-4 text-white" {...props} />,
                                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-4 text-white" {...props} />,
                                        a: ({node, ...props}) => <a className="text-blue-300 hover:underline" {...props} />,
                                        strong: ({node, ...props}) => (
                                        <strong 
                                            className="flex font-semibold text-white pl-4 ml-[-16px]"
                                            style={{
                                            lineHeight: '1.8',
                                            display: 'block',
                                            position: 'relative'
                                            }}
                                            {...props}
                                        />
                                        ),
                                        em: ({node, ...props}) => (
                                        <em className="italic text-gray-300 bg-gray-700 px-2 py-1 rounded" {...props} />
                                        ),
                                    }}
                                >
                                    {message.text}
                                </ReactMarkdown>
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
            </div>

            {/* 入力エリア */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10 bg-transparent to-transparent">
                <div className="max-w-3xl mx-auto">
                    <div className="relative flex flex-col gap-2">
                        <div className="relative flex items-center gap-2 rounded-2xl border-2 border-gray-600/50 bg-gray-800 shadow-2xl mb-2 group focus-within:border-blue-500 transition-all duration-300">

                            {/* テキストエリア改良 */}
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1 bg-transparent text-white placeholder-gray-500/80 text-sm resize-none focus:outline-none p-4 min-h-[44px] pr-12 leading-relaxed scroll-dark"
                                style={{
                                    lineHeight: '1.6rem',
                                    height: '80px',
                                    overflowY: 'auto'
                                }}
                                placeholder="メッセージを入力..."
                            />

                            {/* 送信ボタン改良 */}
                            <div className="absolute right-2 bottom-2 flex items-center gap-2">
                                <span className="text-xs text-gray-500/80 font-mono">
                                    {newMessage.length}/500
                                </span>
                                <button
                                    onClick={handleSend}
                                    className={`p-2 rounded-xl ${
                                    newMessage.trim() 
                                        ? "bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg" 
                                        : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                                    } transition-all transform active:scale-95`}
                                    disabled={!newMessage.trim()}
                                >
                                    <FaPaperPlane className="w-5 h-5 text-white/90 hover:text-white transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TestChat