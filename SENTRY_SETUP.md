# Sentry Setup Guide

Sentry is now configured for your Next.js application. Follow these steps to complete the setup.

## Quick Setup

### 1. Create a Sentry Account

1. Go to https://sentry.io
2. Sign up for a free account (or sign in)
3. Create a new project
4. Select **Next.js** as your platform

### 2. Get Your DSN

1. In your Sentry project dashboard, go to **Settings** → **Client Keys (DSN)**
2. Copy your DSN (it looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 3. Add Environment Variable

Add to your `.env.local` file:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@your-org.ingest.sentry.io/your-project-id
```

### 4. Update .sentryclirc (Optional)

If you want to use Sentry CLI for releases, update `.sentryclirc`:

```json
{
  "defaults": {
    "org": "your-org-slug",
    "project": "brain-brawl"
  }
}
```

### 5. Test the Setup

1. Start your development server: `npm run dev`
2. Trigger an error in your app
3. Check your Sentry dashboard - you should see the error appear

## Configuration Files

The following files have been created:

- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.server.config.ts` - Server-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime Sentry configuration

These files are automatically loaded by `@sentry/nextjs`. You can customize them if needed.

## Usage

### In API Routes

```typescript
import { captureException } from '@/lib/monitoring/sentry'

export async function POST(request: NextRequest) {
  try {
    // your code
  } catch (error) {
    captureException(error, { context: 'api_route', route: '/api/example' })
    throw error
  }
}
```

### In React Components

```typescript
import { captureException } from '@/lib/monitoring/sentry'

function MyComponent() {
  const handleError = (error: Error) => {
    captureException(error, { component: 'MyComponent' })
  }
  
  // ...
}
```

### Set User Context

```typescript
import { setUser } from '@/lib/monitoring/sentry'

// When user logs in
setUser({ 
  id: user.id, 
  email: user.email, 
  username: user.username 
})

// When user logs out
clearUser()
```

## Features

- ✅ Automatic error tracking
- ✅ Performance monitoring
- ✅ Session replay (in development)
- ✅ Source maps for better stack traces
- ✅ User context tracking
- ✅ Custom error filtering

## Next Steps

1. **Set up alerts** in Sentry dashboard for critical errors
2. **Configure release tracking** (optional) for better deployment tracking
3. **Set up integrations** (Slack, email, etc.) for notifications
4. **Review and adjust** sample rates in the config files if needed

## Troubleshooting

### Errors not appearing in Sentry?

1. Check that `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Verify the DSN is valid in your Sentry dashboard
3. Check browser console for Sentry initialization errors
4. Ensure you're not blocking Sentry in your ad blocker

### Build errors?

If you get build errors related to Sentry:
1. Make sure `@sentry/nextjs` is installed: `npm install @sentry/nextjs`
2. Check that the config files are in the root directory
3. Try running `npm run build` to see detailed error messages

### Not working in production?

1. Ensure `NEXT_PUBLIC_SENTRY_DSN` is set in your production environment
2. Check that source maps are being uploaded (requires Sentry CLI setup)
3. Verify your Sentry project settings allow your domain

## Documentation

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io)

---

**Note**: Sentry will automatically initialize when the DSN is provided. No manual initialization needed!

