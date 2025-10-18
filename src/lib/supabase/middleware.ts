import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Since we're using custom authentication, we can skip the heavy Supabase client creation
  // This significantly reduces middleware overhead and improves performance
  
  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/demo', '/about', '/features', '/pricing', '/help', '/contact', '/privacy', '/terms']
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  // For custom auth, we just need to pass through the request
  // Session validation happens on the client side and in API routes
  return NextResponse.next({
    request,
  })
}
