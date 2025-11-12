"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sparkles, Mail, Lock, ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { MFAVerification } from "@/components/auth/mfa-verification"
import { EmailMFAVerification } from "@/components/auth/email-mfa-verification"
import { WebAuthnVerification } from "@/components/auth/webauthn-verification"

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [requiresMFA, setRequiresMFA] = useState(false)
  const [mfaType, setMfaType] = useState<'totp' | 'email' | 'webauthn' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const mfaParam = searchParams.get('mfa')
    const emailParam = searchParams.get('email')
    
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
    
    if (mfaParam === 'true' && emailParam) {
      setRequiresMFA(true)
      setEmail(decodeURIComponent(emailParam))
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
      const emailValue = formData.get('email') as string
      const passwordValue = formData.get('password') as string

      setEmail(emailValue)
      setPassword(passwordValue)

      // Sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailValue.trim().toLowerCase(),
        password: passwordValue
      })

      if (signInError) {
        setError(signInError.message)
        setIsPending(false)
        return
      }

      if (!data.user) {
        setError('Login failed')
        setIsPending(false)
        return
      }

      // ALWAYS check for MFA factors first, regardless of session status
      // This ensures WebAuthn MFA is required even if Supabase returns a session
      
      // Check for Supabase MFA factors (TOTP, Email)
      const { data: { factors } } = await supabase.auth.mfa.listFactors()
      const verifiedFactor = factors?.find(f => f.status === 'verified')
      
      // Check for WebAuthn credentials (stored separately in our custom table)
      const { data: webauthnCreds } = await supabase
        .from('webauthn_credentials')
        .select('id')
        .eq('user_id', data.user.id)
        .limit(1)

      const hasWebAuthn = webauthnCreds && webauthnCreds.length > 0
      
      // Priority: WebAuthn > TOTP > Email
      if (hasWebAuthn) {
        // WebAuthn MFA is enabled - ALWAYS require it
        console.log('🔐 [LOGIN] WebAuthn MFA detected, requiring verification')
        
        // Sign out any existing session to ensure clean state for WebAuthn verification
        // The WebAuthn verification component will re-authenticate with password + WebAuthn
        await supabase.auth.signOut()
        
        setMfaType('webauthn')
        setRequiresMFA(true)
        setIsPending(false)
        return
      } else if (verifiedFactor) {
        // Supabase MFA factor is enabled
        console.log('🔐 [LOGIN] MFA factor detected:', verifiedFactor.factor_type)
        setMfaType(verifiedFactor.factor_type as 'totp' | 'email')
        setRequiresMFA(true)
        setIsPending(false)
        return
      } else if (!data.session) {
        // No MFA but also no session - might need email confirmation
        console.log('⚠️ [LOGIN] No session and no MFA - might need email confirmation')
        setError('Please check your email to confirm your account')
        setIsPending(false)
        return
      }

      // No MFA required and session exists, redirect to dashboard
      console.log('✅ [LOGIN] No MFA required, redirecting to dashboard')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setIsPending(false)
    }
  }
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
            Welcome Back!
          </h1>
          <p className="text-muted-foreground font-bold">
            Sign in to continue your battle journey
          </p>
        </div>

        <Card className="p-8 bg-card cartoon-border cartoon-shadow">
          {error && !requiresMFA && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" strokeWidth={3} />
              <p className="text-destructive font-bold text-sm">{error}</p>
            </div>
          )}

          {requiresMFA ? (
            mfaType === 'webauthn' ? (
              <WebAuthnVerification 
                email={email} 
                password={password}
                onSuccess={() => router.push('/dashboard')}
                onError={(error) => setError(error)}
              />
            ) : mfaType === 'email' ? (
              <EmailMFAVerification email={email} password={password} />
            ) : (
              <MFAVerification email={email} password={password} />
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card disabled:opacity-50"
                  required
                  disabled={isPending}
                  onChange={clearError}
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
                  placeholder="Enter your password"
                  className="pl-10 h-12 text-lg font-bold cartoon-border bg-card"
                  required
                  onChange={clearError}
                />
              </div>
            </div>

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
          )}

          {!requiresMFA && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-bold">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors font-black">
              Sign up here
            </Link>
          </p>
          </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
