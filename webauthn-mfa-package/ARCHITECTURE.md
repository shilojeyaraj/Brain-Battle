# Architecture Documentation

Technical architecture and implementation details of the WebAuthn MFA system.

## 🏗️ System Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Registration/Authentication Request
       ▼
┌─────────────────────────────────────┐
│         Next.js API Routes           │
│  /api/auth/webauthn/register         │
│  /api/auth/webauthn/authenticate     │
└──────┬───────────────────────────────┘
       │
       │ 2. Verify & Generate Options
       ▼
┌─────────────────────────────────────┐
│      WebAuthn Utility Library       │
│      (src/lib/auth/webauthn.ts)     │
└──────┬───────────────────────────────┘
       │
       │ 3. Return Options
       ▼
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 4. WebAuthn API Call
       ▼
┌─────────────────────────────────────┐
│    Platform Authenticator            │
│  (Windows Hello / Face ID / etc.)    │
└──────┬───────────────────────────────┘
       │
       │ 5. Credential Response
       ▼
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 6. Verify Credential
       ▼
┌─────────────────────────────────────┐
│         Next.js API Routes           │
│  /api/auth/webauthn/verify-*         │
└──────┬───────────────────────────────┘
       │
       │ 7. Store/Verify in Database
       ▼
┌─────────────────────────────────────┐
│         Supabase Database            │
│    webauthn_credentials table        │
└─────────────────────────────────────┘
```

## 📦 Component Breakdown

### 1. Core Library (`webauthn.ts`)

**Location:** `src/lib/auth/webauthn.ts`

**Responsibilities:**
- Generate registration/authentication options
- Encode/decode Base64URL data
- Generate cryptographically secure challenges
- Interface with WebAuthn API
- Validate RP ID

**Key Functions:**

```typescript
// Generate options for new credential registration
generateRegistrationOptions(userId, userName, rpName, rpId)

// Generate options for authentication
generateAuthenticationOptions(credentialIds, rpId)

// Register new credential (client-side)
registerCredential(options)

// Authenticate with existing credential (client-side)
authenticateWithCredential(options)

// Extract credential data for storage
extractCredentialData(credential)

