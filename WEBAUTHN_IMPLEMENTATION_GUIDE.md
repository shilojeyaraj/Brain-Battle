# 🔐 WebAuthn MFA Implementation Guide

Complete guide to WebAuthn MFA with device PIN/biometric authentication in Brain Battle.

## Overview

WebAuthn (Web Authentication) is a W3C standard that enables strong, phishing-resistant authentication using platform authenticators (Windows Hello, Face ID, Touch ID) with device PIN verification.

### Key Features

- ✅ **Phishing-resistant** - Cryptographic proof of identity
- ✅ **Device PIN/Biometric** - Uses device's built-in security
- ✅ **No codes needed** - No SMS or email codes required
- ✅ **User-friendly** - Simple tap or PIN entry
- ✅ **Strong security** - Industry-standard FIDO2/WebAuthn protocol

## How It Works

### Registration Flow

1. User clicks "Enable Device PIN/Biometric" in MFA settings
2. Server generates WebAuthn registration options with `userVerification: 'required'`
3. Browser calls `navigator.credentials.create()` with platform authenticator
4. Device prompts for PIN/biometric (Windows Hello, Face ID, Touch ID)
5. Device creates a cryptographic key pair
6. Public key is sent to server and stored
7. Credential is enrolled as an MFA factor

### Authentication Flow

1. User logs in with email/password
2. Server detects WebAuthn MFA is enabled
3. Server generates authentication options with `userVerification: 'required'`
4. Browser calls `navigator.credentials.get()` with platform authenticator
5. Device prompts for PIN/biometric
6. Device signs the challenge with private key
7. Server verifies the signature using stored public key
8. User is authenticated

## Implementation Details

### Backend API Routes

#### 1. `/api/auth/webauthn/register` (POST)
Generates WebAuthn registration options for enrolling a new credential.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "options": {
    "challenge": "...",
    "rp": {
      "name": "Brain Battle",
      "id": "yourdomain.com"
    },
    "user": {
      "id": "...",
      "name": "user@example.com",
      "displayName": "Username"
    },
    "authenticatorSelection": {
      "authenticatorAttachment": "platform",
      "userVerification": "required"
    }
  }
}
```

#### 2. `/api/auth/webauthn/verify-registration` (POST)
Verifies and stores a newly registered WebAuthn credential.

**Request:**
```json
{
  "credential": {
    "id": "...",
    "rawId": "...",
    "response": {
      "clientDataJSON": "...",
      "attestationObject": "..."
    }
  },
  "challenge": "..."
}
```

**Response:**
```json
{
  "success": true,
  "factorId": "...",
  "message": "WebAuthn credential enrolled successfully"
}
```

#### 3. `/api/auth/webauthn/authenticate` (POST)
Generates WebAuthn authentication options for login.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "options": {
    "challenge": "...",
    "rpId": "yourdomain.com",
    "userVerification": "required"
  },
  "factorId": "..."
}
```

#### 4. `/api/auth/webauthn/verify-authentication` (POST)
Verifies a WebAuthn authentication response and completes login.

**Request:**
```json
{
  "credential": {
    "id": "...",
    "rawId": "...",
    "response": {
      "clientDataJSON": "...",
      "authenticatorData": "...",
      "signature": "..."
    }
  },
  "factorId": "...",
  "email": "user@example.com",
  "password": "password123",
  "challenge": "..."
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "access_token": "...",
    "refresh_token": "..."
  },
  "user": { ... }
}
```

### Client-Side Components

#### `WebAuthnVerification` Component
Component for verifying WebAuthn credentials during login.

**Props:**
- `email: string` - User's email
- `password: string` - User's password
- `onSuccess: () => void` - Callback on successful verification
- `onError: (error: string) => void` - Callback on error

**Usage:**
```tsx
<WebAuthnVerification
  email={email}
  password={password}
  onSuccess={() => router.push('/dashboard')}
  onError={(error) => setError(error)}
/>
```

### Utility Functions

#### `isWebAuthnSupported()`
Checks if WebAuthn with platform authenticators is supported.

```typescript
const supported = await isWebAuthnSupported()
if (!supported) {
  // Show fallback option
}
```

#### `registerCredential(options)`
Registers a new WebAuthn credential.

```typescript
const credential = await registerCredential(registrationOptions)
```

#### `authenticateWithCredential(options)`
Authenticates with an existing WebAuthn credential.

