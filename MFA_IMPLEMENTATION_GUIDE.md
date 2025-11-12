# 🔐 MFA Implementation Guide for Brain Battle

## ❌ **THE PROBLEM: Why MFA Isn't Working**

You're currently using a **custom authentication system** with:
- Custom `users` table (not Supabase Auth)
- Bcrypt password hashing
- Manual session management

**Supabase's built-in MFA only works with Supabase Auth (`auth.users` table), NOT with custom auth systems.**

This is why you can't add MFA - you're trying to use Supabase MFA features with a system that doesn't support them.

---

## ✅ **SOLUTION OPTIONS**

You have **two paths** to add MFA:

### **Option A: Migrate to Supabase Auth** (Recommended) ⭐
- ✅ Built-in MFA support (TOTP, SMS, Email)
- ✅ Better security (managed by Supabase)
- ✅ Less code to maintain
- ✅ Automatic session management
- ⚠️ Requires migration of existing users

### **Option B: Implement Custom TOTP MFA**
- ✅ Keep your current auth system
- ✅ Full control over implementation
- ⚠️ More code to write and maintain
- ⚠️ You handle all security concerns

---

## 🚀 **OPTION A: Migrate to Supabase Auth (Recommended)**

### Step 1: Enable Supabase Auth MFA

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Enable **Email** provider
4. Go to **Authentication** → **Settings** → **Multi-Factor Authentication**
5. Enable **TOTP (Time-based One-Time Password)**
6. Optionally enable **SMS** or **Email** MFA

### Step 2: Migration Strategy

You'll need to:
1. Create a migration script to move users from `users` table to `auth.users`
2. Update all references from `users.id` to `auth.users.id`
3. Update authentication functions to use Supabase Auth
4. Update session management

**Migration Script Example:**
```sql
-- Create a function to migrate existing users to Supabase Auth
-- This should be run carefully with backups!
```

### Step 3: Update Authentication Code

Replace your custom auth with Supabase Auth:

```typescript
// OLD (custom-auth.ts)
import bcrypt from "bcryptjs"
const passwordHash = await bcrypt.hash(password, saltRounds)

// NEW (using Supabase Auth)
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { username } }
})
```

### Step 4: Add MFA to Login Flow

```typescript
// After password verification, check if MFA is enabled
const { data: { user } } = await supabase.auth.getUser()

if (user && user.factors?.length > 0) {
  // User has MFA enabled, require TOTP code
  return { requiresMFA: true, userId: user.id }
}

// Verify TOTP code
const { data, error } = await supabase.auth.verifyOtp({
  token: totpCode,
  type: 'totp'
})
```

---

## 🛠️ **OPTION B: Custom TOTP MFA Implementation**

If you want to keep your custom auth system, here's how to implement MFA yourself.

### Step 1: Install Required Packages

```bash
npm install speakeasy qrcode
npm install --save-dev @types/speakeasy @types/qrcode
```

### Step 2: Add MFA Columns to Users Table

```sql
-- Add MFA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[]; -- Array of backup codes
```

### Step 3: Create MFA Functions

Create `src/lib/auth/mfa.ts`:

```typescript
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'

// Generate MFA secret for a user
export async function generateMFASecret(userId: string, email: string) {
  const supabase = await createClient()
  
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `Brain Battle (${email})`,
    issuer: 'Brain Battle'
  })
  
  // Store secret in database (encrypted in production!)
  await supabase
    .from('users')
    .update({ 
      mfa_secret: secret.base32,
      mfa_enabled: false // Not enabled until verified
    })
    .eq('id', userId)
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)
  
  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
    manualEntryKey: secret.base32
  }
}

// Verify TOTP token
export async function verifyTOTP(userId: string, token: string): Promise<boolean> {
  const supabase = await createClient()
  
  // Get user's MFA secret
  const { data: user, error } = await supabase
    .from('users')
    .select('mfa_secret')
    .eq('id', userId)
    .single()
  
  if (error || !user?.mfa_secret) {
    return false
  }
  
  // Verify token
  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps (60 seconds) of tolerance
  })
  
  return verified
}

// Generate backup codes
export async function generateBackupCodes(userId: string): Promise<string[]> {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    // Generate 8-digit backup code
    const code = Math.floor(10000000 + Math.random() * 90000000).toString()
    codes.push(code)
  }
  
  // Hash codes before storing (use bcrypt)
  const supabase = await createClient()
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, 10))
  )
  
  await supabase
    .from('users')
    .update({ mfa_backup_codes: hashedCodes })
    .eq('id', userId)
  
  return codes // Return plain codes to user (they won't see them again!)
}

// Enable MFA after verification
export async function enableMFA(userId: string) {
  const supabase = await createClient()
  await supabase
    .from('users')
    .update({ mfa_enabled: true })
    .eq('id', userId)
}
```

