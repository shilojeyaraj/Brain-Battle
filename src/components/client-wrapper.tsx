"use client"

import { useEffect, useState } from "react"

interface ClientWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ClientWrapper({ children, fallback }: ClientWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return fallback || <div className="animate-pulse">Loading...</div>
  }

  return <>{children}</>
}
