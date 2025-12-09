"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sparkles, Mail, Lock, ArrowLeft, AlertCircle, Loader2, Brain, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { authenticateUser } from "@/lib/actions/custom-auth"
import { motion } from "framer-motion"

function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState<string>('/dashboard')

  useEffect(() => {
    // Read search params from URL on client side only
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      const redirectParam = params.get('redirect')
      
      if (errorParam) {
        setError(decodeURIComponent(errorParam))
        setIsPending(false)
      }
      
      if (redirectParam) {
        setRedirectUrl(decodeURIComponent(redirectParam))
      }
    }
  }, [])

  const clearError = () => {
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      const formData = new FormData(e.currentTarget)
      const emailValue = formData.get('email') as string
      const passwordValue = formData.get('password') as string

      if (!emailValue || !passwordValue) {
        setError('Please enter both email and password')
        setIsPending(false)
        return
      }

      // Try API login first (better error handling)
      try {
        const loginFormData = new FormData()
        loginFormData.append('email', emailValue.trim().toLowerCase())
        loginFormData.append('password', passwordValue)

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          body: loginFormData,
          credentials: 'include'
        })

        const result = await response.json()

        if (response.ok && result.success) {
          // Store user ID in localStorage for session management
          if (result.userId) {
            localStorage.setItem('userId', result.userId)
          }
          
          // Dispatch event to notify streak component of login
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userLoggedIn'))
          }
          
          // Successfully signed in, redirect to original destination or dashboard
          // Use window.location.href for hard redirect to ensure it happens
          setIsPending(false)
          window.location.href = redirectUrl
          return
        } else {
          // Show user-friendly error message
          const errorMsg = result.error || 'Login failed. Please check your credentials and try again.'
          setError(errorMsg)
          setIsPending(false)
          return
        }
      } catch (apiError: any) {
        // Fallback to server action if API fails
        console.warn('API login failed, trying server action:', apiError)
        
        const result = await authenticateUser(
          emailValue.trim().toLowerCase(),
          passwordValue
        )

        if (result.error) {
          setError(result.error || "Login failed. Please check your credentials and try again.")
          setIsPending(false)
          return
        }

        if (result.success && result.user?.id) {
          // Store user ID in localStorage for session management
          localStorage.setItem('userId', result.user.id)
          
          // Dispatch event to notify streak component of login
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('userLoggedIn'))
          }
          
          // Successfully signed in, redirect to original destination or dashboard
          // Use window.location.href for hard redirect to ensure it happens
          setIsPending(false)
          window.location.href = redirectUrl
        } else {
          setError('Login failed. Please check your credentials and try again.')
          setIsPending(false)
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred. Please try again.'
      setError(errorMessage)
      setIsPending(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="inline-flex items-center gap-2 text-blue-300/70 hover:text-blue-300 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            <span className="font-bold">Back to Home</span>
          </Link>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-3xl font-black bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent">
              BRAIN BATTLE
            </span>
          </div>
          
          <h1 className="text-2xl font-black text-white mb-2">
            Welcome Back!
          </h1>
          <p className="text-blue-100/70 font-bold">
            Sign in to continue your battle journey
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
            {error && (
              <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
                error.includes('another device') || error.includes('logged in elsewhere')
                  ? 'bg-orange-500/10 border-orange-500/50'
                  : 'bg-red-500/10 border-red-500/50'
              }`}>
                <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                  error.includes('another device') || error.includes('logged in elsewhere')
                    ? 'text-orange-400'
                    : 'text-red-400'
                }`} strokeWidth={3} />
                <p className={`font-bold text-sm ${
                  error.includes('another device') || error.includes('logged in elsewhere')
                    ? 'text-orange-400'
                    : 'text-red-400'
                }`}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-black text-blue-100">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300/70" strokeWidth={3} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10 h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400 disabled:opacity-50"
                    required
                    disabled={isPending}
                    onChange={clearError}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-black text-blue-100">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300/70" strokeWidth={3} />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-12 h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                    required
                    onChange={clearError}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/70 hover:text-blue-100 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 rounded border-2 border-slate-600/50 bg-slate-900/50" />
                  <span className="text-sm font-bold text-blue-100/70">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-sm font-bold text-blue-300 hover:text-blue-200 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                loading={isPending}
                loadingText="Signing In..."
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400"
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-blue-100/70 font-bold">
                Don't have an account?{" "}
                <Link href="/signup" className="text-blue-300 hover:text-blue-200 transition-colors font-black">
                  Sign up here
                </Link>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
