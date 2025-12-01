/**
 * Authentication Redirect Utility
 * 
 * Checks if user is authenticated and redirects to login if not.
 * Preserves the current URL as a redirect parameter so user returns after login.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const router = useRouter()
 *   const pathname = usePathname()
 *   const searchParams = useSearchParams()
 *   
 *   const handleClick = async () => {
 *     const isAuthenticated = await requireAuthOrRedirect(router, pathname, searchParams)
 *     if (!isAuthenticated) return // Already redirected
 *     
 *     // User is authenticated, proceed with action
 *     // ... your code here
 *   }
 * }
 * ```
 */

"use client"

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { ReadonlyURLSearchParams } from "next/navigation"

/**
 * Check if user is authenticated, redirect to login if not
 * @param router - Next.js router instance (from useRouter hook)
 * @param pathname - Current pathname (from usePathname hook)
 * @param searchParams - Current search params (from useSearchParams hook)
 * @returns Promise<boolean> - true if authenticated, false if redirected
 */
export async function requireAuthOrRedirect(
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams
): Promise<boolean> {
  try {
    const response = await fetch('/api/user/current')
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.userId) {
        return true // User is authenticated
      }
    }
    
    // Not authenticated - redirect to login with current path as redirect
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    const redirectUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`
    router.push(redirectUrl)
    return false
  } catch (error) {
    console.error('Error checking authentication:', error)
    // On error, redirect to login anyway
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`)
    return false
  }
}

/**
 * Hook wrapper for requireAuthOrRedirect
 * Returns a function that can be called in button handlers
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const checkAuth = useRequireAuthRedirect()
 *   
 *   const handleClick = async () => {
 *     if (!(await checkAuth())) return
 *     // User is authenticated, proceed
 *   }
 * }
 * ```
 */
export function useRequireAuthRedirect() {
  // Dynamic import to avoid SSR issues
  if (typeof window === 'undefined') {
    return async () => false
  }
  
  const { useRouter, usePathname, useSearchParams } = require("next/navigation")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  return () => requireAuthOrRedirect(router, pathname, searchParams)
}

