"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
  size?: "sm" | "md" | "lg"
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: "p-6",
    md: "p-8",
    lg: "p-12",
  }

  const iconSizes = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  }

  const ActionButton = action?.href ? (
    <Button
      asChild
      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400"
    >
      <a href={action.href}>{action.label}</a>
    </Button>
  ) : action ? (
    <Button
      onClick={action.onClick}
      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400"
    >
      {action.label}
    </Button>
  ) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 text-center",
          sizeClasses[size],
          className
        )}
      >
        {Icon && (
          <div className="flex justify-center mb-4">
            <div className={cn("text-blue-400/50", iconSizes[size])}>
              <Icon className="w-full h-full" strokeWidth={1.5} />
            </div>
          </div>
        )}
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-blue-100/70 font-bold mb-6 max-w-md mx-auto">{description}</p>
        {ActionButton && <div className="flex justify-center">{ActionButton}</div>}
      </Card>
    </motion.div>
  )
}

