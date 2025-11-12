# Usage Guide

How to integrate WebAuthn MFA into your authentication flow.

## 🎯 Integration Points

### 1. Login Flow

Add WebAuthn verification to your login page:

```typescript
// src/app/login/page.tsx
'use client'

import { WebAuthnVerification } from '@/components/auth/webauthn-verification'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [requiresMFA, setRequiresMFA] = useState(false)
  const [mfaType, setMfaType] = useState<'webauthn' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data.user) {
      // Handle error
      return
    }

    // Check for WebAuthn MFA
    const { data: webauthnCreds } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('user_id', data.user.id)
      .limit(1)

    if (webauthnCreds && webauthnCreds.length > 0) {
      // Sign out to ensure clean state
      await supabase.auth.signOut()
      
      // Require WebAuthn verification
      setMfaType('webauthn')
      setRequiresMFA(true)
      return
    }

    // No MFA, redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div>
      {requiresMFA && mfaType === 'webauthn' ? (
        <WebAuthnVerification
          email={email}
          password={password}
          onSuccess={() => router.push('/dashboard')}
          onError={(error) => console.error(error)}
        />
      ) : (
        <form onSubmit={handleLogin}>
          {/* Login form */}
        </form>
      )}
    </div>
  )
}
```

### 2. MFA Setup (After Signup)

Allow users to set up WebAuthn MFA:

```typescript
// src/app/settings/mfa/page.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerCredential, extractCredentialData, isWebAuthnSupported } from '@/lib/auth/webauthn'

export default function MFASetupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleWebAuthnSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Get registration options
      const optionsResponse = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const optionsData = await optionsResponse.json()

      if (!optionsData.success || !optionsData.options) {
        throw new Error(optionsData.error || 'Failed to get registration options')
      }

      // Step 2: Register credential (triggers device PIN/biometric prompt)
      const { registerCredential, extractCredentialData } = await import('@/lib/auth/webauthn')
      const credential = await registerCredential(optionsData.options)

      // Step 3: Extract credential data
      const credentialData = extractCredentialData(credential)

      // Step 4: Verify and store credential
      const verifyResponse = await fetch('/api/auth/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialData,
          challenge: optionsData.options.challenge
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Failed to verify registration')
      }

      // Success!
      alert('WebAuthn MFA enabled successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to setup WebAuthn MFA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleWebAuthnSetup} disabled={loading}>
        {loading ? 'Setting up...' : 'Enable Device PIN/Biometric'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
```

### 3. Check WebAuthn Support

Before showing WebAuthn option, check if it's supported:

```typescript
import { isWebAuthnSupported } from '@/lib/auth/webauthn'

const [webauthnSupported, setWebauthnSupported] = useState<boolean | null>(null)

useEffect(() => {
  const checkSupport = async () => {
    const supported = await isWebAuthnSupported()
    setWebauthnSupported(supported)
  }
  checkSupport()
}, [])

// In your UI
{webauthnSupported && (
  <button onClick={handleWebAuthnSetup}>
    Enable Device PIN/Biometric
  </button>
)}
```

## 📝 Complete Examples

### Example 1: Login Page with MFA Detection

See `examples/login-with-mfa.tsx` for a complete login implementation.

### Example 2: MFA Settings Page

See `examples/settings-mfa.tsx` for a complete MFA setup page.

## 🔄 Flow Diagrams

### Registration Flow

```
User → Click "Enable WebAuthn" 
  → Server: GET /api/auth/webauthn/register
  → Client: navigator.credentials.create()
  → Device: PIN/Biometric Prompt
  → Client: Extract credential data
  → Server: POST /api/auth/webauthn/verify-registration
  → Database: Store credential
  → Success!
```

### Authentication Flow

```
User → Enter email/password → Click "Sign In"
  → Server: Verify password
  → Check: WebAuthn credentials exist?
  → If yes: Show WebAuthnVerification component
  → Client: GET /api/auth/webauthn/authenticate
  → Client: navigator.credentials.get()
  → Device: PIN/Biometric Prompt
  → Client: Extract credential data
  → Server: POST /api/auth/webauthn/verify-authentication
  → Success: Redirect to dashboard
```

## 🎨 UI Components

### WebAuthnVerification Component

The `WebAuthnVerification` component handles the entire verification flow:

```typescript
<WebAuthnVerification
  email={email}
  password={password}
  onSuccess={() => router.push('/dashboard')}
  onError={(error) => setError(error)}
/>
```

**Props:**
- `email`: User's email address
- `password`: User's password (for re-authentication)
- `onSuccess`: Callback when verification succeeds
- `onError`: Callback when verification fails

## 🔧 Customization

### Customize UI

The `WebAuthnVerification` component uses your UI library. Update imports:

```typescript
// Change these to match your UI library
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
```

### Customize Error Messages

Update error messages in:
- `src/components/auth/webauthn-verification.tsx`
- `src/app/api/auth/webauthn/*/route.ts`

### Customize Timeout

Change timeout in `src/lib/auth/webauthn.ts`:

```typescript
timeout: 60000, // 60 seconds (change as needed)
```

## 🚀 Production Checklist

- [ ] HTTPS enabled
- [ ] RP ID configured correctly
- [ ] Environment variables set
- [ ] Database migration run
- [ ] RLS policies verified
- [ ] Error handling tested
- [ ] Cryptographic verification implemented (see `SECURITY.md`)

## 📚 Next Steps

- See `ARCHITECTURE.md` for technical details
- See `SECURITY.md` for production security considerations
- See `examples/` for complete implementation examples

