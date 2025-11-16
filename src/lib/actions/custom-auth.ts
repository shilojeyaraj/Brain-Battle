"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export interface User {
  id: string
  email?: string | null
  username: string
  created_at: string
  updated_at: string
  last_login?: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
  requiresMFA?: boolean
  userId?: string
}

// Detect Next.js redirect errors so we don't catch them
const isNextRedirectError = (err: unknown): boolean => {
  return (
    err instanceof Error &&
    typeof (err as any).digest === "string" &&
    (err as any).digest.startsWith("NEXT_REDIRECT")
  )
}

// Register a new user
export async function registerUser(
  email: string | undefined, 
  password: string, 
  username: string
): Promise<AuthResponse> {
  try {
    // Use admin client to bypass RLS for registration
    const supabase = createAdminClient()

    // Normalize optional email (trim and lowercase)
    const normalizedEmail = (email ?? '').trim().toLowerCase()
    console.log('🚀 [AUTH] Starting registration - username:', username)

    // If email provided, check if user already exists with that email (optional)
    if (normalizedEmail) {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('email', normalizedEmail)
        .single()
      
      if (existingUser) {
        console.log('❌ [AUTH] User already exists with this email:', existingUser)
        return { success: false, error: 'User already exists with this email' }
      }
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ [AUTH] Error checking existing user by email:', checkError)
        return { success: false, error: `Database error: ${checkError.message}` }
      }
    }

    console.log('✅ [AUTH] Proceeding with registration')
    
    // Check if username is taken
    const { data: existingUsername, error: usernameError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()
    
    if (existingUsername) {
      console.log('❌ [AUTH] Username already taken')
      return { success: false, error: 'Username already taken' }
    }
    
    // PGRST116 means no rows found, which is expected for available usernames
    if (usernameError && usernameError.code !== 'PGRST116') {
      console.error('❌ [AUTH] Error checking username:', usernameError)
      return { success: false, error: `Database error: ${usernameError.message}` }
    }
    
    if (usernameError && usernameError.code === 'PGRST116') {
      console.log('✅ [AUTH] Username is available (no existing user found)')
    }
    
    // Hash the password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)
    console.log('🔐 [AUTH] Password hashed successfully')
    
    // Create user in database (email optional). Try null first; if NOT NULL constraint, fallback to empty string.
    let userData: any | null = null
    let userError: any | null = null

    const attemptInsert = async (emailValue: string | null) => {
      return await supabase
        .from('users')
        .insert({
          email: emailValue,
          username: username,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    let attempt = await attemptInsert(normalizedEmail || null)
    userData = attempt.data
    userError = attempt.error

    if (userError && userError.code === '23502') {
      console.warn('⚠️ [AUTH] Email column appears NOT NULL; retrying with empty string')
      const retry = await attemptInsert(normalizedEmail || '')
      userData = retry.data
      userError = retry.error
    }
    
    if (userError) {
      console.error('❌ [AUTH] User creation failed:', userError)
      return { success: false, error: `Registration failed: ${userError.message}` }
    }
    
    if (!userData) {
      console.error('❌ [AUTH] No user returned after insert')
      return { success: false, error: 'Registration failed' }
    }
    
    console.log('✅ [AUTH] User created successfully:', userData.id)
    
    // Verify user was actually created in database
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userData.id)
      .single()
    
    if (verifyError || !verifyUser) {
      console.error('❌ [AUTH] User verification failed after creation:', verifyError)
      return { success: false, error: 'User creation verification failed. Please try again.' }
    }
    
    console.log('✅ [AUTH] User verified in database:', verifyUser.id)
    
    // Create initial player stats using admin client to bypass RLS
    // This ensures stats are created even if RLS policies block regular inserts
    try {
      const adminClient = createAdminClient()
      const { error: statsError } = await adminClient
        .from('player_stats')
        .insert({
          user_id: userData.id,
          level: 1,
          xp: 0,
          total_wins: 0,
          total_losses: 0,
          total_games: 0,
          win_streak: 0,
          best_streak: 0,
          total_questions_answered: 0,
          correct_answers: 0,
          accuracy: 0.00,
          average_response_time: 0.00,
          favorite_subject: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (statsError) {
        console.error('❌ [AUTH] Player stats creation failed:', statsError)
        // If foreign key error, user might not exist - this shouldn't happen but log it
        if (statsError.code === '23503') {
          console.error('❌ [AUTH] Foreign key constraint - user does not exist in users table (this should not happen)')
          // Try to verify user exists one more time
          const { data: recheckUser } = await adminClient
            .from('users')
            .select('id')
            .eq('id', userData.id)
            .single()
          
          if (!recheckUser) {
            console.error('❌ [AUTH] User does not exist in database - registration may have failed')
            return { success: false, error: 'User creation failed. Please try again.' }
          }
        }
        // Don't fail the registration for this - stats can be created later via API
      } else {
        console.log('✅ [AUTH] Player stats created successfully')
      }
    } catch (statsException) {
      console.error('❌ [AUTH] Exception creating player stats:', statsException)
      // Don't fail the registration for this
    }
    
    const user: User = {
      id: userData.id,
      email: userData.email ?? null,
      username: userData.username,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    }
    
    console.log('✅ [AUTH] Registration completed successfully')
    return { success: true, user }
  } catch (error: unknown) {
    console.error('❌ [AUTH] Registration failed with exception:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: `Registration failed: ${errorMessage}` }
  }
}

// Authenticate a user
export async function authenticateUser(
  email: string, 
  password: string,
  totpCode?: string
): Promise<AuthResponse> {
  try {
    // Use admin client to bypass RLS for authentication
    // This is necessary because custom auth doesn't set auth.uid()
    let supabase
    try {
      supabase = createAdminClient()
    } catch (adminError: any) {
      console.error('❌ [AUTH] Failed to create admin client:', adminError.message)
      return { 
        success: false, 
        error: 'Server configuration error. Please check SUPABASE_SERVICE_ROLE_KEY environment variable.' 
      }
    }
    
    // Treat the first parameter as username (trim and lowercase for consistency)
    const normalizedUsername = email.trim().toLowerCase()
    console.log('🔐 [AUTH] Authenticating user (by username):', normalizedUsername)
    
    // Get user from database by username
    console.log('🔍 [AUTH] Looking for user with username:', normalizedUsername)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', normalizedUsername)
      .single()
    
    if (userError) {
      console.error('❌ [AUTH] Database error:', userError)
      if (userError.code === 'PGRST116') {
        console.log('❌ [AUTH] No user found with this username')
        return { success: false, error: 'Invalid username or password' }
      }
      return { success: false, error: `Database error: ${userError.message}` }
    }
    
    if (!userData) {
      console.error('❌ [AUTH] No user data returned')
      return { success: false, error: 'Invalid username or password' }
    }
    
    console.log('✅ [AUTH] User found:', userData.username)
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password_hash)
    if (!isValidPassword) {
      console.error('❌ [AUTH] Invalid password')
      return { success: false, error: 'Invalid username or password' }
    }
    
    // Note: MFA is now handled by Supabase Auth
    // Custom MFA code has been removed - use Supabase Auth MFA instead
    // This function is kept for backward compatibility but MFA is handled elsewhere
    
    // Update last login
    await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id)
    
    const user: User = {
      id: userData.id,
      email: userData.email ?? null,
      username: userData.username,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      last_login: new Date().toISOString()
    }
    
    console.log('✅ [AUTH] User authenticated successfully:', user.username)
    return { success: true, user }
  } catch (error: unknown) {
    console.error('❌ [AUTH] Authentication failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: errorMessage }
  }
}

export async function signup(formData: FormData) {
  const username = formData.get("username") as string
  const email = (formData.get("email") as string) || undefined
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  // Basic validation
  if (!username || !password || !confirmPassword) {
    redirect("/signup?error=Username, password and confirm password are required")
  }

  if (password !== confirmPassword) {
    redirect("/signup?error=Passwords do not match")
  }

  if (password.length < 6) {
    redirect("/signup?error=Password must be at least 6 characters")
  }

  if (username.length < 3) {
    redirect("/signup?error=Username must be at least 3 characters")
  }

  // Register user with custom auth
  console.log("🚀 [SIGNUP] Starting registration process (email optional)...")
  const result = await registerUser(email, password, username)
  
  if (!result.success) {
    console.error("❌ [SIGNUP] Registration failed:", result.error)
    redirect(`/signup?error=${encodeURIComponent(result.error || "Registration failed")}`)
  }

  console.log("✅ [SIGNUP] Registration successful, redirecting to dashboard...")
  
  // Store user in session
  if (result.user) {
    revalidatePath("/")
    redirect(`/dashboard?userId=${result.user.id}&newUser=true`)
  } else {
    revalidatePath("/")
    redirect("/dashboard?newUser=true")
  }
}

export async function login(formData: FormData) {
  // Treat UI 'email' field as username to preserve layout
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    redirect("/login?error=Username and password are required")
  }

  try {
    // Authenticate user with custom auth (by username)
    const result = await authenticateUser(email, password)
    
    if (!result.success) {
      // Redirect back to login with error message instead of throwing
      console.log("❌ [LOGIN] Authentication failed:", result.error)
      redirect(`/login?error=${encodeURIComponent(result.error || "Login failed")}`)
    }

    // Store user in session
    if (result.user) {
      // We'll set the session on the client side after redirect
      // For now, we'll pass the user ID as a query parameter
      console.log("✅ [LOGIN] Authentication successful, redirecting to dashboard")
      revalidatePath("/")
      redirect(`/dashboard?userId=${result.user.id}`)
    } else {
      revalidatePath("/")
      redirect("/dashboard")
    }
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error
    }
    console.error("❌ [LOGIN] Server error during authentication:", error)
    redirect("/login?error=Server error. Please try again.")
  }
}

export async function logout() {
  // Note: localStorage clearing happens client-side
  // Server action just redirects - client should clear session
  revalidatePath("/")
  redirect("/")
}
