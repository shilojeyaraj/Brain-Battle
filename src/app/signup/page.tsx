"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sparkles, Mail, Lock, User, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Brain } from "lucide-react"
import Link from "next/link"
import { registerUser } from "@/lib/actions/custom-auth"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"

function SignupForm() {
  const [isPending, setIsPending] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      setSuccessMessage(null)
    } else if (messageParam) {
      setSuccessMessage(decodeURIComponent(messageParam))
      setError(null)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setIsPending(true)

    try {
      const formData = new FormData(e.currentTarget)
      const username = formData.get("username") as string
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      const confirmPassword = formData.get("confirmPassword") as string

      // Basic validation
      if (!username || !email || !password || !confirmPassword) {
        setError("All fields are required")
        setIsPending(false)
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        setIsPending(false)
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters")
        setIsPending(false)
        return
      }

      if (username.length < 3) {
        setError("Username must be at least 3 characters")
        setIsPending(false)
        return
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError("Please enter a valid email address")
        setIsPending(false)
        return
      }

      // Sign up with custom auth
      const result = await registerUser(
        email.trim().toLowerCase(),
        password,
        username
      )

      if (result.error) {
        setError(result.error || "Sign up failed")
        setIsPending(false)
        return
      }

      if (result.success && result.user) {
        // Verify user ID is valid before storing
        if (!result.user.id || result.user.id.trim() === '') {
          console.error('❌ [SIGNUP] Invalid user ID received:', result.user.id)
          setError('Registration succeeded but user ID is invalid. Please contact support.')
          setIsPending(false)
          return
        }
        
        // Store user ID in localStorage for session management
        localStorage.setItem('userId', result.user.id)
        console.log('✅ [SIGNUP] User ID stored in localStorage:', result.user.id)
        setSuccessMessage("Account created successfully! Redirecting...")
        setTimeout(() => {
          router.push(`/dashboard?userId=${result.user.id}&newUser=true`)
        }, 1500)
      } else {
        setError('Sign up failed')
        setIsPending(false)
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed')
      setIsPending(false)
    }
  }

  return (
    <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={3} />
          <div className="flex-1">
            <p className="text-sm font-black text-red-400">{error}</p>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-blue-500/10 border-2 border-blue-500/50 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" strokeWidth={3} />
          <div className="flex-1">
            <p className="text-sm font-black text-blue-400">{successMessage}</p>
          </div>
        </div>
      )}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-black text-blue-100">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300/70" strokeWidth={3} />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  className="pl-10 h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                  required
                />
              </div>
            </div>

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
                  className="pl-10 h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                  required
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
                  type="password"
                  placeholder="Create a password"
                  className="pl-10 h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-black text-blue-100">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300/70" strokeWidth={3} />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  className="pl-10 h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                  required
                />
              </div>
            </div>


            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={3} />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-blue-100/70 font-bold">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-300 hover:text-blue-200 transition-colors font-black">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
  )
}

export default function SignupPage() {
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center border-2 border-blue-400">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent">
              BRAIN BATTLE
            </span>
          </div>
          
          <h1 className="text-2xl font-black text-white mb-2">
            Join the Battle!
          </h1>
          <p className="text-blue-100/70 font-bold">
            Create your account and start studying with friends
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Suspense fallback={<Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50"><div className="text-center text-white">Loading...</div></Card>}>
            <SignupForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}
