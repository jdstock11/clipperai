import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "border-transparent bg-blue-600 text-white hover:bg-blue-700 shadow-[0_0_10px_rgba(37,99,235,0.4)]",
    secondary: "border-transparent bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
    destructive: "border-transparent bg-red-600/20 text-red-500 border border-red-600/50 hover:bg-red-600/30",
    success: "border-transparent bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30",
    outline: "text-zinc-100 border-zinc-700",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
