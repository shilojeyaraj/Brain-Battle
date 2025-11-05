# Scalability Guide - Supporting Large User Amounts

## 🎯 Current Architecture Analysis

### ✅ What's Already Scalable
- **Supabase**: Handles connection pooling automatically
- **Next.js**: Serverless functions scale horizontally
- **Real-time**: Supabase Realtime handles WebSocket connections
- **File Storage**: Supabase Storage scales automatically

### ⚠️ Scalability Bottlenecks Identified

1. **In-memory rate limiting** - Won't work across multiple servers
2. **No caching layer** - Every request hits database
3. **Missing database indexes** - Some queries could be slow
4. **No pagination** - Large datasets loaded entirely
5. **No connection pooling config** - Relying on Supabase defaults
6. **Real-time subscriptions** - Could be expensive at scale

## 🚀 Priority 1: Database Optimization

### 1.1 Add Missing Indexes

**File:** `supabase/schema.sql` or create migration

```sql
-- Add missing indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Game results indexes (for leaderboards and stats)
CREATE INDEX IF NOT EXISTS idx_game_results_user_id ON game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_completed_at ON game_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_results_xp_earned ON game_results(xp_earned DESC);

-- Quiz sessions indexes
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_room_id ON quiz_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON quiz_sessions(created_at DESC);

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_xp ON player_stats(xp DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_level ON player_stats(level DESC);

-- Room indexes
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_game_results_user_completed ON game_results(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_progress_session_user ON player_progress(session_id, user_id);

-- Partial indexes for active queries
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_active ON quiz_sessions(id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(id) WHERE is_private = true;
```

**Impact:** 10-100x faster queries on large datasets

### 1.2 Implement Pagination

**Current Issue:** Leaderboard and recent battles load all data

**Fix:** Add pagination to all list queries

**Example:** `src/components/dashboard/leaderboard.tsx`

```typescript
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)
const PAGE_SIZE = 20

const loadLeaderboard = async (pageNum: number) => {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*, profiles(display_name)')
    .order('xp', { ascending: false })
    .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1)
  
  if (data) {
    setHasMore(data.length === PAGE_SIZE)
    setLeaderboard(data)
  }
}
```

**Also add pagination to:**
- Recent battles
- Quiz history
- User search results
- Room lists

### 1.3 Optimize Database Queries

**Issue:** N+1 queries and missing joins

**Example Fix:** `src/app/api/user-stats/route.ts`

```typescript
// ❌ BAD: Multiple queries
const { data: profile } = await supabase.from('profiles')...
const { data: stats } = await supabase.from('player_stats')...
const { data: games } = await supabase.from('game_results')...

// ✅ GOOD: Single query with joins
const { data: userData } = await supabase
  .from('player_stats')
  .select(`
    *,
    profiles(*),
    game_results(
      id,
      final_score,
      questions_answered,
      correct_answers,
      xp_earned,
      completed_at,
      quiz_sessions(session_name)
    )
  `)
  .eq('user_id', userId)
  .single()
```

## 🚀 Priority 2: Caching Layer

### 2.1 Implement Redis Caching

**Why:** Reduces database load by 80-90%

**Install:** 
```bash
npm install ioredis
# Or use Upstash Redis (serverless, free tier)
npm install @upstash/redis
```

**Create:** `src/lib/cache/redis.ts`

```typescript
import Redis from 'ioredis'

// For production, use environment variables
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

export async function setCached(key: string, value: any, ttl: number = 300): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error('Redis set error:', error)
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Redis invalidate error:', error)
  }
}
```

### 2.2 Add Caching to High-Traffic Endpoints

**File:** `src/app/api/user-stats/route.ts`

```typescript
import { getCached, setCached } from '@/lib/cache/redis'

export async function GET(request: NextRequest) {
  const userId = searchParams.get('userId')
  const cacheKey = `user-stats:${userId}`
  
  // Try cache first
  const cached = await getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }
  
  // Fetch from database
  const stats = await fetchUserStats(userId)
  
  // Cache for 5 minutes
  await setCached(cacheKey, stats, 300)
  
  return NextResponse.json(stats)
}
```

