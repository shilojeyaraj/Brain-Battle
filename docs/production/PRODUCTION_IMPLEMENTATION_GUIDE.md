# Production Implementation Guide

This guide provides step-by-step instructions for implementing all production-ready code created for Brain Battle.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Error Tracking (Sentry)](#error-tracking-sentry)
3. [Error Boundaries](#error-boundaries)
4. [Health Check Endpoint](#health-check-endpoint)
5. [Input Validation](#input-validation)
6. [Performance Monitoring](#performance-monitoring)
7. [Cost Monitoring](#cost-monitoring)
8. [Structured Logging](#structured-logging)
9. [Database Backup/Restore](#database-backuprestore)
10. [API Error Handling](#api-error-handling)
11. [Retry Logic](#retry-logic)
12. [Monitoring Dashboard](#monitoring-dashboard)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install @sentry/nextjs zod
npm install --save-dev @types/node tsx
```

### 2. Environment Variables

Add to `.env.local`:

```env
# Sentry (optional but recommended)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Database Backup (optional)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Version
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 3. Initialize Sentry (if using)

```bash
npx @sentry/nextjs wizard
```

---

## Error Tracking (Sentry)

### Setup

1. **Create Sentry Account**: https://sentry.io
2. **Get DSN**: Copy your DSN from Sentry dashboard
3. **Add to .env.local**: `NEXT_PUBLIC_SENTRY_DSN=your_dsn`

### Usage

```typescript
import { captureException, setUser } from '@/lib/monitoring/sentry'

// In API routes
try {
  // your code
} catch (error) {
  captureException(error, { context: 'api_route' })
}

// Set user context
setUser({ id: userId, email: userEmail })
```

### Files Created
- `src/lib/monitoring/sentry.ts`

---

## Error Boundaries

### Setup

Wrap your app with ErrorBoundary:

```typescript
// src/app/layout.tsx
import { ErrorBoundary } from '@/components/error-boundary'

export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}
```

### Usage

```typescript
// Wrap specific components
<ErrorBoundary fallback={<CustomErrorComponent />}>
  <YourComponent />
</ErrorBoundary>
```

### Files Created
- `src/components/error-boundary.tsx`

---

## Health Check Endpoint

### Setup

The health check endpoint is automatically available at `/api/health`

### Usage

```bash
curl https://your-domain.com/api/health
```

### Response

```json
{
  "status": "healthy",
  "timestamp": "2024-12-01T00:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "responseTime": 50 },
    "api": { "status": "healthy", "responseTime": 5 }
  }
}
```

### Files Created
- `src/app/api/health/route.ts`

---

## Input Validation

### Setup

Use validation schemas in your API routes:

```typescript
import { validateRequestBody, createRoomSchema } from '@/lib/validation/schemas'
import { ApiError } from '@/lib/utils/api-error-handler'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validated = validateRequestBody(createRoomSchema, body)
  
  // Use validated data
  const { name, is_private } = validated
}
```

### Available Schemas

- `registerSchema` - User registration
- `loginSchema` - User login
- `createRoomSchema` - Room creation
- `joinRoomSchema` - Join room
- `generateQuizSchema` - Quiz generation
- `submitAnswerSchema` - Answer submission
- `fileUploadSchema` - File upload
- `updateProfileSchema` - Profile update

### Files Created
- `src/lib/validation/schemas.ts`

---

## Performance Monitoring

### Setup

Use performance monitoring in your code:

```typescript
import { performanceMonitor, trackApiPerformance } from '@/lib/monitoring/performance'

// Track function execution
const result = await performanceMonitor.measure('database_query', async () => {
  return await supabase.from('users').select('*')
})

// Get stats
const stats = performanceMonitor.getStats('database_query')
console.log(`Average: ${stats.avg}ms, p95: ${stats.p95}ms`)
```

### Files Created
- `src/lib/monitoring/performance.ts`

---

## Cost Monitoring

### Setup

Track API usage and costs:

```typescript
import { costMonitor } from '@/lib/monitoring/cost'

// Track OpenAI usage
costMonitor.trackOpenAI('gpt-4', tokensUsed)

// Track Supabase calls
costMonitor.trackSupabase('api_call', 1)

// Get cost summary
const summary = costMonitor.getSummary()
console.log(`Daily cost: $${summary.dailyCost}`)
```

### Files Created
- `src/lib/monitoring/cost.ts`

---

## Structured Logging

### Setup

Use structured logging throughout your app:

```typescript
import { logger } from '@/lib/monitoring/logger'

logger.info('User logged in', { userId: user.id })
logger.error('Database error', error, { table: 'users' })
logger.apiRequest('POST', '/api/rooms', 200, 150, userId)
```

### Files Created
- `src/lib/monitoring/logger.ts`

---

## Database Backup/Restore

### Setup

### Backup Database

```bash
# Set environment variables
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run backup
npx tsx scripts/backup-database.ts
```

Backups are saved to `backups/backup-{timestamp}.json`

### Restore Database

```bash
npx tsx scripts/restore-database.ts backups/backup-2024-12-01T00-00-00-000Z.json
```

**WARNING**: This will overwrite existing data!

### Files Created
- `scripts/backup-database.ts`
- `scripts/restore-database.ts`

---

## API Error Handling

### Setup

Use standardized error handling:

```typescript
import { withErrorHandling, ApiError, validateRequestBody } from '@/lib/utils/api-error-handler'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json()
  const validated = validateRequestBody(createRoomSchema, body)
  
  // Your code here
  
  return NextResponse.json({ success: true })
})
```

### Custom Errors

```typescript
throw new ApiError(400, 'Invalid room code', 'INVALID_ROOM_CODE', { roomCode })
```

### Files Created
- `src/lib/utils/api-error-handler.ts`

---

## Retry Logic

### Setup

Use retry logic for external API calls:

```typescript
import { retry } from '@/lib/utils/retry'

const result = await retry(
  async () => {
    return await openai.chat.completions.create(/* ... */)
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    retryable: (error) => error.status === 429 || error.status >= 500
  }
)
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from '@/lib/utils/retry'

const breaker = new CircuitBreaker()

const result = await breaker.execute(async () => {
  return await externalApiCall()
})
```

### Files Created
- `src/lib/utils/retry.ts`

---

## Monitoring Dashboard

### Setup

Access monitoring endpoint (requires authentication):

```bash
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/monitoring
```

### Response

```json
{
  "success": true,
  "timestamp": "2024-12-01T00:00:00.000Z",
  "performance": {
    "api_request": { "avg": 150, "p95": 300, ... }
  },
  "cost": {
    "totalCost": 0.50,
    "dailyCost": 0.10,
    "monthlyProjection": 3.00
  },
  "health": { ... }
}
```

### Files Created
- `src/app/api/monitoring/route.ts`

---

## Integration Checklist

### Phase 1: Core Setup
- [ ] Install dependencies (`@sentry/nextjs`, `zod`, `tsx`)
- [ ] Set up environment variables
- [ ] Initialize Sentry (if using)
- [ ] Add ErrorBoundary to root layout

### Phase 2: API Routes
- [ ] Update API routes to use `withErrorHandling`
- [ ] Add input validation to all API routes
- [ ] Add performance tracking to critical routes
- [ ] Add cost tracking for external APIs

### Phase 3: Monitoring
- [ ] Set up health check monitoring (UptimeRobot, Pingdom)
- [ ] Configure Sentry alerts
- [ ] Set up monitoring dashboard access
- [ ] Test backup/restore scripts

### Phase 4: Testing
- [ ] Test error boundaries
- [ ] Test input validation
- [ ] Test retry logic
- [ ] Test health check endpoint
- [ ] Test monitoring endpoint

---

## Example: Updating an API Route

### Before

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // ... no validation
    // ... code
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### After

```typescript
import { withErrorHandling, validateRequestBody } from '@/lib/utils/api-error-handler'
import { createRoomSchema } from '@/lib/validation/schemas'
import { performanceMonitor } from '@/lib/monitoring/performance'
import { logger } from '@/lib/monitoring/logger'
import { costMonitor } from '@/lib/monitoring/cost'

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Validate input
  const body = await request.json()
  const validated = validateRequestBody(createRoomSchema, body)
  
  // Track performance
  const result = await performanceMonitor.measure('create_room', async () => {
    // Your code here
    logger.info('Room created', { roomId: room.id })
    costMonitor.trackSupabase('api_call', 2)
    
    return NextResponse.json({ success: true, room })
  })
  
  return result
})
```

---

## Troubleshooting

### Sentry not working
- Check `NEXT_PUBLIC_SENTRY_DSN` is set
- Verify Sentry initialization in `sentry.client.config.ts` and `sentry.server.config.ts`
- Check browser console for errors

### Validation errors
- Ensure Zod schemas match your data structure
- Check error messages for specific validation failures

### Performance monitoring not showing data
- Verify `performanceMonitor` is being called
- Check that metrics are being tracked before querying

### Backup script fails
- Verify `SUPABASE_SERVICE_ROLE_KEY` has admin access
- Check table names match your schema
- Ensure backups directory exists

---

## Next Steps

1. **Review and customize** all code to match your specific needs
2. **Test thoroughly** in development before production
3. **Set up monitoring** alerts and dashboards
4. **Document** any customizations you make
5. **Monitor** costs and performance after launch

---

## Support

For issues or questions:
1. Check the code comments in each file
2. Review the production planning document
3. Test in development environment first
4. Monitor logs for detailed error messages

---

**Last Updated**: December 2024
**Version**: 1.0.0

