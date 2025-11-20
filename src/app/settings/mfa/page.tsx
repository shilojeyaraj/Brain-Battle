'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, CheckCircle, XCircle, Loader2, Mail, Smartphone, Fingerprint } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { isWebAuthnSupported } from '@/lib/auth/webauthn'

type MfaType = 'totp' | 'email' | 'webauthn' | null
type Step = 'choose' | 'setup' | 'verify' | 'enabled' | 'error'

export default function MFASetupPage() {
  const [step, setStep] = useState<Step>('choose')
  const [mfaType, setMfaType] = useState<MfaType>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [webauthnSupported, setWebauthnSupported] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkMFAStatus()
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

      const checkMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check Supabase MFA factors (TOTP, Email)
      const { data: factorsData, error } = await supabase.auth.mfa.listFactors()
      
      if (error) {
        console.error('Error checking MFA status:', error)
        return
      }
      
      const data = { all: factorsData?.all || [] }

      const factors = data?.all || []

      // Check WebAuthn credentials (stored separately)
      const { data: webauthnCreds } = await supabase
        .from('webauthn_credentials')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      const verifiedFactor = factors?.find(f => f.status === 'verified')
      const hasWebAuthn = webauthnCreds && webauthnCreds.length > 0

      if (verifiedFactor) {
        setMfaEnabled(true)
        setMfaType(verifiedFactor.factor_type as MfaType)
        setStep('enabled')
      } else if (hasWebAuthn) {
        setMfaEnabled(true)
        setMfaType('webauthn')
        setStep('enabled')
      } else {
        setStep('choose')
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleChooseMfaType = (type: 'totp' | 'email' | 'webauthn') => {
    setMfaType(type)
    setStep('setup')
    setError(null)
    
    if (type === 'email') {
      // Email MFA doesn't need enrollment, just send OTP
      handleEmailSetup()
    } else if (type === 'webauthn') {
      // WebAuthn needs enrollment
      handleWebAuthnSetup()
    } else {
      // TOTP needs enrollment
      handleTOTPSetup()
    }
  }

  const handleTOTPSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Brain Battle Authenticator'
      })

      if (error) {
        setError(error.message)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setError('No email address found')
        setLoading(false)
        return
      }

      // Email MFA may not be directly supported via enroll API
      // For now, we'll mark it as enabled and handle verification separately
      // Note: This may need to be configured in Supabase dashboard
      setError('Email MFA enrollment is not currently supported. Please use TOTP or WebAuthn instead.')
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to setup Email MFA')
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

      // Step 5: Success - WebAuthn is now enabled
      setFactorId(verifyData.factorId)
      setStep('enabled')
      setMfaEnabled(true)
    } catch (err: any) {
      setError(err.message || 'Failed to setup WebAuthn MFA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!factorId) {
        setError('Factor ID not found. Please try setting up again.')
        setLoading(false)
        return
      }

      // Email MFA is not currently supported, only TOTP/WebAuthn
      if (mfaType === 'email') {
        setError('Email MFA verification is not currently supported. Please use TOTP or WebAuthn instead.')
        setLoading(false)
        return
      }

      // For TOTP, we need to create a challenge first (even during enrollment)
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      })

      if (challengeError || !challengeData) {
        setError(challengeError?.message || 'Failed to create challenge')
        setLoading(false)
        return
      }

      // Verify TOTP or WebAuthn with the challenge
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode
      })

      if (error) {
        setError(error.message || 'Invalid code. Please try again.')
        setLoading(false)
        return
      }

      if (data) {
        setStep('enabled')
        setMfaEnabled(true)
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
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

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data } = await supabase.auth.mfa.listFactors()
      const factors = data?.all || []
      const activeFactor = factors?.find(f => f.status === 'verified')

      if (activeFactor) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: activeFactor.id
        })

        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }

        setMfaEnabled(false)
        setStep('choose')
        setQrCode(null)
        setSecret(null)
        setFactorId(null)
        setMfaType(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Multi-Factor Authentication</h1>
          <p className="text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>

        {error && (
          <Card className="p-4 mb-6 bg-destructive/10 border-destructive">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-bold">{error}</p>
            </div>
          </Card>
        )}

        {step === 'choose' && !mfaEnabled && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black mb-2">Choose MFA Method</h2>
              <p className="text-muted-foreground mb-6">
                Select how you want to receive your verification codes
              </p>
            </div>

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
                    Use Google Authenticator or similar
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
          </Card>
        )}

        {step === 'setup' && mfaType === 'totp' && (
          <Card className="p-8">
            <div className="text-center mb-6">
              {loading ? (
                <div className="py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Setting up Authenticator App...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black mb-2">Enable Authenticator App</h2>
                  <p className="text-muted-foreground">
                    Scan the QR code with Google Authenticator or similar app
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {step === 'setup' && mfaType === 'webauthn' && (
          <Card className="p-8">
            <div className="text-center mb-6">
              {loading ? (
                <div className="py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Setting up Device PIN/Biometric...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Follow the prompts on your device to complete setup
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Fingerprint className="w-8 h-8 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-black mb-2">Enable Device PIN/Biometric</h2>
                  <p className="text-muted-foreground">
                    Use your device's built-in security (Windows Hello, Face ID, Touch ID)
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {step === 'setup' && mfaType === 'email' && (
          <Card className="p-8">
            <div className="text-center mb-6">
              {loading ? (
                <div className="py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Setting up Email MFA...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-black mb-2">Enable Email MFA</h2>
                  <p className="text-muted-foreground">
                    You'll receive verification codes via email
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {step === 'verify' && mfaType === 'totp' && qrCode && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black mb-4">Scan QR Code</h2>
              
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img 
                  src={qrCode} 
                  alt="QR Code" 
                  className="w-64 h-64"
                />
              </div>

              {secret && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Or enter this code manually:
                  </p>
                  <code className="bg-muted px-4 py-2 rounded-lg font-mono text-sm">
                    {secret}
                  </code>
                </div>
              )}

              <div className="mt-6">
                <label className="block text-sm font-bold mb-2">
                  Enter 6-digit code from your authenticator app
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
                  className="text-center text-2xl font-mono tracking-widest h-16 mb-4"
                  maxLength={6}
                />
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
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === 'verify' && mfaType === 'email' && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black mb-2">Check Your Email</h2>
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
                  'Verify & Enable'
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
          </Card>
        )}

        {step === 'enabled' && mfaEnabled && (
          <Card className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-black mb-2 text-green-500">
                MFA Enabled
              </h2>
              <p className="text-muted-foreground mb-2">
                Your account is now protected with {mfaType === 'email' ? 'Email' : 'Authenticator App'} MFA
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {mfaType === 'email' 
                  ? "You'll receive verification codes via email when logging in."
                  : 'Use your authenticator app to get codes when logging in.'}
              </p>
              <Button
                onClick={handleDisable}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable MFA'
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
