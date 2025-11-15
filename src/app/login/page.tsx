"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
<<<<<<< HEAD
import { Sparkles, Mail, Lock, ArrowLeft, AlertCircle, Loader2, Brain } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { authenticateUser } from "@/lib/actions/custom-auth"
import { motion } from "framer-motion"
import Image from "next/image"
=======
import { Sparkles, User, Lock, ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
>>>>>>> 07dd73b1ffe2e98d7ee655aa60cfb835f494ffa0

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  const clearError = () => {
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      const formData = new FormData(e.currentTarget)
<<<<<<< HEAD
      const emailValue = formData.get('email') as string
      const passwordValue = formData.get('password') as string

      // Sign in with custom auth
      const result = await authenticateUser(
        emailValue.trim().toLowerCase(),
        passwordValue
      )

      if (result.error) {
        setError(result.error || "Login failed")
        setIsPending(false)
        return
      }

      if (result.success && result.user) {
        // Store user ID in localStorage for session management
        localStorage.setItem('userId', result.user.id)
        // Successfully signed in, redirect to dashboard
        router.push('/dashboard')
      } else {
        setError('Login failed')
        setIsPending(false)
      }
=======
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Store user in localStorage for client-side access
          localStorage.setItem('user', JSON.stringify(result.user))
          localStorage.setItem('userId', result.user.id)
          router.push('/dashboard')
        } else {
          setError(result.error || 'Login failed')
        }
      } else {
        const result = await response.json()
        setError(result.error || 'Login failed')
      }
>>>>>>> 07dd73b1ffe2e98d7ee655aa60cfb835f494ffa0
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
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
            <Image 
              src="/brain-battle-logo.png" 
              alt="Brain Battle Logo" 
              width={48} 
              height={48} 
              className="w-12 h-12 object-contain"
            />
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

<<<<<<< HEAD
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/50 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" strokeWidth={3} />
                <p className="text-red-400 font-bold text-sm">{error}</p>
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
=======
        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" strokeWidth={3} />
              <p className="text-destructive font-bold text-sm">{error}</p>
            </div>
          )}

            <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-black text-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={3} />
                <Input
                  id="username"
                  name="email"
                  type="text"
                  placeholder="Enter your username"
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card disabled:opacity-50"
                  disabled={isPending}
                  onChange={clearError}
                />
>>>>>>> 07dd73b1ffe2e98d7ee655aa60cfb835f494ffa0
              </div>

<<<<<<< HEAD
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-black text-blue-100">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300/70" strokeWidth={3} />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10 h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                    required
                    onChange={clearError}
                  />
                </div>
=======
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-black text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={3} />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card"
                  onChange={clearError}
                />
>>>>>>> 07dd73b1ffe2e98d7ee655aa60cfb835f494ffa0
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
                disabled={isPending}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={3} />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
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
<<<<<<< HEAD
          </Card>
        </motion.div>
=======

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 rounded cartoon-border" />
                <span className="text-sm font-bold text-muted-foreground">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={3} />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-bold">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors font-black">
              Sign up here
            </Link>
          </p>
          </div>
        </Card>
>>>>>>> 07dd73b1ffe2e98d7ee655aa60cfb835f494ffa0
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
