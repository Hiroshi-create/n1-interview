"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

interface LoadingState {
  id: string
  message?: string
  progress?: number
  type: 'spinner' | 'progress' | 'skeleton'
}

interface LoadingContextType {
  loadingStates: Map<string, LoadingState>
  startLoading: (id: string, message?: string, type?: 'spinner' | 'progress' | 'skeleton') => void
  stopLoading: (id: string) => void
  updateProgress: (id: string, progress: number) => void
  isLoading: (id?: string) => boolean
  getLoadingState: (id: string) => LoadingState | undefined
  clearAllLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map())
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const startLoading = useCallback((
    id: string, 
    message?: string, 
    type: 'spinner' | 'progress' | 'skeleton' = 'spinner'
  ) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev)
      newMap.set(id, { id, message, type, progress: type === 'progress' ? 0 : undefined })
      return newMap
    })

    // 30秒後に自動的にローディングを解除（タイムアウト対策）
    const timeout = setTimeout(() => {
      stopLoading(id)
    }, 30000)
    
    timeoutRefs.current.set(id, timeout)
  }, [])

  const stopLoading = useCallback((id: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })

    // タイムアウトをクリア
    const timeout = timeoutRefs.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutRefs.current.delete(id)
    }
  }, [])

  const updateProgress = useCallback((id: string, progress: number) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev)
      const state = newMap.get(id)
      if (state) {
        newMap.set(id, { ...state, progress: Math.min(100, Math.max(0, progress)) })
      }
      return newMap
    })
  }, [])

  const isLoading = useCallback((id?: string) => {
    if (id) {
      return loadingStates.has(id)
    }
    return loadingStates.size > 0
  }, [loadingStates])

  const getLoadingState = useCallback((id: string) => {
    return loadingStates.get(id)
  }, [loadingStates])

  const clearAllLoading = useCallback(() => {
    // すべてのタイムアウトをクリア
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
    timeoutRefs.current.clear()
    setLoadingStates(new Map())
  }, [])

  return (
    <LoadingContext.Provider 
      value={{
        loadingStates,
        startLoading,
        stopLoading,
        updateProgress,
        isLoading,
        getLoadingState,
        clearAllLoading
      }}
    >
      {children}
    </LoadingContext.Provider>
  )
}

export const useLoading = () => {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

// 便利なカスタムフック
export const useLoadingState = (id: string) => {
  const { startLoading, stopLoading, updateProgress, getLoadingState } = useLoading()
  
  const start = useCallback((message?: string, type?: 'spinner' | 'progress' | 'skeleton') => {
    startLoading(id, message, type)
  }, [id, startLoading])

  const stop = useCallback(() => {
    stopLoading(id)
  }, [id, stopLoading])

  const update = useCallback((progress: number) => {
    updateProgress(id, progress)
  }, [id, updateProgress])

  const state = getLoadingState(id)

  return {
    start,
    stop,
    update,
    isLoading: !!state,
    progress: state?.progress,
    message: state?.message
  }
}

// 非同期処理用のラッパー
export const withLoading = async <T,>(
  id: string,
  fn: () => Promise<T>,
  options?: {
    message?: string
    onError?: (error: Error) => void
    showProgress?: boolean
  }
): Promise<T | null> => {
  const loading = useLoading()
  
  try {
    loading.startLoading(id, options?.message, options?.showProgress ? 'progress' : 'spinner')
    const result = await fn()
    return result
  } catch (error) {
    if (options?.onError) {
      options.onError(error as Error)
    }
    return null
  } finally {
    loading.stopLoading(id)
  }
}