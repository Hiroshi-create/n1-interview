"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ToastContainer, ToastMessage, ToastType } from '@/context/components/ui/toast'

interface ToastContextType {
  showToast: (type: ToastType, title: string, description?: string, duration?: number) => void
  success: (title: string, description?: string, duration?: number) => void
  error: (title: string, description?: string, duration?: number) => void
  warning: (title: string, description?: string, duration?: number) => void
  info: (title: string, description?: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastId = 0

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  
  const showToast = useCallback((
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => {
    const id = `toast-${Date.now()}-${++toastId}`
    const message: ToastMessage = {
      id,
      type,
      title,
      description,
      duration: duration || 5000,
    }
    
    setMessages((prev) => {
      // 最大5件まで表示
      const newMessages = [...prev, message]
      if (newMessages.length > 5) {
        return newMessages.slice(-5)
      }
      return newMessages
    })
  }, [])
  
  const removeToast = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }, [])
  
  const contextValue: ToastContextType = {
    showToast,
    success: (title, description, duration) => 
      showToast('success', title, description, duration),
    error: (title, description, duration) => 
      showToast('error', title, description, duration),
    warning: (title, description, duration) => 
      showToast('warning', title, description, duration),
    info: (title, description, duration) => 
      showToast('info', title, description, duration),
  }
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer messages={messages} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}