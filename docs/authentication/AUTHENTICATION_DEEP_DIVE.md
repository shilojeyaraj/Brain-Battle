# 🔐 Authentication Deep Dive: Middleware, Tokens, and Cookies

Complete engineering guide to understanding authentication, middleware, tokens, and cookies in web applications.

## Table of Contents

1. [Overview: The Authentication Flow](#overview-the-authentication-flow)
2. [Middleware: The Gatekeeper](#middleware-the-gatekeeper)
3. [Tokens: The Identity Proof](#tokens-the-identity-proof)
4. [Cookies: The Storage Mechanism](#cookies-the-storage-mechanism)
5. [How They Work Together](#how-they-work-together)
6. [Security Best Practices](#security-best-practices)
7. [Your Implementation Explained](#your-implementation-explained)

---

## Overview: The Authentication Flow

### The Big Picture

```
User Login → Server Validates → Tokens Created → Stored in Cookies → 
Middleware Checks → Route Access Granted/Denied
```

### Key Components

1. **Middleware** - Runs before every request, checks authentication
2. **Tokens** - Encrypted proof of identity (JWT, access tokens)
3. **Cookies** - Browser storage for tokens (HTTP-only, secure)
4. **Session** - Server-side state tracking user authentication

---

## Middleware: The Gatekeeper

### What is Middleware?

**Middleware** is code that runs **before** your route handlers. It intercepts every request and can:
- ✅ Check authentication
- ✅ Redirect unauthorized users
- ✅ Rate limit requests
- ✅ Log requests
- ✅ Modify requests/responses

### How Middleware Works in Next.js

In Next.js, middleware runs on the **Edge Runtime** (fast, lightweight) and executes **before** your pages/API routes.

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // This runs BEFORE your page/API route
  
  // 1. Check if user is authenticated
  const user = await checkAuth(request)
  
  // 2. Protect routes
  if (isProtectedRoute && !user) {
    return NextResponse.redirect('/login')
  }
  
  // 3. Allow request to continue
  return NextResponse.next()
}
```

### Your Middleware Explained

Let's break down your `src/middleware.ts`:

```typescript
export async function middleware(request: NextRequest) {
  // 1. CREATE SUPABASE CLIENT
  // This creates a Supabase client that can read/write cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()  // Read cookies from request
        },
        setAll(cookiesToSet) {
          // Write cookies to response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. CHECK AUTHENTICATION
  // Supabase reads the access token from cookies and validates it
  const { data: { user } } = await supabase.auth.getUser()
  
  // 3. PROTECT ROUTES
  // If route is protected and user is not authenticated, redirect to login
  const protectedRoutes = ['/dashboard', '/create-room', '/join-room', '/room', '/singleplayer']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)  // Remember where they wanted to go
    return NextResponse.redirect(url)
  }

  // 4. ALLOW REQUEST TO CONTINUE
  return NextResponse.next()
}
```

### Middleware Execution Flow

```
┌─────────────────────────────────────────┐
│  1. Request arrives at server           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Middleware runs (middleware.ts)    │
│     - Reads cookies                     │
│     - Validates tokens                  │
│     - Checks user authentication        │
└──────────────┬──────────────────────────┘
               │
               ├─── User authenticated? ──┐
               │                          │
               │ YES                      │ NO
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────┐
│ 3a. Allow request    │    │ 3b. Redirect to login │
│     Continue to route │    │     Stop request     │
└──────────────────────┘    └──────────────────────┘
```

### Key Middleware Concepts

#### 1. **Request Interception**
- Middleware runs **before** your route handlers
- Can modify request/response
- Can stop request (redirect, error)

#### 2. **Route Protection**
```typescript
// Protect specific routes
const protectedRoutes = ['/dashboard', '/settings']
if (isProtectedRoute && !user) {
  return NextResponse.redirect('/login')
}
```

#### 3. **Session Refresh**
```typescript
// Refresh expired tokens automatically
const { data: { user } } = await supabase.auth.getUser()
// Supabase automatically refreshes expired tokens
```

#### 4. **Rate Limiting**
```typescript
// Prevent abuse
if (path.startsWith('/api/')) {
  const rateLimitResult = rateLimit(identifier, {
    interval: 60000,  // 1 minute
    limit: 100        // 100 requests
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
}
```

---

## Tokens: The Identity Proof

### What are Tokens?

**Tokens** are encrypted strings that prove a user's identity. They contain:
- User ID
- Expiration time
- Signature (to prevent tampering)

### Types of Tokens

#### 1. **Access Token** (Short-lived)
- **Lifetime**: 1 hour (typical)
- **Purpose**: Proves identity for API requests
- **Storage**: HTTP-only cookie
- **Usage**: Sent with every authenticated request

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIiwiaWF0IjoxNjAwMDAwMDAwfQ.signature
```

**Structure:**
```
Header.Payload.Signature
```

- **Header**: Algorithm and token type
- **Payload**: User data (ID, email, expiration)
- **Signature**: Cryptographic proof of authenticity

#### 2. **Refresh Token** (Long-lived)
- **Lifetime**: 7-30 days (typical)
- **Purpose**: Get new access tokens when they expire
- **Storage**: HTTP-only cookie
- **Usage**: Only sent to refresh endpoint

#### 3. **ID Token** (OAuth/OIDC)
- **Lifetime**: 1 hour
- **Purpose**: User identity information
- **Usage**: OAuth flows

### How Tokens Work

#### Token Creation (Login)

```typescript
// User logs in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Supabase creates tokens:
// 1. Access Token (1 hour expiry)
// 2. Refresh Token (7 days expiry)
// 3. Stores them in HTTP-only cookies
```

#### Token Validation (Every Request)

```typescript
// Middleware validates token
const { data: { user } } = await supabase.auth.getUser()

// What happens:
// 1. Reads access token from cookie
// 2. Validates signature
// 3. Checks expiration
// 4. If expired, uses refresh token to get new access token
// 5. Returns user data if valid
```

#### Token Refresh (Automatic)

```typescript
// When access token expires:
// 1. Supabase detects expired token
// 2. Uses refresh token to get new access token
// 3. Updates cookies automatically
// 4. User doesn't notice (seamless)
```

### Token Security

#### ✅ Secure Practices

1. **HTTP-Only Cookies**
   - JavaScript cannot access tokens
   - Prevents XSS attacks

2. **Secure Flag**
   - Only sent over HTTPS
   - Prevents man-in-the-middle attacks

3. **SameSite Attribute**
   - Prevents CSRF attacks
   - Only sent to same origin

4. **Short Expiration**
   - Access tokens expire quickly
   - Limits damage if stolen

5. **Signature Verification**
   - Server validates token signature
   - Prevents tampering

#### ❌ Insecure Practices

1. **localStorage/sessionStorage**
   - JavaScript can access
   - Vulnerable to XSS

2. **Long-lived Access Tokens**
   - More time for attackers
   - Harder to revoke

3. **No Signature Verification**
   - Tokens can be tampered
   - Security breach

---

## Cookies: The Storage Mechanism

### What are Cookies?

**Cookies** are small pieces of data stored in the browser and sent with every request to the same domain.

### Cookie Structure

```
Set-Cookie: sb-access-token=eyJhbG...; 
            HttpOnly; 
            Secure; 
            SameSite=Lax; 
            Path=/; 
            Max-Age=3600
```

**Components:**
- **Name**: `sb-access-token`
- **Value**: The token itself
- **HttpOnly**: JavaScript cannot access
- **Secure**: Only sent over HTTPS
- **SameSite**: CSRF protection
- **Path**: Which routes can access
- **Max-Age**: Expiration time

### Cookie Types

#### 1. **HTTP-Only Cookies** (Most Secure) ✅

```typescript
// Server sets cookie
response.cookies.set('access-token', token, {
  httpOnly: true,    // JavaScript CANNOT access
  secure: true,      // Only HTTPS
  sameSite: 'lax',  // CSRF protection
  maxAge: 3600       // 1 hour
})
```

**Why HTTP-Only?**
- Prevents XSS attacks
- JavaScript cannot steal tokens
- More secure than localStorage

#### 2. **Secure Cookies**

```typescript
response.cookies.set('token', token, {
  secure: true  // Only sent over HTTPS
})
```

**Why Secure?**
- Prevents man-in-the-middle attacks
- Only works on HTTPS connections

#### 3. **SameSite Cookies**

```typescript
response.cookies.set('token', token, {
  sameSite: 'lax'  // or 'strict'
})
```

**Options:**
- **`strict`**: Never sent on cross-site requests
- **`lax`**: Sent on top-level navigation (default)
- **`none`**: Always sent (requires Secure flag)

### How Cookies Work in Your App

#### Setting Cookies (Login)

```typescript
// In supabase-auth.ts
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Supabase automatically:
// 1. Creates access token
// 2. Creates refresh token
// 3. Sets HTTP-only cookies:
//    - sb-<project-id>-auth-token (access token)
//    - sb-<project-id>-auth-token.0 (refresh token)
```

#### Reading Cookies (Middleware)

```typescript
// In middleware.ts
const supabase = createServerClient(url, key, {
  cookies: {
    getAll() {
      return request.cookies.getAll()  // Read cookies from request
    }
  }
})

// Supabase automatically:
// 1. Reads cookies from request
// 2. Extracts access token
// 3. Validates token
// 4. Returns user if valid
```

#### Updating Cookies (Token Refresh)

```typescript
// When token expires, Supabase automatically:
// 1. Reads refresh token from cookie
// 2. Gets new access token
// 3. Updates cookies:
cookies.set('sb-<project-id>-auth-token', newAccessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 3600
})
```

### Cookie vs localStorage vs sessionStorage

| Feature | Cookie | localStorage | sessionStorage |
|---------|--------|--------------|----------------|
| **Accessible by JS** | ❌ (HTTP-only) | ✅ | ✅ |
| **Sent with requests** | ✅ Auto | ❌ Manual | ❌ Manual |
| **Expiration** | ✅ Configurable | ❌ Manual | ❌ Tab close |
| **Size limit** | 4KB | 5-10MB | 5-10MB |
| **Security** | ✅ High | ⚠️ Medium | ⚠️ Medium |
| **Use case** | Auth tokens | User preferences | Temp data |

**For Authentication: Always use HTTP-only cookies!**

---

## How They Work Together

### Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   1. USER LOGS IN                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. SERVER VALIDATES CREDENTIALS                            │
│     - Checks email/password                                  │
│     - Verifies user exists                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. SERVER CREATES TOKENS                                   │
│     - Access Token (1 hour)                                 │
│     - Refresh Token (7 days)                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. SERVER SETS HTTP-ONLY COOKIES                           │
│     Set-Cookie: sb-access-token=...; HttpOnly; Secure      │
│     Set-Cookie: sb-refresh-token=...; HttpOnly; Secure      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. BROWSER STORES COOKIES                                  │
│     - Stored in browser's cookie jar                        │
│     - JavaScript cannot access (HTTP-only)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. USER REQUESTS PROTECTED ROUTE                           │
│     GET /dashboard                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  7. MIDDLEWARE INTERCEPTS REQUEST                           │
│     - Reads cookies from request                            │
│     - Extracts access token                                 │
│     - Validates token signature                             │
│     - Checks expiration                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─── Token Valid? ──┐
                       │                   │
                       │ YES               │ NO
                       │                   │
                       ▼                   ▼
┌──────────────────────┐    ┌──────────────────────┐
│ 8a. ALLOW REQUEST    │    │ 8b. REDIRECT LOGIN  │
│     Continue to page │    │     Stop request    │
└──────────────────────┘    └──────────────────────┘
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. ACCESS TOKEN EXPIRES (after 1 hour)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. USER MAKES REQUEST                                      │
│     GET /dashboard                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. MIDDLEWARE DETECTS EXPIRED TOKEN                       │
│     - Access token expired                                  │
│     - Refresh token still valid                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. MIDDLEWARE USES REFRESH TOKEN                           │
│     - Sends refresh token to Supabase                       │
│     - Gets new access token                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  5. MIDDLEWARE UPDATES COOKIES                              │
│     - Sets new access token cookie                          │
│     - User doesn't notice (seamless)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  6. REQUEST CONTINUES                                       │
│     - User gets dashboard                                   │
│     - No interruption                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Best Practices

### 1. **Always Use HTTP-Only Cookies**

```typescript
// ✅ GOOD
response.cookies.set('token', token, {
  httpOnly: true,  // JavaScript cannot access
  secure: true,    // Only HTTPS
  sameSite: 'lax'  // CSRF protection
})

// ❌ BAD
localStorage.setItem('token', token)  // XSS vulnerable
```

### 2. **Short Token Expiration**

```typescript
// ✅ GOOD
accessToken: 1 hour    // Short-lived
refreshToken: 7 days   // Longer, but still limited

// ❌ BAD
accessToken: 30 days   // Too long, more risk
```

### 3. **Validate Tokens on Every Request**

```typescript
// ✅ GOOD - Middleware validates every request
export async function middleware(request: NextRequest) {
  const user = await validateToken(request)
  if (!user) return redirect('/login')
}

// ❌ BAD - Only validate in some routes
// Some routes might be unprotected
```

### 4. **Use Secure Cookies**

```typescript
// ✅ GOOD
secure: true  // Only HTTPS

// ❌ BAD
secure: false  // Works on HTTP (insecure)
```

### 5. **Protect Against CSRF**

```typescript
// ✅ GOOD
sameSite: 'lax'  // Prevents CSRF

// ❌ BAD
sameSite: 'none'  // Vulnerable to CSRF
```

### 6. **Rate Limiting**

```typescript
// ✅ GOOD - Prevent brute force
if (rateLimitExceeded) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

### 7. **Token Rotation**

```typescript
// ✅ GOOD - Rotate refresh tokens
// When refresh token is used, issue new one
// Old refresh token becomes invalid

// ❌ BAD - Same refresh token forever
// If stolen, attacker has permanent access
```

---

## Your Implementation Explained

### Your Middleware (`src/middleware.ts`)

```typescript
export async function middleware(request: NextRequest) {
  // 1. CREATE SUPABASE CLIENT WITH COOKIE ACCESS
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()  // Read cookies
      },
      setAll(cookiesToSet) {
        // Write cookies to response
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // 2. VALIDATE TOKEN (AUTOMATIC REFRESH IF EXPIRED)
  const { data: { user } } = await supabase.auth.getUser()
  // This:
  // - Reads access token from cookie
  // - Validates signature
  // - Checks expiration
  // - If expired, uses refresh token to get new access token
  // - Returns user if valid

  // 3. PROTECT ROUTES
  const protectedRoutes = ['/dashboard', '/create-room', '/join-room', '/room', '/singleplayer']
  if (isProtectedRoute && !user) {
    return NextResponse.redirect('/login')
  }

  // 4. ALLOW REQUEST
  return NextResponse.next()
}
```

**What happens:**
1. Request arrives → Middleware runs
2. Supabase reads cookies → Extracts tokens
3. Validates tokens → Checks user
4. If protected route + no user → Redirect to login
5. Otherwise → Allow request to continue

### Your Server Client (`src/lib/supabase/server.ts`)

```typescript
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()  // Read cookies
      },
      setAll(cookiesToSet) {
        cookieStore.set(name, value, options)  // Write cookies
      },
    },
  })
}
```

**What happens:**
1. Server component needs Supabase client
2. Creates client with cookie access
3. Can read/write cookies
4. Can validate tokens

### Your Client Client (`src/lib/supabase/client.ts`)

```typescript
export function createClient() {
  return createBrowserClient(url, key)
}
```

**What happens:**
1. Browser component needs Supabase client
2. Creates client (cookies handled automatically)
3. Can make authenticated requests
4. Cookies sent automatically with requests

### Token Flow in Your App

```
1. LOGIN
   User → signInWithPassword() → Supabase validates → 
   Creates tokens → Sets HTTP-only cookies

2. REQUEST
   User → GET /dashboard → Middleware runs →
   Reads cookies → Validates tokens → Allows/Denies

3. TOKEN REFRESH
   Access token expires → Middleware detects →
   Uses refresh token → Gets new access token →
   Updates cookies → Request continues
```

---

## Common Patterns

### Pattern 1: Protected Route

```typescript
// middleware.ts
if (isProtectedRoute && !user) {
  return NextResponse.redirect('/login?redirect=' + path)
}

// login/page.tsx
const redirect = searchParams.get('redirect')
if (redirect) {
  // After login, redirect to original destination
  router.push(redirect)
}
```

### Pattern 2: Role-Based Access

```typescript
// middleware.ts
if (isAdminRoute && user?.role !== 'admin') {
  return NextResponse.redirect('/unauthorized')
}
```

### Pattern 3: API Route Protection

```typescript
// api/protected/route.ts
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Protected logic here
}
```

---

## Debugging Tips

### 1. Check Cookies

```typescript
// In middleware or server component
console.log('Cookies:', request.cookies.getAll())
```

### 2. Check Token Validity

```typescript
const { data: { user }, error } = await supabase.auth.getUser()
if (error) {
  console.log('Token error:', error)
}
```

### 3. Check Token Expiration

```typescript
const { data: { session } } = await supabase.auth.getSession()
console.log('Expires at:', new Date(session.expires_at * 1000))
```

### 4. Monitor Middleware

```typescript
console.log('Middleware running for:', request.nextUrl.pathname)
console.log('User:', user?.id)
```

---

## Summary

### Key Takeaways

1. **Middleware** = Gatekeeper that runs before every request
2. **Tokens** = Encrypted proof of identity (JWT)
3. **Cookies** = Secure storage for tokens (HTTP-only)
4. **Together** = Secure authentication flow

### Your Stack

- **Supabase Auth** = Handles token creation/validation
- **HTTP-only Cookies** = Secure token storage
- **Middleware** = Route protection
- **Automatic Refresh** = Seamless user experience

### Security Checklist

- ✅ HTTP-only cookies
- ✅ Secure flag (HTTPS only)
- ✅ SameSite protection
- ✅ Short token expiration
- ✅ Token validation on every request
- ✅ Rate limiting
- ✅ Protected routes in middleware

---

**Last Updated**: 2025-01-10
**Version**: 1.0.0


