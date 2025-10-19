"use client"

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LoadingOverlay, ProgressBar } from '@/context/components/ui/loading'
import { useLoading } from '@/context/LoadingContext'

export const GlobalLoadingIndicator: React.FC = () => {
  const pathname = usePathname()
  const { isLoading, loadingStates } = useLoading()
  const [showPageTransition, setShowPageTransition] = useState(false)
  const [progress, setProgress] = useState(0)

  // ページ遷移時のローディング
  useEffect(() => {
    setShowPageTransition(true)
    setProgress(0)
    
    const timer1 = setTimeout(() => setProgress(33), 100)
    const timer2 = setTimeout(() => setProgress(66), 200)
    const timer3 = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setShowPageTransition(false)
        setProgress(0)
      }, 200)
    }, 300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [pathname])

  // グローバルローディング状態の計算
  const activeLoadings = Array.from(loadingStates.values()).filter(
    state => state.type === 'spinner' || state.type === 'progress'
  )
  
  const showGlobalLoading = activeLoadings.length > 0

  // プログレスバーの進捗計算
  const averageProgress = activeLoadings
    .filter(state => state.progress !== undefined)
    .reduce((acc, state) => acc + (state.progress || 0), 0) / 
    (activeLoadings.filter(state => state.progress !== undefined).length || 1)

  // 最も重要なローディングメッセージを取得
  const primaryMessage = activeLoadings.find(state => state.message)?.message

  if (!showPageTransition && !showGlobalLoading) {
    return null
  }

  return (
    <>
      {/* ページ遷移時のプログレスバー */}
      {showPageTransition && (
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <ProgressBar 
            value={progress} 
            max={100} 
            color="primary"
            className="h-1"
          />
        </div>
      )}

      {/* グローバルローディングオーバーレイ */}
      {showGlobalLoading && (
        <LoadingOverlay
          visible={true}
          message={primaryMessage}
          fullScreen={false}
          className="fixed top-16 right-4 w-64 h-24 rounded-lg shadow-lg bg-white/95"
        />
      )}

      {/* 複数の同時ローディング表示 */}
      {activeLoadings.length > 1 && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {activeLoadings.slice(0, 3).map((state, index) => (
            <div
              key={state.id}
              className="bg-white rounded-lg shadow-md p-3 flex items-center space-x-3"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600">
                {state.message || `処理中 ${index + 1}/${activeLoadings.length}`}
              </span>
            </div>
          ))}
          {activeLoadings.length > 3 && (
            <div className="bg-gray-100 rounded-lg shadow-md p-2 text-center">
              <span className="text-xs text-gray-500">
                他 {activeLoadings.length - 3} 件の処理中...
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// エラー通知コンポーネント
interface ErrorNotificationProps {
  error: string | null
  onClose: () => void
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ error, onClose }) => {
  useEffect(() => {
    if (error) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, onClose])

  if (!error) return null

  return (
    <div className="fixed top-20 right-4 max-w-sm z-50 animate-slide-in-right">
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 inline-flex text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">閉じる</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}