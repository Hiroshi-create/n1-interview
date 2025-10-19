"use client"

import React, { useState, useEffect } from 'react'
import { Filter, X, ChevronDown, ChevronUp, RotateCcw, Calendar } from 'lucide-react'
import { Button } from '@/context/components/ui/button'
import { Label } from '@/context/components/ui/label'
import { Switch } from '@/context/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/context/components/ui/select'
import { Input } from '@/context/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/context/components/ui/sheet'
import { cn } from '@/context/lib/utils'
import { useIsMobile } from '@/context/hooks/useIsMobile'

export interface FilterOptions {
  keyword?: string
  organizationName?: string
  isPublic?: boolean
  isTest?: boolean
  isCustomer?: boolean
  deadlineFrom?: string
  deadlineTo?: string
  status?: 'all' | 'open' | 'closed' | 'achieved'
  answered?: 'all' | 'answered' | 'unanswered'
  duration?: 'all' | 30 | 60
  sortBy?: 'createdAt' | 'deadline' | 'achievementRate' | 'popularity'
  sortOrder?: 'asc' | 'desc'
}

interface FilterPanelProps {
  filters: FilterOptions
  onChange: (filters: FilterOptions) => void
  onApply: () => void
  onReset: () => void
  className?: string
  showAsSheet?: boolean
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onApply,
  onReset,
  className,
  showAsSheet = false
}) => {
  const isMobile = useIsMobile()
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    basic: true,
    status: true,
    sort: true
  })
  const [appliedCount, setAppliedCount] = useState(0)

  // 適用されているフィルター数を計算
  useEffect(() => {
    let count = 0
    if (filters.organizationName) count++
    if (filters.isTest !== undefined) count++
    if (filters.isCustomer !== undefined) count++
    if (filters.deadlineFrom) count++
    if (filters.deadlineTo) count++
    if (filters.status && filters.status !== 'all') count++
    if (filters.answered && filters.answered !== 'all') count++
    if (filters.duration && filters.duration !== 'all') count++
    setAppliedCount(count)
  }, [filters])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onChange({
      ...filters,
      [key]: value
    })
  }

  const handleReset = () => {
    // すべてのフィルターを初期状態にリセット
    onChange({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      isPublic: true
    })
    onReset()
  }

  const FilterContent = () => (
    <div className="space-y-3">
      {/* 基本フィルター */}
      <div className="border-b pb-2">
        <button
          onClick={() => toggleSection('basic')}
          className="flex items-center justify-between w-full text-left text-sm font-medium mb-2"
        >
          <span>基本フィルター</span>
          {expandedSections.basic ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {expandedSections.basic && (
          <div className="space-y-2">
            {/* 組織名 */}
            <div>
              <Label htmlFor="organizationName" className="text-xs">組織名</Label>
              <Input
                id="organizationName"
                type="text"
                value={filters.organizationName || ''}
                onChange={(e) => handleFilterChange('organizationName', e.target.value)}
                placeholder="組織名で絞り込み"
                className="mt-1"
              />
            </div>

            {/* 公開設定 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isPublic" className="text-sm">公開テーマのみ</Label>
              <Switch
                id="isPublic"
                checked={filters.isPublic !== false}
                onCheckedChange={(checked) => handleFilterChange('isPublic', checked ? undefined : false)}
              />
            </div>

            {/* テスト */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isTest" className="text-sm">テストを含む</Label>
              <Switch
                id="isTest"
                checked={filters.isTest === true}
                onCheckedChange={(checked) => handleFilterChange('isTest', checked ? true : undefined)}
              />
            </div>

            {/* 対象 */}
            <div>
              <Label className="text-sm">対象</Label>
              <Select
                value={filters.isCustomer === true ? 'customer' : filters.isCustomer === false ? 'internal' : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') handleFilterChange('isCustomer', undefined)
                  else if (value === 'customer') handleFilterChange('isCustomer', true)
                  else handleFilterChange('isCustomer', false)
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="customer">顧客向け</SelectItem>
                  <SelectItem value="internal">社内向け</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* ステータスフィルター */}
      <div className="border-b pb-4">
        <button
          onClick={() => toggleSection('status')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
        >
          <span>ステータス</span>
          {expandedSections.status ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {expandedSections.status && (
          <div className="space-y-3">
            {/* 募集状況 */}
            <div>
              <Label className="text-sm">募集状況</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="open">募集中</SelectItem>
                  <SelectItem value="closed">締切済み</SelectItem>
                  <SelectItem value="achieved">達成済み</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 回答状態 */}
            <div>
              <Label className="text-sm">回答状態</Label>
              <Select
                value={filters.answered || 'all'}
                onValueChange={(value) => handleFilterChange('answered', value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="answered">回答済み</SelectItem>
                  <SelectItem value="unanswered">未回答</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* インタビュー時間 */}
            <div>
              <Label className="text-sm">インタビュー時間</Label>
              <Select
                value={filters.duration?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange('duration', value === 'all' ? 'all' : parseInt(value))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="30">30分</SelectItem>
                  <SelectItem value="60">60分</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 締切日範囲 */}
            <div>
              <Label className="text-sm">締切日範囲</Label>
              <div className="space-y-2 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 min-w-[2rem]">開始:</span>
                  <Input
                    type="date"
                    value={filters.deadlineFrom || ''}
                    onChange={(e) => handleFilterChange('deadlineFrom', e.target.value)}
                    className="flex-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 min-w-[2rem]">終了:</span>
                  <Input
                    type="date"
                    value={filters.deadlineTo || ''}
                    onChange={(e) => handleFilterChange('deadlineTo', e.target.value)}
                    className="flex-1 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ソート */}
      <div className="pb-4">
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full text-left font-medium mb-3"
        >
          <span>並び順</span>
          {expandedSections.sort ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {expandedSections.sort && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">並び替え</Label>
              <Select
                value={filters.sortBy || 'createdAt'}
                onValueChange={(value) => handleFilterChange('sortBy', value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">作成日</SelectItem>
                  <SelectItem value="deadline">締切日</SelectItem>
                  <SelectItem value="achievementRate">達成率</SelectItem>
                  <SelectItem value="popularity">人気順</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">順序</Label>
              <Select
                value={filters.sortOrder || 'desc'}
                onValueChange={(value) => handleFilterChange('sortOrder', value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">降順</SelectItem>
                  <SelectItem value="asc">昇順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          onClick={handleReset}
          variant="outline"
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          リセット
        </Button>
        <Button
          onClick={onApply}
          className="flex-1"
        >
          <Filter className="h-4 w-4 mr-2" />
          適用
        </Button>
      </div>
    </div>
  )

  // モバイルまたはshowAsSheetがtrueの場合はシートとして表示
  if (isMobile || showAsSheet) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className={className}>
            <Filter className="h-4 w-4 mr-2" />
            フィルター
            {appliedCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {appliedCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side={isMobile ? "bottom" : "right"} className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>フィルター</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // デスクトップの場合はパネルとして表示
  return (
    <div className={cn("bg-white rounded-lg border p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">フィルター</h3>
        {appliedCount > 0 && (
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {appliedCount}件適用中
          </span>
        )}
      </div>
      <FilterContent />
    </div>
  )
}