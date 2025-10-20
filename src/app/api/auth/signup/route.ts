import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/actions/custom-auth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    // Register user with custom auth
    console.log("🚀 [API SIGNUP] Starting registration process...")
    const result = await registerUser(email, password, username)
    
    if (!result.success) {
      console.error("❌ [API SIGNUP] Registration failed:", result.error)
      return NextResponse.json(
        { success: false, error: result.error || "Registration failed" },
        { status: 400 }
      )
    }

    console.log("✅ [API SIGNUP] Registration successful")
    return NextResponse.json({
      success: true,
      user: result.user
    })

  } catch (error: unknown) {
    console.error("❌ [API SIGNUP] Server error:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { success: false, error: `Registration failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
