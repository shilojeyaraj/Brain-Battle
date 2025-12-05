"use client"

import { useEffect, useState } from "react"
import { BrainBattleLoading } from "@/components/ui/brain-battle-loading"

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
    return fallback || (
      <div className="fixed inset-0 z-[9999]">
        <BrainBattleLoading message="Loading Brain Battle..." />
      </div>
    )
  }

  return <>{children}</>
}
