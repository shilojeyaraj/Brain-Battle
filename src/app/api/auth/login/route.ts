import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/actions/custom-auth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    // Treat UI 'email' field as username to preserve layout
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      )
    }

    try {
      // Authenticate user with custom auth (using username)
      const result = await authenticateUser(email, password)
      
      if (!result.success) {
        console.log("❌ [API LOGIN] Authentication failed:", result.error)
        return NextResponse.json(
          { success: false, error: result.error || "Login failed" },
          { status: 401 }
        )
      }

      console.log("✅ [API LOGIN] Authentication successful")
      return NextResponse.json({
        success: true,
        user: result.user
      })
    } catch (error) {
      console.error("❌ [API LOGIN] Server error during authentication:", error)
      return NextResponse.json(
        { success: false, error: "Server error. Please try again." },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error("❌ [API LOGIN] Server error:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { success: false, error: `Login failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
