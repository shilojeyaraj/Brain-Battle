"use client"

import * as React from "react"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export type ToastVariant = "default" | "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  title?: string
  description: string
  variant?: ToastVariant
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps extends Toast {
  onClose: () => void
}

const ToastComponent = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, title, description, variant = "default", duration = 5000, action, onClose }, ref) => {
    React.useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          onClose()
        }, duration)
        return () => clearTimeout(timer)
      }
    }, [duration, onClose])

    const icons = {
      success: CheckCircle2,
      error: AlertCircle,
      warning: AlertTriangle,
      info: Info,
      default: Info,
    }

    const Icon = icons[variant]

    const variantStyles = {
      default: "bg-slate-800 border-slate-600/50 text-white",
      success: "bg-green-500/20 border-green-500/50 text-green-400",
      error: "bg-red-500/20 border-red-500/50 text-red-400",
      warning: "bg-orange-500/20 border-orange-500/50 text-orange-400",
      info: "bg-blue-500/20 border-blue-500/50 text-blue-400",
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative flex w-full max-w-md items-start gap-3 rounded-xl border-4 p-4 shadow-lg",
          variantStyles[variant]
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={3} />
        <div className="flex-1 min-w-0">
          {title && (
            <p className="font-black text-sm mb-1">{title}</p>
          )}
          <p className="text-sm font-bold">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-xs font-black underline hover:no-underline transition-all"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-md p-1 hover:bg-black/20 transition-colors"
          aria-label="Close toast"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </motion.div>
    )
  }
)
ToastComponent.displayName = "Toast"

interface ToastContextValue {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
  success: (description: string, title?: string) => void
  error: (description: string, title?: string) => void
  warning: (description: string, title?: string) => void
  info: (description: string, title?: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((newToast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...newToast, id }])
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = React.useCallback((description: string, title?: string) => {
    toast({ description, title, variant: "success" })
  }, [toast])

  const error = React.useCallback((description: string, title?: string) => {
    toast({ description, title, variant: "error" })
  }, [toast])

  const warning = React.useCallback((description: string, title?: string) => {
    toast({ description, title, variant: "warning" })
  }, [toast])

  const info = React.useCallback((description: string, title?: string) => {
    toast({ description, title, variant: "info" })
  }, [toast])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-md">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastComponent {...toast} onClose={() => onDismiss(toast.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

