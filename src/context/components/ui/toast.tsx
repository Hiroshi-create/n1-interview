"use client"

import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/context/lib/utils'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastProps {
  message: ToastMessage
  onClose: (id: string) => void
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const iconStyles = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  
  const Icon = toastIcons[message.type]
  
  useEffect(() => {
    // アニメーション用の遅延
    setTimeout(() => setIsVisible(true), 10)
    
    // 自動クローズ
    const duration = message.duration || 5000
    const timer = setTimeout(() => {
      handleClose()
    }, duration)
    
    return () => clearTimeout(timer)
  }, [message])
  
  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose(message.id)
    }, 300)
  }
  
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 mb-3 border rounded-lg shadow-lg transition-all duration-300 transform',
        toastStyles[message.type],
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconStyles[message.type])} />
      
      <div className="flex-1">
        <p className="font-medium text-sm">{message.title}</p>
        {message.description && (
          <p className="mt-1 text-sm opacity-90">{message.description}</p>
        )}
      </div>
      
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Toast Container Component
interface ToastContainerProps {
  messages: ToastMessage[]
  onClose: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onClose }) => {
  if (messages.length === 0) return null
  
  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full pointer-events-none">
      <div className="pointer-events-auto">
        {messages.map((message) => (
          <Toast key={message.id} message={message} onClose={onClose} />
        ))}
      </div>
    </div>
  )
}

// Toast Hook
let toastId = 0

export const useToast = () => {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  
  const showToast = (
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => {
    const id = `toast-${++toastId}`
    const message: ToastMessage = {
      id,
      type,
      title,
      description,
      duration,
    }
    
    setMessages((prev) => [...prev, message])
  }
  
  const removeToast = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }
  
  const toast = {
    success: (title: string, description?: string, duration?: number) =>
      showToast('success', title, description, duration),
    error: (title: string, description?: string, duration?: number) =>
      showToast('error', title, description, duration),
    warning: (title: string, description?: string, duration?: number) =>
      showToast('warning', title, description, duration),
    info: (title: string, description?: string, duration?: number) =>
      showToast('info', title, description, duration),
  }
  
  return {
    toast,
    messages,
    removeToast,
  }
}