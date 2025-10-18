"use client"

import { Card } from "@/components/ui/card"

interface LoadingSkeletonProps {
  variant?: "card" | "text" | "avatar" | "button" | "list"
  className?: string
}

export function LoadingSkeleton({ variant = "card", className = "" }: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-muted rounded"
  
  switch (variant) {
    case "card":
      return (
        <Card className={`p-6 bg-card cartoon-border cartoon-shadow ${className}`}>
          <div className="space-y-4">
            <div className={`h-6 w-3/4 ${baseClasses}`}></div>
            <div className={`h-4 w-full ${baseClasses}`}></div>
            <div className={`h-4 w-2/3 ${baseClasses}`}></div>
          </div>
        </Card>
      )
    
    case "text":
      return (
        <div className={`space-y-2 ${className}`}>
          <div className={`h-4 w-full ${baseClasses}`}></div>
          <div className={`h-4 w-3/4 ${baseClasses}`}></div>
          <div className={`h-4 w-1/2 ${baseClasses}`}></div>
        </div>
      )
    
    case "avatar":
      return (
        <div className={`w-12 h-12 ${baseClasses} rounded-full ${className}`}></div>
      )
    
    case "button":
      return (
        <div className={`h-10 w-24 ${baseClasses} ${className}`}></div>
      )
    
    case "list":
      return (
        <div className={`space-y-3 ${className}`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-16 w-full ${baseClasses}`}></div>
          ))}
        </div>
      )
    
    default:
      return <div className={`h-4 w-full ${baseClasses} ${className}`}></div>
  }
}

// Pre-built skeleton components for common use cases
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LoadingSkeleton variant="avatar" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
          <div className="flex gap-3">
            <LoadingSkeleton variant="button" />
            <LoadingSkeleton variant="button" />
          </div>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="list" />
          </div>
          <div>
            <LoadingSkeleton variant="list" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function BattleSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="h-8 w-32 bg-muted animate-pulse rounded"></div>
              <div className="flex gap-4">
                <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
                <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-4 w-full bg-muted animate-pulse rounded"></div>

            {/* Question */}
            <div className="space-y-4">
              <div className="h-8 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded"></div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 w-full bg-muted animate-pulse rounded-xl"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
