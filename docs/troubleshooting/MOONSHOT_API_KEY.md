# Moonshot API Key Troubleshooting

> **For detailed 401 error troubleshooting, see [MOONSHOT_401_ERROR.md](./MOONSHOT_401_ERROR.md)**

## Common Issues and Solutions

### 1. **401 Invalid Authentication Error**

This error means your API key is not being accepted by Moonshot. Here are the most common causes:

#### ✅ Check 1: Key Format in `.env.local`

Make sure your `.env.local` file has the key **without quotes**:

```bash
# ❌ WRONG - Don't use quotes
MOONSHOT_API_KEY="sk-xxxxxxxxxxxxx"

# ❌ WRONG - Don't use single quotes
MOONSHOT_API_KEY='sk-xxxxxxxxxxxxx'

# ✅ CORRECT - No quotes
MOONSHOT_API_KEY=sk-xxxxxxxxxxxxx
```

#### ✅ Check 2: No Extra Spaces

Make sure there are no spaces around the `=` sign:

```bash
# ❌ WRONG
MOONSHOT_API_KEY = sk-xxxxxxxxxxxxx
MOONSHOT_API_KEY= sk-xxxxxxxxxxxxx
MOONSHOT_API_KEY =sk-xxxxxxxxxxxxx

# ✅ CORRECT
MOONSHOT_API_KEY=sk-xxxxxxxxxxxxx
```

#### ✅ Check 3: Key Length

Moonshot API keys are typically:
- **51 characters** long
- Start with `sk-`
- Example: `sk-sloI1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxkIq8`

#### ✅ Check 4: Restart Dev Server

**CRITICAL**: After updating `.env.local`, you MUST restart your dev server:

1. Stop the server (press `Ctrl+C` in the terminal)
2. Start it again: `npm run dev`

Next.js caches environment variables on startup, so changes won't take effect until you restart.

#### ✅ Check 5: Verify Key in Moonshot Dashboard

1. Go to https://platform.moonshot.cn/
2. Log in to your account
3. Navigate to **API Keys** section
4. Verify:
   - The key is **Active** (not revoked/expired)
   - The key has the correct **permissions**
   - You copied the **entire key** (no truncation)

#### ✅ Check 6: Test the Key

Run the test script to verify your key:

```bash
npm run test:moonshot
```

This will:
- Show your key info (preview, length)
- List available models
- Test a simple API call
- Tell you exactly what's wrong if it fails

### 2. **Key Works for Notes but Not Quiz**

If notes generation works but quiz generation fails:

1. **Check model access**: The key might have access to some models but not others
2. **Check request size**: Quiz requests might be larger and hitting limits
3. **Check rate limits**: You might have hit API rate limits

Run the test script to see what models are available:
```bash
npm run test:moonshot
```

### 3. **"Key Not Found" Error**

If you get an error that the key is not found:

1. Make sure the file is named `.env.local` (not `.env` or `.env.local.txt`)
2. Make sure the file is in the **root directory** of your project
3. Make sure the variable name is exactly `MOONSHOT_API_KEY` (case-sensitive)

### 4. **Still Not Working?**

If you've checked everything above and it still doesn't work:

1. **Create a new key** in the Moonshot dashboard
2. **Delete the old key** from `.env.local`
3. **Add the new key** (without quotes, no spaces)
4. **Restart the dev server**
5. **Test again**: `npm run test:moonshot`

## Quick Verification Checklist

- [ ] Key is in `.env.local` file (root directory)
- [ ] Key has no quotes around it
- [ ] No spaces around the `=` sign
- [ ] Key starts with `sk-`
- [ ] Key is about 51 characters long
- [ ] Dev server was restarted after adding/updating key
- [ ] Key is active in Moonshot dashboard
- [ ] Test script passes: `npm run test:moonshot`

## Need Help?

If you're still having issues, check:
1. Moonshot API documentation: https://platform.moonshot.cn/docs
2. Moonshot status page: Check if there are any service outages
3. Your Moonshot account: Verify you have sufficient credits/quota