**Cache these endpoints:**
- `/api/user-stats` - 5 minutes
- `/api/quiz-results` (leaderboard) - 1 minute
- `/api/quiz-results` (recent battles) - 30 seconds
- Room member lists - 30 seconds
- Study notes - 10 minutes (if unchanged)

### 2.3 Cache Invalidation Strategy

```typescript
// When user completes quiz, invalidate their stats cache
await invalidateCache(`user-stats:${userId}`)
await invalidateCache('leaderboard:*')
```

## 🚀 Priority 3: Rate Limiting (Redis-Based)

### 3.1 Replace In-Memory Rate Limiting

**Current:** `src/middleware/rate-limit.ts` uses in-memory store

**Fix:** Use Redis for distributed rate limiting

**Update:** `src/middleware/rate-limit.ts`

```typescript
import { redis } from '@/lib/cache/redis'

export async function rateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const key = `rate-limit:${identifier}`
  const now = Date.now()
  
  // Use Redis with sliding window
  const count = await redis.incr(key)
  
  if (count === 1) {
    // First request, set expiration
    await redis.expire(key, Math.ceil(options.interval / 1000))
  }
  
  const ttl = await redis.ttl(key)
  
  if (count > options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: now + (ttl * 1000)
    }
  }
  
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - count,
    reset: now + (ttl * 1000)
  }
}
```

## 🚀 Priority 4: Connection Pooling

### 4.1 Optimize Supabase Client Creation

**Current:** Each API route creates new client

**Better:** Reuse connections (Supabase handles this, but we can optimize)

**Create:** `src/lib/supabase/pool.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

// Connection pool singleton
let supabasePool: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabasePool) {
    supabasePool = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        db: {
          schema: 'public',
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'x-client-info': 'brain-battle-app',
          },
        },
      }
    )
  }
  return supabasePool
}
```

### 4.2 Configure Database Connection Limits

**In Supabase Dashboard:**
- Go to Settings → Database
- Set max connections: 100 (default)
- Monitor connection usage
- Consider read replicas for high traffic

## 🚀 Priority 5: Real-time Optimization

### 5.1 Limit Real-time Subscriptions

**Issue:** Each user creates multiple subscriptions

**Optimize:** `src/app/room/[id]/page.tsx`

```typescript
// ❌ BAD: Multiple subscriptions per user
const channel1 = supabase.channel(`room:${roomId}`)
const channel2 = supabase.channel(`members:${roomId}`)
const channel3 = supabase.channel(`chat:${roomId}`)

// ✅ GOOD: Single channel with multiple subscriptions
const channel = supabase.channel(`room:${roomId}`)
  .on('postgres_changes', { table: 'room_members', ... }, handler1)
  .on('postgres_changes', { table: 'chat_messages', ... }, handler2)
  .on('postgres_changes', { table: 'player_progress', ... }, handler3)
  .subscribe()
```

### 5.2 Implement Subscription Throttling

```typescript
// Throttle rapid updates
let updateTimeout: NodeJS.Timeout | null = null

const handleUpdate = (payload: any) => {
  if (updateTimeout) return // Skip if update pending
  
  updateTimeout = setTimeout(() => {
    processUpdate(payload)
    updateTimeout = null
  }, 100) // Batch updates within 100ms
}
```

### 5.3 Monitor Real-time Usage

**Set up alerts in Supabase:**
- Monitor concurrent connections
- Track message volume
- Set limits (e.g., max 1000 concurrent connections)

## 🚀 Priority 6: Background Job Processing

### 6.1 Move Heavy Operations to Background

**Issue:** Quiz generation and PDF parsing block API requests

**Solution:** Use background jobs

**Install:** `npm install @upstash/queue` or use Vercel Cron

**Create:** `src/lib/queue/quiz-generation.ts`

