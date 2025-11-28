/**
 * Singleplayer Setup Page
 * 
 * SEO-friendly public page for setting up singleplayer quizzes.
 * Redirects to /singleplayer page.
 * 
 * SEO Benefits:
 * - Indexable URL: /singleplayer-setup
 * - Better discoverability for "singleplayer quiz" searches
 */

"use client"

import { Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Brain, Loader2 } from "lucide-react"
import { useRequireAuth } from "@/hooks/use-require-auth"

function SingleplayerSetupContent() {
  const router = useRouter()
  const { userId, loading } = useRequireAuth()

  useEffect(() => {
    if (!loading && userId) {
      // Redirect to singleplayer page
      router.push("/singleplayer")
    }
  }, [loading, userId, router])

  if (loading || !userId) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-200 font-bold">Loading...</p>
        </div>
      </div>
    )
  }

  return null // Redirecting
}

export default function SingleplayerSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      }
    >
      <SingleplayerSetupContent />
    </Suspense>
  )
}

