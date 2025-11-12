'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, Loader2, AlertCircle } from 'lucide-react'

interface MFAVerificationProps {
  email: string
  password: string
}

export function MFAVerification({ email, password }: MFAVerificationProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First, sign in to get the challenge
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      if (signInError || !authData.user) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Get the MFA factors to find the TOTP factor
      const { data: { factors }, error: factorsError } = await supabase.auth.mfa.listFactors()
      
      if (factorsError || !factors || factors.length === 0) {
        setError('MFA not configured')
        setLoading(false)
        return
      }

      const totpFactor = factors.find(f => f.factor_type === 'totp' && f.status === 'verified')
      
      if (!totpFactor) {
        setError('No verified TOTP factor found')
        setLoading(false)
        return
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id
      })

      if (challengeError || !challengeData) {
        setError(challengeError?.message || 'Failed to create challenge')
        setLoading(false)
        return
      }

      // Verify the TOTP code with the challenge
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: code
      })

      if (verifyError) {
        setError(verifyError.message || 'Invalid MFA code. Please try again.')
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

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-black mb-2">Enter MFA Code</h2>
        <p className="text-muted-foreground">
          Open your authenticator app and enter the 6-digit code
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
            Authentication Code
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

        <p className="text-sm text-muted-foreground text-center">
          Don't have access to your authenticator? Contact support.
        </p>
      </div>
    </Card>
  )
}

