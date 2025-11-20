# 🔐 WebAuthn Setup Instructions

Since Supabase doesn't natively support WebAuthn as an MFA factor type, we've implemented a custom solution that stores WebAuthn credentials in our own database table.

## Database Setup

### Step 1: Run the Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the contents of `supabase/webauthn-credentials.sql`

This creates:
- `webauthn_credentials` table to store WebAuthn credentials
- RLS policies for security
- Helper functions for checking WebAuthn status

### Step 2: Verify Table Creation

Run this query to verify the table was created:

```sql
SELECT * FROM webauthn_credentials LIMIT 1;
```

## How It Works

### Registration Flow

1. User clicks "Device PIN/Biometric" in MFA settings
2. Server generates WebAuthn registration options
3. Browser prompts for device PIN/biometric
4. Credential is created and stored in `webauthn_credentials` table
5. User can now use WebAuthn for login

### Authentication Flow

1. User logs in with email/password
2. System checks `webauthn_credentials` table (not Supabase MFA factors)
3. If WebAuthn credential exists, prompt for device PIN/biometric
4. Verify credential and complete login

## Important Notes

### ⚠️ Current Implementation Status

The current implementation stores credentials but **does not fully verify cryptographic signatures**. For production, you need to:

1. **Install WebAuthn verification library:**
   ```bash
   npm install @simplewebauthn/server
   ```

2. **Implement proper signature verification** in:
   - `/api/auth/webauthn/verify-registration`
   - `/api/auth/webauthn/verify-authentication`

3. **Store challenges server-side** with expiration (60 seconds)

4. **Verify user verification flag** to ensure PIN/biometric was used

### Security Considerations

- ✅ Credentials stored in database with RLS policies
- ✅ User can only access their own credentials
- ⚠️ **TODO**: Implement cryptographic signature verification
- ⚠️ **TODO**: Implement challenge storage with expiration
- ⚠️ **TODO**: Implement counter-based replay protection

## Testing

1. **Enable WebAuthn:**
   - Go to `/settings/mfa`
   - Click "Device PIN/Biometric"
   - Follow device prompts

2. **Test Login:**
   - Log out
   - Log in with email/password
   - When prompted, use device PIN/biometric
   - Verify successful login

## Troubleshooting

### "WebAuthn credential not found"
- Check `webauthn_credentials` table has entries
- Verify RLS policies are correct
- Check user_id matches

### "WebAuthn is not supported"
- Ensure HTTPS (or localhost)
- Check browser version
- Verify platform authenticator is available

### "Failed to store credential"
- Check database permissions
- Verify RLS policies allow INSERT
- Check for duplicate credential_id

## Next Steps for Production

1. ✅ Database table created
2. ⚠️ Install `@simplewebauthn/server` library
3. ⚠️ Implement proper signature verification
4. ⚠️ Add challenge storage (Redis or database)
5. ⚠️ Add monitoring and logging
6. ⚠️ Add rate limiting
7. ⚠️ Add error handling

---

**Note**: This is a custom implementation since Supabase doesn't support WebAuthn as an MFA factor. The credentials are stored separately and checked during authentication.

