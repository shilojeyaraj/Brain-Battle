"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sparkles, Mail, Lock, User, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { signup } from "@/lib/actions/custom-auth"
import { useTransition, useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function SignupForm() {
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
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

  const handleSubmit = (formData: FormData) => {
    setError(null) // Clear previous error
    startTransition(() => {
      signup(formData)
    })
  }

  return (
    <Card className="p-8 bg-card cartoon-border cartoon-shadow">
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border-2 border-destructive/50 rounded-xl flex items-start gap-3 cartoon-border">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" strokeWidth={3} />
          <div className="flex-1">
            <p className="text-sm font-black text-destructive">{error}</p>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-primary/10 border-2 border-primary/50 rounded-xl flex items-start gap-3 cartoon-border">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" strokeWidth={3} />
          <div className="flex-1">
            <p className="text-sm font-black text-primary">{successMessage}</p>
          </div>
        </div>
      )}
        <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-black text-foreground">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={3} />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Choose a username"
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-black text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={3} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card"
                />
              </div>
            </div>

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
                  placeholder="Create a password"
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-black text-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={3} />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card"
                  required
                />
              </div>
            </div>


            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-sm text-muted-foreground font-bold">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-black">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            <span className="font-bold">Back to Home</span>
          </Link>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center cartoon-border cartoon-shadow">
              <Sparkles className="w-7 h-7 text-primary-foreground" strokeWidth={3} />
            </div>
            <span className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Brain<span className="text-primary">Battle</span>
            </span>
          </div>
          
          <h1 className="text-2xl font-black text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Join the Battle!
          </h1>
          <p className="text-muted-foreground font-bold">
            Create your account and start studying with friends
          </p>
        </div>

        <Suspense fallback={<Card className="p-8 bg-card cartoon-border cartoon-shadow"><div className="text-center">Loading...</div></Card>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  )
}
