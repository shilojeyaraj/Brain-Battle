# Security Guide

Security considerations and production hardening for WebAuthn MFA.

## 🔒 Current Security Status

### ✅ Implemented

- **User Verification Required** - PIN/biometric enforced
- **Platform Authenticators** - Device-built-in security
- **RP ID Validation** - Domain matching
- **Challenge-Based Auth** - Random challenges
- **Row Level Security** - Database-level access control
- **HTTPS Enforcement** - Required in production

### ⚠️ Production TODOs

- **Cryptographic Verification** - Signature verification
- **Challenge Storage** - Server-side with expiration
- **Replay Protection** - Counter validation
- **Rate Limiting** - Prevent brute force
- **Audit Logging** - Track authentication events

## 🛡️ Security Best Practices

### 1. Cryptographic Verification

**Current:** Basic validation (credential exists)

**Production Required:**

```typescript
// Install: npm install @simplewebauthn/server

import { verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server'

// In verify-registration route:
const verification = await verifyRegistrationResponse({
  response: credential,
  expectedChallenge: storedChallenge,
  expectedOrigin: 'https://yourdomain.com',
  expectedRPID: 'yourdomain.com'
})

// In verify-authentication route:
const verification = await verifyAuthenticationResponse({
  response: credential,
  expectedChallenge: storedChallenge,
  expectedOrigin: 'https://yourdomain.com',
  expectedRPID: 'yourdomain.com',
  authenticator: {
    credentialID: storedCredential.credential_id,
    credentialPublicKey: storedCredential.public_key,
    counter: storedCredential.counter
  }
})
```

### 2. Challenge Storage

**Current:** Challenge in response

**Production Required:**

```typescript
// Create challenges table
CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY,
  user_id UUID,
  challenge TEXT,
  type TEXT, -- 'registration' or 'authentication'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Store challenge on generation
const challenge = generateChallenge()
await supabase.from('webauthn_challenges').insert({
  user_id: user.id,
  challenge,
  type: 'registration',
  expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
})

// Verify challenge on verification
const { data: storedChallenge } = await supabase
  .from('webauthn_challenges')
  .select('*')
  .eq('challenge', receivedChallenge)
  .eq('user_id', user.id)
  .gt('expires_at', new Date())
  .single()

if (!storedChallenge) {
  throw new Error('Invalid or expired challenge')
}

// Delete used challenge
await supabase.from('webauthn_challenges').delete().eq('id', storedChallenge.id)
```

### 3. Replay Protection

**Current:** Counter stored but not validated

**Production Required:**

```typescript
// In verify-authentication route:
const verification = await verifyAuthenticationResponse({
  // ... other options
  authenticator: {
    // ... other fields
    counter: storedCredential.counter
  }
})

// Verify counter increased
if (verification.authenticator.counter <= storedCredential.counter) {
  throw new Error('Replay attack detected')
}

// Update counter
await supabase
  .from('webauthn_credentials')
  .update({ counter: verification.authenticator.counter })
  .eq('id', storedCredential.id)
```

### 4. Rate Limiting

**Add to API routes:**

```typescript
// Install: npm install @upstash/ratelimit @upstash/redis

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
})

// In route handler:
const { success } = await ratelimit.limit(userId)
if (!success) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429 }
  )
}
```

### 5. Audit Logging

**Create audit table:**

```sql
CREATE TABLE webauthn_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT, -- 'registration', 'authentication', 'deletion'
  success BOOLEAN,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Log events:**

```typescript
await supabase.from('webauthn_audit_log').insert({
  user_id: user.id,
  event_type: 'authentication',
  success: true,
  ip_address: request.headers.get('x-forwarded-for'),
  user_agent: request.headers.get('user-agent')
})
```

## 🔐 Production Checklist

### Before Going Live

- [ ] Implement cryptographic verification
- [ ] Add challenge storage with expiration
- [ ] Implement replay protection (counter validation)
- [ ] Add rate limiting
- [ ] Enable audit logging
- [ ] Test on production domain
- [ ] Verify HTTPS is enforced
- [ ] Test error handling
- [ ] Review RLS policies
- [ ] Set up monitoring/alerts

### Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Optional (for rate limiting)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Supabase Configuration

1. **Enable RLS** on all tables
2. **Review policies** for security
3. **Enable audit logging** (if available)
4. **Set up alerts** for failed authentications
5. **Configure backup** strategy

## 🚨 Security Threats & Mitigations

### 1. Phishing Attacks

**Threat:** User enters credentials on fake site

**Mitigation:**
- WebAuthn is phishing-resistant
- RP ID validation prevents credential use on wrong domain
- User verification ensures user is present

### 2. Replay Attacks

**Threat:** Attacker replays authentication response

**Mitigation:**
- Challenge-based authentication
- Counter validation
- Challenge expiration

### 3. Brute Force

**Threat:** Attacker tries many credentials

**Mitigation:**
- Rate limiting
- Account lockout after failed attempts
- CAPTCHA after multiple failures

### 4. Man-in-the-Middle

**Threat:** Attacker intercepts communication

**Mitigation:**
- HTTPS required
- Certificate pinning (advanced)
- HSTS headers

### 5. Credential Theft

**Threat:** Database breach exposes credentials

**Mitigation:**
- Public keys only (not private keys)
- RLS policies
- Encrypted database backups
- Regular security audits

## 🔍 Security Testing

### Test Cases

1. **Valid Authentication**
   - Should succeed with correct credential
   - Should update last_used_at
   - Should increment counter

2. **Invalid Credential**
   - Should fail with wrong credential ID
   - Should not create session
   - Should log failure

3. **Expired Challenge**
   - Should fail with old challenge
   - Should not accept expired challenges

4. **Replay Attack**
   - Should fail if counter not increased
   - Should detect duplicate authentication

5. **Rate Limiting**
   - Should block after limit exceeded
   - Should reset after time window

### Penetration Testing

Consider professional penetration testing for:
- Cryptographic verification
- Challenge validation
- Replay protection
- Rate limiting effectiveness

## 📊 Monitoring

### Key Metrics

- Authentication success rate
- Authentication failure rate
- Average authentication time
- Failed authentication attempts per user
- Credential registration rate

### Alerts

Set up alerts for:
- High failure rate
- Unusual authentication patterns
- Multiple failed attempts from same IP
- Database errors

## 📚 Additional Resources

- [OWASP WebAuthn Guide](https://cheatsheetseries.owasp.org/cheatsheets/WebAuthn_Cheat_Sheet.html)
- [WebAuthn Security Considerations](https://www.w3.org/TR/webauthn-2/#sctn-security-considerations)
- [SimpleWebAuthn Security](https://simplewebauthn.dev/docs/packages/server)

## ⚠️ Important Notes

1. **Current Implementation:** Suitable for development/testing
2. **Production Use:** Requires implementing TODOs
3. **Cryptographic Verification:** Critical for production
4. **Regular Updates:** Keep dependencies updated
5. **Security Reviews:** Regular security audits recommended

