'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, CheckCircle, Loader2, AlertCircle, Mail, Smartphone, Fingerprint } from 'lucide-react'
import { isWebAuthnSupported } from '@/lib/auth/webauthn'

type MfaType = 'totp' | 'email' | 'webauthn' | null

export default function MFASetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mfaType, setMfaType] = useState<MfaType>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [step, setStep] = useState<'choose' | 'setup' | 'verify'>('choose')
  const [emailSent, setEmailSent] = useState(false)
  const [webauthnSupported, setWebauthnSupported] = useState<boolean | null>(null)
  const supabase = createClient()

  // Check session and WebAuthn support on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Try to refresh
        await supabase.auth.refreshSession()
        const { data: { session: refreshed } } = await supabase.auth.getSession()
        if (!refreshed) {
          const emailFromUrl = searchParams.get('email')
          if (emailFromUrl) {
            setError(`No session found. If email confirmation is enabled, please check your email (${emailFromUrl}) and confirm your account first.`)
          } else {
            setError('No authenticated session found. Please try logging in first.')
          }
        }
      }
    }
    checkSession()
    checkWebAuthnSupport()
  }, [])

  const checkWebAuthnSupport = async () => {
    try {
      const supported = await isWebAuthnSupported()
      setWebauthnSupported(supported)
    } catch {
      setWebauthnSupported(false)
    }
  }

  const handleChooseMfaType = (type: 'totp' | 'email' | 'webauthn') => {
    setMfaType(type)
    setStep('setup')
    setError(null)
    
    if (type === 'email') {
      handleEmailSetup()
    } else if (type === 'webauthn') {
      handleWebAuthnSetup()
    } else {
      handleTOTPSetup()
    }
  }

  const handleTOTPSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Brain Battle Authenticator'
      })

      if (enrollError) {
        setError(enrollError.message)
        setLoading(false)
        return
      }

      if (data) {
        setQrCode(data.totp?.qr_code || null)
        setSecret(data.totp?.secret || null)
        setFactorId(data.id || null)
        setStep('verify')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to setup MFA')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      // MFA enrollment requires an authenticated session
      // Try multiple methods to get the user session
      let user = null
      
      // Method 1: Try getUser() first
      const { data: { user: sessionUser }, error: getUserError } = await supabase.auth.getUser()
      
      if (sessionUser) {
        user = sessionUser
      } else {
        // Method 2: Try getSession()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (session?.user) {
          user = session.user
        } else {
          // Method 3: Try refreshing the session
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          
          if (refreshedSession?.user) {
            user = refreshedSession.user
          } else {
            // If all methods fail, check if we have email in URL and provide helpful error
            const emailFromUrl = searchParams.get('email')
            if (emailFromUrl) {
              setError(`Session not available. This usually means email confirmation is required. Please check your email (${emailFromUrl}) and confirm your account, then try logging in.`)
            } else {
              setError('No authenticated session found. Please try logging in first.')
            }
            setLoading(false)
            return
          }
        }
      }

      if (!user?.email) {
        setError('No email address found in user session.')
        setLoading(false)
        return
      }

      // Enroll TOTP as MFA factor
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      })

      if (enrollError) {
        setError(enrollError.message)
        setLoading(false)
        return
      }

      if (data) {
        setFactorId(data.id || null)
        // Send verification email
        const { error: emailError } = await supabase.auth.mfa.challenge({
          factorId: data.id
        })

        if (emailError) {
          setError(emailError.message)
          setLoading(false)
          return
        }

        setEmailSent(true)
        setStep('verify')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to setup Email MFA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    if (!factorId) {
      setError('Factor ID not found. Please try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create a challenge first
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      })

      if (challengeError || !challengeData) {
        setError(challengeError?.message || 'Failed to create challenge')
        setLoading(false)
        return
      }

      // Verify with the challenge
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode
      })

      if (verifyError) {
        setError(verifyError.message || 'Invalid code. Please try again.')
        setLoading(false)
        return
      }

      if (data) {
        // MFA enabled successfully, redirect to dashboard
        router.push('/dashboard?mfaEnabled=true')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!factorId) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.mfa.challenge({
        factorId: factorId
      })

      if (error) {
        setError(error.message)
      } else {
        setEmailSent(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend email')
    } finally {
      setLoading(false)
    }
  }

  const handleWebAuthnSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Get registration options from server
      const optionsResponse = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const optionsData = await optionsResponse.json()

      if (!optionsData.success || !optionsData.options) {
        throw new Error(optionsData.error || 'Failed to get registration options')
      }

      // Step 2: Register credential using WebAuthn API
      const { registerCredential, extractCredentialData } = await import('@/lib/auth/webauthn')
      const credential = await registerCredential(optionsData.options)

      // Step 3: Extract credential data
      const credentialData = extractCredentialData(credential)

      // Step 4: Verify and store credential on server
      const verifyResponse = await fetch('/api/auth/webauthn/verify-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: credentialData,
          challenge: optionsData.options.challenge
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Failed to verify registration')
      }

      // Step 5: Success - WebAuthn is now enabled, redirect to dashboard
      router.push('/dashboard?mfaEnabled=true&mfaType=webauthn')
    } catch (err: any) {
      setError(err.message || 'Failed to setup WebAuthn MFA')
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Allow user to skip MFA setup (they can enable it later)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black mb-2">Enable MFA</h1>
            <p className="text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-destructive font-bold text-sm">{error}</p>
            </div>
          )}

          {step === 'choose' && (
            <div>
              <p className="text-center text-muted-foreground mb-6">
                Choose how you want to receive verification codes
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {/* WebAuthn Option - Device PIN/Biometric */}
                <Card 
                  className={`p-6 cursor-pointer hover:bg-muted/50 transition-colors border-2 ${
                    webauthnSupported === false ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => webauthnSupported !== false && handleChooseMfaType('webauthn')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Fingerprint className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="font-black mb-2">Device PIN/Biometric</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use Windows Hello, Face ID, or Touch ID
                    </p>
                    {webauthnSupported === false ? (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>⚠️ Not available</p>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>✅ Phishing-resistant</p>
                        <p>✅ No codes needed</p>
                        <p>✅ Most secure</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* TOTP Option */}
                <Card 
                  className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-2"
                  onClick={() => handleChooseMfaType('totp')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Smartphone className="w-6 h-6 text-green-500" />
                    </div>
                    <h3 className="font-black mb-2">Authenticator App</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use Google Authenticator
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>✅ Most secure</p>
                      <p>✅ Works offline</p>
                      <p>✅ Industry standard</p>
                    </div>
                  </div>
                </Card>

                {/* Email OTP Option */}
                <Card 
                  className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-2"
                  onClick={() => handleChooseMfaType('email')}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="font-black mb-2">Email OTP</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Receive codes via email
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>✅ No app needed</p>
                      <p>✅ Easiest setup</p>
                      <p>✅ Works instantly</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {step === 'setup' && mfaType === 'webauthn' && (
            <div className="text-center">
              {loading ? (
                <div className="py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">
                    Setting up Device PIN/Biometric...
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Follow the prompts on your device to complete setup
                  </p>
                </div>
              ) : (
                <div className="py-8">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Fingerprint className="w-8 h-8 text-purple-500" />
                  </div>
                  <h2 className="text-xl font-black mb-2">Enable Device PIN/Biometric</h2>
                  <p className="text-muted-foreground">
                    Use your device's built-in security (Windows Hello, Face ID, Touch ID)
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'setup' && mfaType !== 'webauthn' && (
            <div className="text-center">
              {loading ? (
                <div className="py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">
                    Setting up {mfaType === 'email' ? 'Email' : 'Authenticator'} MFA...
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {step === 'verify' && mfaType === 'email' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-black mb-2">Check Your Email</h2>
                {emailSent ? (
                  <p className="text-muted-foreground mb-4">
                    We've sent a 6-digit code to your email address. Please check your inbox.
                  </p>
                ) : (
                  <p className="text-muted-foreground mb-4">
                    Sending verification code to your email...
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Enter 6-digit code from email
                  </label>
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setVerificationCode(value)
                      setError(null)
                    }}
                    placeholder="000000"
                    className="text-center text-2xl font-mono tracking-widest h-16"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full h-12"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable MFA'
                  )}
                </Button>

                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'verify' && mfaType === 'totp' && qrCode && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-black mb-4">Scan QR Code</h2>
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                {secret && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Or enter manually:
                    </p>
                    <code className="bg-muted px-4 py-2 rounded-lg font-mono text-sm">
                      {secret}
                    </code>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Enter 6-digit code
                  </label>
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setVerificationCode(value)
                      setError(null)
                    }}
                    placeholder="000000"
                    className="text-center text-2xl font-mono tracking-widest h-16"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full h-12"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable MFA'
                  )}
                </Button>

                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

