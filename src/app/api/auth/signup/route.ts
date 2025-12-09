import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth/custom-auth'
import { setSessionCookie } from '@/lib/auth/session-cookies'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const username = formData.get("username") as string
    const email = (formData.get("email") as string) || undefined
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Basic validation
    if (!username || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Username, password and confirm password are required" },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: "Username must be at least 3 characters" },
        { status: 400 }
      )
    }

    // Register user with custom auth
    console.log("🚀 [API SIGNUP] Starting registration process...")
    // registerUser accepts email as string (required), normalize it
    const normalizedEmail = email ? email.trim().toLowerCase() : ''
    const result = await registerUser(normalizedEmail, password, username)
    
    if (!result.success || !result.user) {
      const errorMessage = result.error || "Registration failed"
      console.error("❌ [API SIGNUP] Registration failed:", errorMessage)
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    if (!result.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Registration succeeded but user ID is missing' },
        { status: 500 }
      )
    }

    // Create response first
    const response = NextResponse.json({
      success: true,
      userId: result.user.id,
      message: 'Registration successful'
    })
    
    // Set secure HTTP-only session cookie (invalidates previous sessions)
    // Pass response so cookie is set on the response object
    await setSessionCookie(result.user.id, request, response)
    
    console.log("✅ [API SIGNUP] Registration successful, session cookie set for user:", result.user.id)

    // Return response with cookie set
    return response

  } catch (error: unknown) {
    console.error("❌ [API SIGNUP] Server error:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { success: false, error: `Registration failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
