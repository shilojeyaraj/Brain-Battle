'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Shield, Loader2, AlertCircle, Fingerprint } from 'lucide-react'
import { 
  authenticateWithCredential, 
  extractCredentialData,
  isWebAuthnSupported 
} from '@/lib/auth/webauthn'

interface WebAuthnVerificationProps {
  email: string
  password: string
  onSuccess: () => void
  onError: (error: string) => void
}

export function WebAuthnVerification({ 
  email, 
  password, 
  onSuccess, 
  onError 
}: WebAuthnVerificationProps) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if WebAuthn is supported
    checkWebAuthnSupport()
  }, [])

  const checkWebAuthnSupport = async () => {
    try {
      const supported = await isWebAuthnSupported()
      setIsSupported(supported)
      
      if (!supported) {
        setError('WebAuthn with device PIN/biometric is not available on this device or browser.')
      }
    } catch (err: any) {
      setIsSupported(false)
      setError(err.message || 'Failed to check WebAuthn support')
    }
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    setError(null)

    try {
      // Step 1: Get authentication options from server
      const optionsResponse = await fetch('/api/auth/webauthn/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const optionsData = await optionsResponse.json()

      if (!optionsData.success || !optionsData.options) {
        throw new Error(optionsData.error || 'Failed to get authentication options')
      }

      // Step 2: Authenticate with WebAuthn credential
      // This will trigger the device PIN/biometric prompt
      const credential = await authenticateWithCredential(optionsData.options)

      // Step 3: Extract credential data
      const credentialData = extractCredentialData(credential)

      // Step 4: Verify authentication on server
      const verifyResponse = await fetch('/api/auth/webauthn/verify-authentication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: credentialData,
          userId: optionsData.userId,
          email,
          password,
          challenge: optionsData.options.challenge
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'WebAuthn verification failed')
      }

      // Step 5: Success - session is now established
      onSuccess()
    } catch (err: any) {
      const errorMessage = err.message || 'WebAuthn verification failed'
      setError(errorMessage)
      onError(errorMessage)
      setIsVerifying(false)
    }
  }

  if (isSupported === null) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground font-bold">Checking WebAuthn support...</p>
        </div>
      </Card>
    )
  }

  if (isSupported === false) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-black mb-2">WebAuthn Not Available</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'Your device or browser does not support WebAuthn with device PIN/biometric authentication.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Please use a different MFA method or update your device/browser.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Fingerprint className="w-8 h-8 text-primary" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-black mb-2">Device PIN/Biometric Verification</h2>
        <p className="text-muted-foreground mb-4">
          Use your device's PIN or biometric (Face ID, Touch ID, Windows Hello) to verify your identity.
        </p>
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" strokeWidth={3} />
            <p className="text-destructive font-bold text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={3} />
              Verifying...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" strokeWidth={3} />
              Verify with Device PIN/Biometric
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Click the button above to trigger your device's security prompt. 
          You'll be asked to enter your PIN or use biometric authentication.
        </p>
      </div>
    </Card>
  )
}

