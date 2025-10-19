"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Clock, TrendingUp, Mic, MicOff } from 'lucide-react'
import { Input } from '@/context/components/ui/input'
import { Button } from '@/context/components/ui/button'
import { cn } from '@/context/lib/utils'
import { Spinner } from '@/context/components/ui/loading'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (value: string) => void
  placeholder?: string
  className?: string
  isLoading?: boolean
  showHistory?: boolean
  showTrending?: boolean
  autoFocus?: boolean
  enableVoice?: boolean
}

interface SearchHistory {
  query: string
  timestamp: number
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "テーマを検索...",
  className,
  isLoading = false,
  showHistory = true,
  showTrending = true,
  autoFocus = false,
  enableVoice = true
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [trendingSearches] = useState<string[]>([
    "新商品開発",
    "顧客満足度調査",
    "ブランドイメージ",
    "ユーザビリティテスト",
    "市場調査"
  ])
  const [isListening, setIsListening] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // 検索履歴の読み込み
  useEffect(() => {
    if (showHistory) {
      const saved = localStorage.getItem('searchHistory')
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SearchHistory[]
          setSearchHistory(parsed.slice(0, 5)) // 最新5件
        } catch (error) {
          console.error('Failed to parse search history:', error)
        }
      }
    }
  }, [showHistory])

  // 検索履歴の保存
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim() || !showHistory) return

    const newEntry: SearchHistory = {
      query: query.trim(),
      timestamp: Date.now()
    }

    const updated = [
      newEntry,
      ...searchHistory.filter(h => h.query !== query.trim())
    ].slice(0, 10)

    setSearchHistory(updated)
    localStorage.setItem('searchHistory', JSON.stringify(updated))
  }, [searchHistory, showHistory])

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value && value.length >= 2) {
        // リアルタイム検索のトリガー（必要に応じて）
      }
    }, 200) // 300msから200msに短縮してレスポンスを速く

    return () => clearTimeout(timer)
  }, [value])

  // 音声認識の初期化
  useEffect(() => {
    if (enableVoice && typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'ja-JP'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        onChange(transcript)
        setIsListening(false)
        handleSearch(transcript)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [enableVoice, onChange])

  const handleSearch = useCallback((searchValue?: string) => {
    const query = searchValue || value
    if (query.trim()) {
      saveToHistory(query)
      onSearch(query)
      setShowSuggestions(false)
    }
  }, [value, onSearch, saveToHistory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const handleHistoryClick = (query: string) => {
    onChange(query)
    handleSearch(query)
  }

  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('searchHistory')
  }

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true)
            setShowSuggestions(true)
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsFocused(false)
              setShowSuggestions(false)
            }, 200)
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "pl-10 pr-24",
            isFocused && "ring-2 ring-blue-500",
            className
          )}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isLoading && <Spinner size="sm" />}
          
          {value && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {enableVoice && recognitionRef.current && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleVoiceSearch}
              className={cn(
                "h-7 w-7 p-0",
                isListening && "text-red-500"
              )}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => handleSearch()}
            disabled={!value.trim() || isLoading}
            className="h-8"
          >
            検索
          </Button>
        </div>
      </div>

      {/* 検索候補・履歴 */}
      {showSuggestions && (searchHistory.length > 0 || trendingSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
          {/* 検索履歴 */}
          {showHistory && searchHistory.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  最近の検索
                </div>
                <button
                  onClick={clearHistory}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  クリア
                </button>
              </div>
              <div className="space-y-1">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(item.query)}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded"
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* トレンド検索 */}
          {showTrending && trendingSearches.length > 0 && (
            <div className="p-3">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <TrendingUp className="h-4 w-4 mr-1" />
                人気の検索
              </div>
              <div className="space-y-1">
                {trendingSearches.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(term)}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded flex items-center"
                  >
                    <span className="text-gray-400 mr-2">#{index + 1}</span>
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 音声認識インジケーター */}
      {isListening && (
        <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center">
          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
            音声入力中...
          </div>
        </div>
      )}
    </div>
  )
}