"use client"

import React from 'react'
import { cn } from '@/context/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'primary' | 'secondary' | 'white'
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  className,
  color = 'primary'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white'
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn(
        "animate-spin rounded-full border-b-2 border-current",
        sizeClasses[size],
        colorClasses[color]
      )} />
    </div>
  )
}

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  fullScreen?: boolean
  className?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  visible, 
  message,
  fullScreen = false,
  className 
}) => {
  if (!visible) return null

  return (
    <div className={cn(
      "flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50",
      fullScreen ? "fixed inset-0" : "absolute inset-0",
      className
    )}>
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      )}
    </div>
  )
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  loading = false,
  loadingText = "処理中...",
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      disabled={loading || disabled}
      className={cn(
        "relative inline-flex items-center justify-center px-4 py-2 font-medium rounded-md",
        "bg-blue-600 text-white hover:bg-blue-700",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-200",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" color="white" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className,
  variant = 'text',
  animation = 'pulse'
}) => {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }

  return (
    <div
      className={cn(
        'bg-gray-200',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  )
}

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  className?: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value,
  max = 100,
  showLabel = false,
  className,
  color = 'primary'
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-all duration-300 ease-out rounded-full",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-600 text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  )
}

interface LoadingDotsProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ 
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'space-x-1',
    md: 'space-x-2',
    lg: 'space-x-3'
  }

  const dotSizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      <div className={cn(dotSizeClasses[size], "bg-gray-500 rounded-full animate-bounce")} 
           style={{ animationDelay: '0ms' }} />
      <div className={cn(dotSizeClasses[size], "bg-gray-500 rounded-full animate-bounce")} 
           style={{ animationDelay: '150ms' }} />
      <div className={cn(dotSizeClasses[size], "bg-gray-500 rounded-full animate-bounce")} 
           style={{ animationDelay: '300ms' }} />
    </div>
  )
}

interface LoadingCardProps {
  lines?: number
  showAvatar?: boolean
  className?: string
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  lines = 3,
  showAvatar = false,
  className
}) => {
  return (
    <div className={cn("p-4 bg-white rounded-lg shadow", className)}>
      {showAvatar && (
        <div className="flex items-center mb-4">
          <Skeleton variant="circular" className="h-10 w-10 mr-3" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4 mb-2",
            i === lines - 1 ? "w-2/3" : "w-full"
          )} 
        />
      ))}
    </div>
  )
}