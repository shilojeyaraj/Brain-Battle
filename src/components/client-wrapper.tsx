"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { BrainBattleLoading } from "@/components/ui/brain-battle-loading"

interface ClientWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ClientWrapper({ children, fallback }: ClientWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  
  // Public pages that don't need loading screen
  const publicPages = ['/', '/pricing', '/login', '/signup', '/auth/login', '/auth/signup']
  const isPublicPage = pathname && publicPages.includes(pathname)

  useEffect(() => {
    // For public pages (especially homepage), render immediately without delay
    if (isPublicPage) {
      setMounted(true)
      return
    }
    
    // For other pages, use a minimal delay to prevent flash
    // Use requestAnimationFrame to ensure it happens after initial render
    requestAnimationFrame(() => {
      setMounted(true)
    })
  }, [isPublicPage])

  // For public pages, render immediately without loading screen
  if (isPublicPage) {
    return <>{children}</>
  }

  // For other pages, show loading only if not mounted yet
  if (!mounted) {
    return fallback || (
      <div className="fixed inset-0 z-[9999]">
        <BrainBattleLoading message="Loading Brain Battle..." />
      </div>
    )
  }

  return <>{children}</>
}