```typescript
import { Queue } from '@upstash/queue'

const queue = new Queue({
  url: process.env.UPSTASH_QUEUE_URL!,
  token: process.env.UPSTASH_QUEUE_TOKEN!,
})

export async function queueQuizGeneration(data: {
  topic: string
  difficulty: string
  sessionId: string
}) {
  await queue.send({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/background/generate-quiz`,
    body: data,
  })
}
```

**Create:** `src/app/api/background/generate-quiz/route.ts`

```typescript
// This runs asynchronously
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Generate quiz
  const quiz = await generateQuiz(body)
  
  // Store in database
  await storeQuiz(quiz)
  
  // Notify via realtime
  await notifyQuizReady(body.sessionId)
  
  return NextResponse.json({ success: true })
}
```

## 🚀 Priority 7: CDN & Static Assets

### 7.1 Use CDN for Static Assets

**Configure:** Vercel automatically uses CDN, but optimize:

```typescript
// next.config.ts
const nextConfig = {
  images: {
    domains: ['your-supabase-storage-url.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  // Enable compression
  compress: true,
}
```

### 7.2 Optimize Image Delivery

```typescript
// Use Next.js Image component everywhere
import Image from 'next/image'

<Image
  src={imageUrl}
  alt="Description"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

## 🚀 Priority 8: Load Testing & Monitoring

### 8.1 Set Up Load Testing

**Tool:** k6, Artillery, or Locust

**Test scenarios:**
- 100 concurrent users creating rooms
- 1000 concurrent users taking quizzes
- 100 users uploading files simultaneously
- Real-time subscription stress test

**Example k6 test:**

```javascript
import http from 'k6/http'
import { check } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
}

export default function () {
  const res = http.get('https://your-app.vercel.app/api/user-stats?userId=test')
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

### 8.2 Monitor Key Metrics

**Set up alerts for:**
- Database connection pool usage > 80%
- API response time > 1 second
- Error rate > 1%
- Real-time subscription count > 500
- Memory usage > 80%

## 🚀 Priority 9: Horizontal Scaling

### 9.1 Stateless Architecture

**Ensure:** All state stored in database, not server memory

**Current:** ✅ Already stateless (using Supabase)

### 9.2 Auto-scaling Configuration

**Vercel:** Automatically scales, but set limits:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

### 9.3 Database Read Replicas

**For high traffic:**
- Set up Supabase read replicas
- Route read queries to replicas
- Keep writes on primary

## 🚀 Priority 10: Cost Optimization

### 10.1 Optimize API Costs

**OpenAI API:**
- Cache generated quizzes
- Use cheaper models where possible
- Batch requests

**Supabase:**
- Monitor database size
- Archive old data
- Use connection pooling efficiently

### 10.2 Implement Usage Limits

```typescript
// Rate limit by user tier
const limits = {
  free: { quizzesPerDay: 10, fileSize: 5 * 1024 * 1024 },
  premium: { quizzesPerDay: 100, fileSize: 50 * 1024 * 1024 },
}

export async function checkUsageLimit(userId: string, action: string) {
  const user = await getUser(userId)
  const limit = limits[user.tier]
  const usage = await getUsage(userId, action)
  
  if (usage >= limit[action]) {
    throw new Error('Usage limit exceeded')
  }
}
```

## 📊 Implementation Checklist

### Week 1 (Critical)
- [ ] Add missing database indexes
- [ ] Implement Redis caching
- [ ] Add pagination to all lists
- [ ] Optimize database queries (joins)

### Week 2 (High Priority)
- [ ] Replace in-memory rate limiting with Redis
- [ ] Move heavy operations to background jobs
- [ ] Optimize real-time subscriptions
- [ ] Set up monitoring and alerts

### Week 3 (Performance)
- [ ] Load testing
- [ ] CDN optimization
- [ ] Connection pooling optimization
- [ ] Cost optimization

## 🎯 Scalability Targets

### Current Capacity (Estimated)
- **Concurrent Users:** ~100-500
- **Queries per Second:** ~50-100
- **Real-time Connections:** ~100-200

### Target Capacity (After Optimizations)
- **Concurrent Users:** 10,000+
- **Queries per Second:** 1,000+
- **Real-time Connections:** 1,000+
- **Database Size:** 100GB+

## 📝 Notes

1. **Start Small:** Implement caching first (biggest impact)
2. **Monitor First:** Set up monitoring before optimizing
3. **Test Incrementally:** Test each optimization separately
4. **Cost vs Performance:** Balance cost with performance needs
5. **Plan for Growth:** Design for 10x current traffic

## 🔗 Resources

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connection-pooling)
- [Redis Caching Best Practices](https://redis.io/docs/manual/patterns/cache/)
- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)