// Check WebAuthn support
isWebAuthnSupported()
```

### 2. API Routes

#### Registration Flow

**`/api/auth/webauthn/register`**
- Verifies user authentication
- Generates registration options
- Returns challenge and options to client

**`/api/auth/webauthn/verify-registration`**
- Receives credential from client
- Stores credential in database
- Returns success/error

#### Authentication Flow

**`/api/auth/webauthn/authenticate`**
- Verifies email/password
- Checks for WebAuthn credentials
- Generates authentication options
- Returns challenge and options

**`/api/auth/webauthn/verify-authentication`**
- Receives credential assertion
- Verifies credential (basic validation)
- Updates last used timestamp
- Returns session

### 3. Database Schema

**Table: `webauthn_credentials`**

```sql
CREATE TABLE webauthn_credentials (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  credential_id TEXT UNIQUE,      -- Base64URL encoded
  public_key TEXT,                -- JSON string
  counter BIGINT DEFAULT 0,       -- Replay protection
  device_type TEXT,               -- 'platform' or 'cross-platform'
  device_name TEXT,
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
```

**RLS Policies:**
- Users can only view their own credentials
- Users can only insert their own credentials
- Users can only update their own credentials
- Users can only delete their own credentials

### 4. Client Components

**`WebAuthnVerification` Component**

Handles the complete authentication flow:
1. Checks WebAuthn support
2. Gets authentication options from server
3. Calls WebAuthn API
4. Extracts credential data
5. Verifies with server
6. Calls success callback

## 🔐 Security Features

### 1. User Verification

**Enforced:** `userVerification: 'required'`

This ensures:
- Device PIN must be entered
- OR biometric authentication must be used
- Prevents credential use without user verification

### 2. Platform Authenticators

**Enforced:** `authenticatorAttachment: 'platform'`

This ensures:
- Only device-built-in authenticators (Windows Hello, Face ID, Touch ID)
- No external security keys (for this implementation)
- Better user experience (no additional hardware needed)

### 3. RP ID Validation

**Automatic:** Extracted from request origin

- Must match domain exactly
- No ports allowed
- Prevents phishing attacks

### 4. Challenge-Based Authentication

**Random 32-byte challenges** generated for each request:
- Prevents replay attacks
- Ensures freshness
- Cryptographically secure

### 5. Row Level Security (RLS)

**Database-level security:**
- Users can only access their own credentials
- Enforced at database level
- Prevents unauthorized access

## ⚠️ Current Limitations

### 1. Cryptographic Verification (TODO)

**Current:** Basic validation (credential exists)

**Production Required:**
- Verify signature using stored public key
- Verify challenge matches
- Verify authenticator data
- Check user verification flag
- Validate counter for replay protection

**Recommended Library:** `@simplewebauthn/server`

### 2. Challenge Storage

**Current:** Challenge included in response

**Production Required:**
- Store challenges server-side
- Add expiration (e.g., 5 minutes)
- Verify challenge on verification endpoint

### 3. Session Management

**Current:** Basic Supabase session handling

**Production Considerations:**
- Implement proper session refresh
- Handle session expiration
- Add session validation middleware

## 🔄 Data Flow

### Registration Flow

```
1. User clicks "Enable WebAuthn"
   ↓
2. Client → POST /api/auth/webauthn/register
   ↓
3. Server generates options with challenge
   ↓
4. Client receives options
   ↓
5. Client → navigator.credentials.create()
   ↓
6. Device prompts for PIN/biometric
   ↓
7. Client receives credential
   ↓
8. Client extracts credential data
   ↓
9. Client → POST /api/auth/webauthn/verify-registration
   ↓
10. Server stores credential in database
   ↓
11. Success!
```

### Authentication Flow

```
1. User enters email/password → Signs in
   ↓
2. Server checks for WebAuthn credentials
   ↓
3. If found: Show WebAuthnVerification component
   ↓
4. Client → POST /api/auth/webauthn/authenticate
   ↓
5. Server verifies password, generates options
   ↓
6. Client receives options with challenge
   ↓
7. Client → navigator.credentials.get()
   ↓
8. Device prompts for PIN/biometric
   ↓
9. Client receives credential assertion
   ↓
10. Client extracts assertion data
   ↓
11. Client → POST /api/auth/webauthn/verify-authentication
   ↓
12. Server verifies credential (basic validation)
   ↓
13. Server updates last_used_at and counter
   ↓
14. Server returns session
   ↓
15. Client redirects to dashboard
```

## 🛠️ Extension Points

### Add Multiple Credentials

Currently supports one credential per user. To support multiple:

1. Remove unique constraint on `credential_id`
2. Update UI to show list of credentials
3. Allow users to name/delete credentials
4. Update authentication to try all credentials

### Add Cross-Platform Support

To support external security keys:

1. Change `authenticatorAttachment: 'platform'` to allow both
2. Update UI to show both options
3. Store `device_type` in database
4. Update authentication to handle both types

### Add Attestation Verification

For enterprise use:

1. Implement attestation verification
2. Store attestation data
3. Verify device manufacturer
4. Enforce device policies

## 📊 Performance Considerations

### Database Queries

- Indexed on `user_id` and `credential_id` for fast lookups
- Single query to check for credentials
- Efficient RLS policy evaluation

### API Response Times

- Registration: ~200-500ms (includes device prompt)
- Authentication: ~200-500ms (includes device prompt)
- Database operations: <50ms

### Client-Side Performance

- WebAuthn API calls are async
- No blocking operations
- Smooth user experience

## 🔍 Debugging

### Enable Logging

Add console logs in:
- `src/lib/auth/webauthn.ts`
- `src/app/api/auth/webauthn/*/route.ts`

### Common Issues

1. **RP ID mismatch:** Check domain matches exactly
2. **Credential not found:** Verify database query
3. **Unauthorized:** Check RLS policies
4. **WebAuthn not supported:** Check browser/device compatibility

## 📚 References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn](https://simplewebauthn.dev/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

