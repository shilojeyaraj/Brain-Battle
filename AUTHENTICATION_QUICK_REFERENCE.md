# 🚀 Authentication Quick Reference

Quick reference guide for middleware, tokens, and cookies.

## 🔑 Key Concepts

### Middleware
- **What**: Code that runs before every request
- **Where**: `src/middleware.ts`
- **Purpose**: Check authentication, protect routes, rate limit
- **Runs**: Edge Runtime (fast, before pages/API routes)

### Tokens
- **What**: Encrypted proof of identity (JWT)
- **Types**: Access token (1 hour), Refresh token (7 days)
- **Storage**: HTTP-only cookies
- **Purpose**: Prove user is authenticated

### Cookies
- **What**: Browser storage for tokens
- **Type**: HTTP-only (JavaScript cannot access)
- **Security**: Secure (HTTPS only), SameSite (CSRF protection)
- **Purpose**: Store tokens securely

---

## 📋 Quick Reference

### Middleware Pattern

```typescript
export async function middleware(request: NextRequest) {
  // 1. Create Supabase client
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => { /* set cookies */ }
    }
  })

  // 2. Check authentication
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Protect routes
  if (isProtectedRoute && !user) {
    return NextResponse.redirect('/login')
  }

  // 4. Allow request
  return NextResponse.next()
}
```

### Token Flow

```
Login → Create Tokens → Store in Cookies → 
Request → Read Cookies → Validate Tokens → Allow/Deny
```

### Cookie Settings

```typescript
{
  httpOnly: true,    // JavaScript cannot access
  secure: true,      // HTTPS only
  sameSite: 'lax',   // CSRF protection
  maxAge: 3600       // 1 hour
}
```

---

## 🔐 Security Checklist

- ✅ HTTP-only cookies
- ✅ Secure flag (HTTPS)
- ✅ SameSite protection
- ✅ Short token expiration
- ✅ Token validation on every request
- ✅ Rate limiting
- ✅ Protected routes in middleware

---

## 🐛 Common Issues

### Issue: "Unauthorized" errors
**Fix**: Check middleware is reading cookies correctly

### Issue: Tokens not refreshing
**Fix**: Ensure middleware calls `getUser()` which auto-refreshes

### Issue: Cookies not set
**Fix**: Check cookie settings (httpOnly, secure, sameSite)

---

## 📚 Full Documentation

See `AUTHENTICATION_DEEP_DIVE.md` for complete explanation.


