"use client"

import { useEffect, useRef, useState } from "react"
import type { Theme } from "@/stores/Theme"
import { FaPaperPlane, FaSmile, FaImage } from "react-icons/fa"
import { Avatar } from "@/components/ui/avatar"
import { Globe, Lightbulb, Mic, Plus } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: "user" | "ai"
  timestamp: string
  read: boolean
}

interface ComponentProps {
  theme: Theme
  height?: string
}

const KanseiAiMarketer = ({ theme, height = "h-96" }: ComponentProps): JSX.Element => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [messages, setMessages] = useState<Message[]>([
        {
        id: "1",
        text: "こんにちは！インタビューのフィードバックをご確認ください",
        sender: "ai",
        timestamp: "10:00 AM",
        read: true
        }
    ])
    const [newMessage, setNewMessage] = useState("")

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
            {/* ヘッダーセクション */}
            <div className="flex items-center p-3 relative overflow-hidden">
                {/* アニメーション用の背景レイヤー */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute -inset-[2px] bg-[length:200%_200%] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-gradient-flow opacity-70" />
                </div>
                
                {/* コンテンツ */}
                <div className="relative z-10 ml-2">
                    <h2 className="text-lg font-bold text-white drop-shadow-sm leading-tight mb-0">感性 AI Copilot</h2>
                    <p className="text-[10px] text-purple-200 leading-tight">インタビュー結果を用いた提案</p>
                </div>
            </div>
    
            {/* メッセージ表示エリア */}
            <div 
                className={`flex-1 overflow-y-auto p-4 space-y-4 scroll-dark bg-gradient-to-b from-gray-900 to-gray-800 pb-32`}
                style={height ? { height: `calc(${height} - 8rem)` } : undefined}
            >
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
                        <div className={`relative max-w-[80%] p-3 rounded-2xl ${
                            message.sender === 'user' 
                                ? `bg-gradient-to-br from-blue-600 to-blue-500 text-white`
                                : `bg-gray-700 text-gray-100`
                            } shadow-md`}
                        >
                            <p 
                                className="text-sm mb-1"
                                style={{ whiteSpace: 'pre-line' }}
                            >
                                {message.text}
                            </p>
                            <div className="flex items-center justify-end mt-1 space-x-1">
                                <span className="text-[10px] opacity-70">{message.timestamp}</span>
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
    
            {/* 入力エリア */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-transparent to-transparent">
                <div className="max-w-3xl mx-auto">
                    <div className="relative flex flex-col gap-2">
                        <div className="relative flex items-center gap-2 rounded-2xl border-2 border-gray-600/50 bg-gray-800 shadow-2xl mb-2 group focus-within:border-blue-500 transition-all duration-300">
                            {/* リッチテキスト機能追加 */}
                            <div className="pl-3 flex items-center space-x-2 border-r border-gray-600/50">
                                <button className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-blue-400 transition-colors tooltip" data-tooltip="絵文字">
                                    <FaSmile className="w-5 h-5" />
                                </button>
                                <button className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-green-400 transition-colors tooltip" data-tooltip="画像追加">
                                    <FaImage className="w-5 h-5" />
                                </button>
                                <button className="p-1.5 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-purple-400 transition-colors tooltip" data-tooltip="音声入力">
                                    <Mic className="w-5 h-5" />
                                </button>
                            </div>

                            {/* テキストエリア改良 */}
                            <textarea
                                ref={textareaRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1 bg-transparent text-white placeholder-gray-500/80 text-sm resize-none focus:outline-none p-3 min-h-[44px] pr-12 leading-relaxed scroll-dark"
                                style={{
                                    lineHeight: '1.6rem',
                                    height: '80px',
                                    overflowY: 'auto'
                                }}
                                placeholder="メッセージを入力または'/'でコマンド選択..."
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

export default KanseiAiMarketer