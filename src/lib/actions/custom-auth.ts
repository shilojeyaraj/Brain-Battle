"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export interface User {
  id: string
  email: string
  username: string
  created_at: string
  updated_at: string
  last_login?: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
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
  email: string, 
  password: string, 
  username: string
): Promise<AuthResponse> {
  try {
    const supabase = await createClient()
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase()
    console.log('🚀 [AUTH] Starting registration for:', normalizedEmail)
    
    // Check if user already exists
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
      console.error('❌ [AUTH] Error checking existing user:', checkError)
      return { success: false, error: `Database error: ${checkError.message}` }
    }
    
    // PGRST116 means no rows found, which is expected for new users
    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ [AUTH] No existing user found (expected for new registration)')
    }
    
    console.log('✅ [AUTH] No existing user found, proceeding with registration')
    
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
    
    // Create user in database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        username: username,
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (userError) {
      console.error('❌ [AUTH] User creation failed:', userError)
      return { success: false, error: `Registration failed: ${userError.message}` }
    }
    
    console.log('✅ [AUTH] User created successfully:', userData.id)
    
    // Create initial player stats
    const { error: statsError } = await supabase
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
      // Don't fail the registration for this
    } else {
      console.log('✅ [AUTH] Player stats created successfully')
    }
    
    const user: User = {
      id: userData.id,
      email: userData.email,
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
  password: string
): Promise<AuthResponse> {
  try {
    const supabase = await createClient()
    
    // Normalize email (trim whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase()
    console.log('🔐 [AUTH] Authenticating user:', normalizedEmail)
    
    // Get user from database
    console.log('🔍 [AUTH] Looking for user with email:', normalizedEmail)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()
    
    if (userError) {
      console.error('❌ [AUTH] Database error:', userError)
      if (userError.code === 'PGRST116') {
        console.log('❌ [AUTH] No user found with this email')
        return { success: false, error: 'Invalid email or password' }
      }
      return { success: false, error: `Database error: ${userError.message}` }
    }
    
    if (!userData) {
      console.error('❌ [AUTH] No user data returned')
      return { success: false, error: 'Invalid email or password' }
    }
    
    console.log('✅ [AUTH] User found:', userData.username)
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password_hash)
    if (!isValidPassword) {
      console.error('❌ [AUTH] Invalid password')
      return { success: false, error: 'Invalid email or password' }
    }
    
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
      email: userData.email,
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
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    redirect("/signup?error=All fields are required")
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

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    redirect("/signup?error=Please enter a valid email address")
  }

  // Register user with custom auth
  console.log("🚀 [SIGNUP] Starting registration process...")
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
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    redirect("/login?error=Email and password are required")
  }

  try {
    // Authenticate user with custom auth
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