```typescript
const credential = await authenticateWithCredential(authenticationOptions)
```

## Configuration

### Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Supabase Configuration

1. **Enable WebAuthn in Supabase Dashboard**
   - Go to Authentication → Settings → Multi-Factor Authentication
   - Enable **WebAuthn** (FIDO2)

2. **Configure Relying Party (RP)**
   - RP ID should match your domain (e.g., `yourdomain.com`)
   - RP Name is displayed to users (e.g., "Brain Battle")

### Browser Requirements

WebAuthn requires:
- HTTPS (or localhost for development)
- Modern browser with WebAuthn support:
  - Chrome 67+
  - Firefox 60+
  - Safari 13+
  - Edge 18+

### Device Requirements

Platform authenticators require:
- **Windows**: Windows Hello (PIN or biometric)
- **macOS**: Touch ID or Face ID
- **iOS**: Face ID or Touch ID
- **Android**: Fingerprint or Face unlock

## Security Considerations

### 1. Challenge Storage
- Store challenges server-side with expiration (60 seconds)
- Never reuse challenges
- Verify challenge matches on verification

### 2. Credential Storage
- Store public keys securely
- Never store private keys (they never leave the device)
- Use Supabase's MFA factor storage

### 3. User Verification
- Always set `userVerification: 'required'` to enforce PIN/biometric
- Verify the `userVerified` flag in the response

### 4. RP ID Validation
- Validate RP ID matches your domain
- Prevent subdomain attacks

### 5. Attestation (Optional)
- For production, consider requiring attestation
- Verify device authenticity if needed

## Testing

### Test Registration

1. Go to `/settings/mfa`
2. Click "Device PIN/Biometric"
3. Follow device prompts to set up
4. Verify credential is enrolled

### Test Authentication

1. Log out
2. Log in with email/password
3. When prompted, use device PIN/biometric
4. Verify successful login

### Test Error Cases

- Unsupported browser/device
- User cancels PIN/biometric prompt
- Invalid credential
- Expired challenge

## Troubleshooting

### "WebAuthn is not supported"
- Ensure HTTPS (or localhost)
- Check browser version
- Verify platform authenticator is available

### "Platform authenticator not available"
- Check device has PIN/biometric set up
- Verify Windows Hello/Touch ID/Face ID is configured
- Try a different device

### "Registration failed"
- Check server logs for errors
- Verify RP ID matches domain
- Check Supabase MFA is enabled

### "Authentication failed"
- Verify credential is enrolled
- Check challenge is valid
- Verify signature validation

## Migration from Email MFA

To migrate users from Email MFA to WebAuthn:

1. Keep Email MFA as fallback
2. Allow users to enroll WebAuthn
3. Set WebAuthn as primary, Email as backup
4. Gradually deprecate Email MFA

## Production Checklist

- [ ] HTTPS enabled
- [ ] RP ID configured correctly
- [ ] Challenge storage with expiration
- [ ] Error handling and logging
- [ ] User-friendly error messages
- [ ] Fallback options for unsupported devices
- [ ] Rate limiting on API endpoints
- [ ] Security headers configured
- [ ] Monitoring and alerts

## Files Created

- ✅ `src/lib/auth/webauthn.ts` - WebAuthn utility functions
- ✅ `src/components/auth/webauthn-verification.tsx` - Login verification component
- ✅ `src/app/api/auth/webauthn/register/route.ts` - Registration endpoint
- ✅ `src/app/api/auth/webauthn/verify-registration/route.ts` - Registration verification
- ✅ `src/app/api/auth/webauthn/authenticate/route.ts` - Authentication endpoint
- ✅ `src/app/api/auth/webauthn/verify-authentication/route.ts` - Authentication verification
- ✅ Updated `src/app/settings/mfa/page.tsx` - Added WebAuthn option
- ✅ Updated `src/app/login/page.tsx` - Added WebAuthn verification

## Next Steps

1. **Enable WebAuthn in Supabase Dashboard**
2. **Test registration flow** on a supported device
3. **Test authentication flow** during login
4. **Add error handling** for edge cases
5. **Add monitoring** for WebAuthn events
6. **Document user instructions** for setup

## References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [FIDO2 Documentation](https://fidoalliance.org/fido2/)
- [Supabase MFA Documentation](https://supabase.com/docs/guides/auth/mfa)

---

**Last Updated**: 2025-01-10
**Version**: 1.0.0

