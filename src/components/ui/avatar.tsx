// Avatarコンポーネントの修正版
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

interface ExtendedAvatarProps {
  src?: string
  size?: 'sm' | 'md' | 'lg'
  status?: 'online' | 'offline' | 'busy' | 'away'
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & ExtendedAvatarProps
>(({ className, src, size = 'md', status, ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-300',
    busy: 'bg-red-500',
    away: 'bg-yellow-500'
  }

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {src && (
          <AvatarPrimitive.Image
            src={src}
            className="aspect-square h-full w-full"
          />
        )}
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center rounded-full bg-muted"
        />
      </AvatarPrimitive.Root>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-background",
            statusColors[status]
          )}
        />
      )}
    </div>
  )
})
Avatar.displayName = "Avatar"

export { Avatar }
