# 🔧 Fix Connection Timeout Issue

## The Problem

You're getting a connection timeout when trying to sign up:
```
Connect Timeout Error (attempted addresses: 2604:5580:22::6812:260a:443, timeout: 10000ms)
```

This means your server can't reach Supabase. The address shown is IPv6.

## Solutions

### Solution 1: Check Your Supabase URL

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy the **Project URL** (should be something like `https://xxxxx.supabase.co`)
3. Check your `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Make sure there are **no trailing slashes** in the URL
5. Restart your dev server: `npm run dev`

### Solution 2: Network/Firewall Issue

If you're behind a firewall or VPN:
- Try disabling VPN temporarily
- Check if your network blocks Supabase
- Try a different network

### Solution 3: IPv6 Issue

The error shows an IPv6 address. Try forcing IPv4:
- Check if your network supports IPv6
- Some networks have IPv6 issues

### Solution 4: Increase Timeout

We can increase the timeout in the Supabase client configuration.

### Solution 5: Check Supabase Status

1. Go to https://status.supabase.com
2. Check if there are any outages
3. Verify your project is active in Supabase Dashboard

## Quick Test

Test your Supabase connection:

```bash
# In your terminal, test the connection
curl https://your-project.supabase.co/rest/v1/
```

If this fails, it's a network/connectivity issue.

## Next Steps

1. **Verify your `.env.local` file** has correct Supabase URL
2. **Restart your dev server** after changing env vars
3. **Check Supabase Dashboard** - make sure project is active
4. **Try the curl test** above

Let me know what you find!

