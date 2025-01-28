import * as React from "react"
import { cn } from "@/context/lib/utils"

const Header = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
})
Header.displayName = "Header"

export {
    Header
}