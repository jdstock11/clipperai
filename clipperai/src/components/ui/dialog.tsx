import * as React from "react"
import { cn } from "@/lib/utils"

// A simple native-dialog based component for the MVP, avoiding complex Radix installations.
export function Dialog({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-cyan-900/20">
        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 text-zinc-400 hover:text-white">✕</button>
        {children}
      </div>
    </div>
  )
}

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
)

export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-white", className)} {...props} />
)

export const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-zinc-400", className)} {...props} />
)

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)} {...props} />
)
