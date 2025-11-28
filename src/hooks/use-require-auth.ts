/**
 * useRequireAuth Hook
 * 
 * Checks if user is authenticated and redirects to login if not.
 * Preserves the current URL as a redirect parameter.
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { userId, loading } = useRequireAuth()
 *   
 *   if (loading) return <Loading />
 *   if (!userId) return null // Redirecting...
 *   
 *   return <div>Protected content</div>
 * }
 * ```
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface UseRequireAuthResult {
  userId: string | null
  loading: boolean
}

export function useRequireAuth(): UseRequireAuthResult {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/current')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.userId) {
            setUserId(data.userId)
            setLoading(false)
            return
          }
        }
        
        // Not authenticated - redirect to login with current path as redirect
        const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
        const redirectUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`
        router.push(redirectUrl)
      } catch (error) {
        console.error('Error checking authentication:', error)
        const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
      }
    }

    checkAuth()
  }, [router, pathname, searchParams])

  return { userId, loading }
}