### Step 4: Update Login Flow

Update `src/lib/actions/custom-auth.ts`:

```typescript
// After password verification, check MFA
export async function authenticateUser(
  email: string, 
  password: string,
  totpCode?: string // Optional TOTP code
): Promise<AuthResponse> {
  // ... existing password verification ...
  
  // Check if user has MFA enabled
  if (userData.mfa_enabled) {
    if (!totpCode) {
      // MFA required but not provided
      return { 
        success: false, 
        requiresMFA: true,
        userId: userData.id,
        error: 'MFA code required' 
      }
    }
    
    // Verify TOTP code
    const isValidTOTP = await verifyTOTP(userData.id, totpCode)
    if (!isValidTOTP) {
      return { success: false, error: 'Invalid MFA code' }
    }
  }
  
  // Continue with normal login...
}
```

### Step 5: Create MFA Setup UI

Create `src/app/settings/mfa/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { generateMFASecret, enableMFA } from '@/lib/auth/mfa'

export default function MFASetupPage() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  
  const handleSetup = async () => {
    const userId = localStorage.getItem('userId')
    const email = localStorage.getItem('userEmail')
    
    if (!userId || !email) return
    
    const result = await generateMFASecret(userId, email)
    setQrCode(result.qrCode)
    setSecret(result.manualEntryKey)
    setStep('verify')
  }
  
  const handleVerify = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    
    // Verify code and enable MFA
    const isValid = await verifyTOTP(userId, verificationCode)
    if (isValid) {
      await enableMFA(userId)
      // Show success message
    } else {
      // Show error
    }
  }
  
  return (
    <div>
      {step === 'setup' && (
        <button onClick={handleSetup}>Enable MFA</button>
      )}
      
      {step === 'verify' && qrCode && (
        <div>
          <img src={qrCode} alt="QR Code" />
          <p>Or enter manually: {secret}</p>
          <input 
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
          />
          <button onClick={handleVerify}>Verify & Enable</button>
        </div>
      )}
    </div>
  )
}
```

### Step 6: Update Login Page

Update `src/app/login/page.tsx` to handle MFA:

```typescript
const [requiresMFA, setRequiresMFA] = useState(false)
const [totpCode, setTotpCode] = useState('')

const handleLogin = async (formData: FormData) => {
  const result = await login(formData)
  
  if (result.requiresMFA) {
    setRequiresMFA(true)
  }
}

const handleMFAVerification = async () => {
  const formData = new FormData()
  formData.append('email', email)
  formData.append('password', password)
  formData.append('totpCode', totpCode)
  
  await login(formData)
}

// In JSX:
{requiresMFA && (
  <div>
    <input 
      value={totpCode}
      onChange={(e) => setTotpCode(e.target.value)}
      placeholder="Enter 6-digit code"
    />
    <button onClick={handleMFAVerification}>Verify</button>
  </div>
)}
```

---

## 🔒 **SECURITY BEST PRACTICES**

1. **Encrypt MFA Secrets**: Never store MFA secrets in plain text. Use encryption at rest.
2. **Rate Limiting**: Limit MFA verification attempts (e.g., 5 attempts per 15 minutes)
3. **Backup Codes**: Always generate and securely store backup codes
4. **Session Management**: After MFA verification, create a secure session token
5. **Audit Logging**: Log all MFA setup and verification attempts

---

## 📋 **RECOMMENDATION**

**I strongly recommend Option A (Migrate to Supabase Auth)** because:
- ✅ Less code to maintain
- ✅ Better security (managed by experts)
- ✅ Built-in features (password reset, email verification, etc.)
- ✅ Easier to add more auth providers later
- ✅ Better documentation and community support

The migration effort is worth it for the long-term benefits.

---

## 🚨 **IMPORTANT NOTES**

1. **Backup First**: Always backup your database before making changes
2. **Test Thoroughly**: Test MFA flow in development before production
3. **User Communication**: Inform users about MFA setup and how to use it
4. **Recovery Process**: Have a process for users who lose their MFA device

---

## 📚 **Additional Resources**

- [Supabase Auth MFA Documentation](https://supabase.com/docs/guides/auth/mfa)
- [Speakeasy TOTP Library](https://github.com/speakeasyjs/speakeasy)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)

