'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface EmailMFAVerificationProps {
  email: string
  password: string
}

export function EmailMFAVerification({ email, password }: EmailMFAVerificationProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const sendEmailCode = async () => {
    setSending(true)
    setError('')

    try {
      // Sign in first to get user context
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      if (signInError || !authData.user) {
        setError('Invalid email or password')
        setSending(false)
        return
      }

      // Get MFA factors
      const { data: { factors }, error: factorsError } = await supabase.auth.mfa.listFactors()
      
      if (factorsError || !factors || factors.length === 0) {
        setError('MFA not configured')
        setSending(false)
        return
      }

      const emailFactor = factors.find(f => f.factor_type === 'email' && f.status === 'verified')
      
      if (!emailFactor) {
        setError('Email MFA not enabled')
        setSending(false)
        return
      }

      // Challenge the email factor to send OTP
      const { error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: emailFactor.id
      })

      if (challengeError) {
        setError(challengeError.message || 'Failed to send email code')
        setSending(false)
        return
      }

      // Success - email sent
    } catch (err: any) {
      setError(err.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Sign in first
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      if (signInError || !authData.user) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Get MFA factors
      const { data: { factors }, error: factorsError } = await supabase.auth.mfa.listFactors()
      
      if (factorsError || !factors || factors.length === 0) {
        setError('MFA not configured')
        setLoading(false)
        return
      }

      const emailFactor = factors.find(f => f.factor_type === 'email' && f.status === 'verified')
      
      if (!emailFactor) {
        setError('Email MFA not enabled')
        setLoading(false)
        return
      }

      // Verify the email OTP code
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: emailFactor.id,
        code: code
      })

      if (verifyError) {
        setError(verifyError.message || 'Invalid code. Please try again.')
        setLoading(false)
        return
      }

      if (verifyData.user) {
        // Success - redirect to dashboard
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
      setLoading(false)
    }
  }

  // Auto-send email code on mount
  useEffect(() => {
    sendEmailCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-black mb-2">Check Your Email</h2>
        <p className="text-muted-foreground">
          We've sent a 6-digit verification code to your email address
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-destructive font-bold text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">
            Enter 6-digit code from email
          </label>
          <Input
            type="text"
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(value)
              setError('')
            }}
            placeholder="000000"
            className="text-center text-2xl font-mono tracking-widest h-16"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6) {
                handleVerify()
              }
            }}
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="w-full h-12"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </Button>

        <Button
          onClick={sendEmailCode}
          variant="outline"
          className="w-full"
          disabled={sending || loading}
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Resend Code
            </>
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Didn't receive the email? Check your spam folder or try resending.
        </p>
      </div>
    </Card>
  )
}

