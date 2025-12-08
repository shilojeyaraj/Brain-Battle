"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
  created_at: string
  updated_at: string
  last_login?: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
  requiresMFA?: boolean
}

// Detect Next.js redirect errors so we don't catch them
const isNextRedirectError = (err: unknown): boolean => {
  return (
    err instanceof Error &&
    typeof (err as any).digest === "string" &&
    (err as any).digest.startsWith("NEXT_REDIRECT")
  )
}

/**
 * Register a new user with Supabase Auth
 */
export async function registerUser(
  email: string,
  password: string,
  username: string
): Promise<AuthResponse> {
  try {
    const supabase = await createClient()

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [AUTH] Starting registration for:', normalizedEmail)
    }

    // Check if username is already taken
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingProfile) {
      console.log('❌ [AUTH] Username already taken')
      return { success: false, error: 'Username already taken' }
    }

    // Sign up with Supabase Auth (email confirmation required)
    // Set redirect URL to localhost:3001 for email confirmation callback
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        data: {
          username: username
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/auth/callback`
      }
    })

    if (authError) {
      console.error('❌ [AUTH] Supabase signup error:', authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' }
    }

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [AUTH] User created in auth.users:', authData.user.id)
      if (!authData.session) {
        console.log('📧 [AUTH] Email confirmation required')
      } else {
        console.log('✅ [AUTH] Session created immediately')
      }
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500))

    // Profile is created automatically by trigger, but let's verify
    // Use admin client to bypass RLS for checking/creating profile
    const adminClient = createAdminClient()
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError || !profile) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 [AUTH] Profile not found, creating manually...')
      }
      // Try to create profile manually using admin client (bypasses RLS)
      const { data: newProfile, error: createError } = await adminClient
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          username: username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ [AUTH] Manual profile creation failed:', createError)
        // Check if it's a unique constraint violation (username taken)
        if (createError.code === '23505' || createError.message?.includes('unique')) {
          // Try with a unique username
          const uniqueUsername = `${username}_${Date.now().toString().slice(-6)}`
          const { error: retryError } = await adminClient
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              username: uniqueUsername,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (retryError) {
            console.error('❌ [AUTH] Retry with unique username also failed:', retryError)
            return { success: false, error: 'Failed to create user profile' }
          }
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [AUTH] Profile created with unique username:', uniqueUsername)
          }
        } else {
          return { success: false, error: 'Failed to create user profile' }
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('✅ [AUTH] Profile created successfully')
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('✅ [AUTH] Profile already exists (created by trigger)')
    }

    // Create initial player stats using admin client (bypasses RLS) with trial initialized
    const { error: statsError } = await adminClient
      .from('player_stats')
      .insert({
        user_id: authData.user.id,
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
        // Initialize free trial: 3 trial quiz diagrams
        trial_quiz_diagrams_remaining: 3,
        quiz_diagrams_this_month: 0,
        has_used_trial_quiz_diagrams: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (statsError) {
      console.error('❌ [AUTH] Player stats creation failed:', statsError)
      // Don't fail registration for this - stats can be created later
    } else {
      console.log('✅ [AUTH] Player stats created successfully')
    }

    // Get the profile to return using admin client
    const { data: finalProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    const user: User = {
      id: authData.user.id,
      email: authData.user.email!,
      username: finalProfile?.username || username,
      avatar_url: finalProfile?.avatar_url,
      created_at: finalProfile?.created_at || new Date().toISOString(),
      updated_at: finalProfile?.updated_at || new Date().toISOString()
    }

    console.log('✅ [AUTH] Registration completed successfully')
    return { success: true, user }
  } catch (error: any) {
    console.error('❌ [AUTH] Registration failed with exception:', error)
    return { success: false, error: `Registration failed: ${error.message}` }
  }
}

/**
 * Authenticate a user with Supabase Auth
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const supabase = await createClient()

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()
    console.log('🔐 [AUTH] Authenticating user:', normalizedEmail)

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password
    })

    if (authError) {
      console.error('❌ [AUTH] Authentication failed:', authError)
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Authentication failed' }
    }

    // Check if MFA is required
    if (authData.session === null && authData.user && 'factors' in authData.user && authData.user.factors && Array.isArray(authData.user.factors) && authData.user.factors.length > 0) {
      console.log('🔐 [AUTH] MFA required for user:', authData.user.id)
      return {
        success: false,
        requiresMFA: true,
        error: 'MFA code required'
      }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError) {
      console.error('❌ [AUTH] Profile fetch error:', profileError)
      // Create profile if it doesn't exist
      const username = authData.user.user_metadata?.username || authData.user.email?.split('@')[0] || 'user'
      await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          username: username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    // Update last login (handled by trigger, but we can also do it manually)
    if (profile) {
      await supabase
        .from('profiles')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', authData.user.id)
    }

    const user: User = {
      id: authData.user.id,
      email: authData.user.email!,
      username: profile?.username || authData.user.user_metadata?.username || 'user',
      avatar_url: profile?.avatar_url,
      created_at: profile?.created_at || authData.user.created_at,
      updated_at: profile?.updated_at || new Date().toISOString(),
      last_login: profile?.last_login || new Date().toISOString()
    }

    console.log('✅ [AUTH] User authenticated successfully:', user.username)
    return { success: true, user }
  } catch (error: any) {
    console.error('❌ [AUTH] Authentication failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify MFA TOTP code
 */
export async function verifyMFA(
  email: string,
  password: string,
  totpCode: string
): Promise<AuthResponse> {
  try {
    const supabase = await createClient()

    // First, sign in to get the challenge
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    })

    if (authError || !authData.user) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Verify TOTP - use mfa.verify instead of verifyOtp for TOTP codes
    // First get the TOTP factor
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
    
    const factors = factorsData?.all || []
    if (factorsError || !factors || factors.length === 0) {
      return { success: false, error: 'MFA not configured' }
    }
    
    const totpFactor = factors.find(f => f.factor_type === 'totp' && f.status === 'verified')
    
    if (!totpFactor) {
      return { success: false, error: 'No verified TOTP factor found' }
    }
    
    // Create challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id
    })
    
    if (challengeError || !challengeData) {
      return { success: false, error: challengeError?.message || 'Failed to create challenge' }
    }
    
    // Verify with challenge
    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code: totpCode
    })

    if (verifyError || !verifyData.user) {
      return { success: false, error: 'Invalid MFA code' }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', verifyData.user.id)
      .single()

    const user: User = {
      id: verifyData.user.id,
      email: verifyData.user.email!,
      username: profile?.username || verifyData.user.user_metadata?.username || 'user',
      avatar_url: profile?.avatar_url,
      created_at: profile?.created_at || verifyData.user.created_at,
      updated_at: profile?.updated_at || new Date().toISOString()
    }

    return { success: true, user }
  } catch (error: any) {
    console.error('❌ [AUTH] MFA verification failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email!,
      username: profile?.username || user.user_metadata?.username || 'user',
      avatar_url: profile?.avatar_url,
      created_at: profile?.created_at || user.created_at,
      updated_at: profile?.updated_at || new Date().toISOString(),
      last_login: profile?.last_login
    }
  } catch (error) {
    console.error('❌ [AUTH] Error getting current user:', error)
    return null
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/")
  redirect("/")
}

/**
 * Server actions for forms
 */
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

  // Register user
  console.log("🚀 [SIGNUP] Starting registration process...")
  const result = await registerUser(email, password, username)

  if (!result.success) {
    console.error("❌ [SIGNUP] Registration failed:", result.error)
    redirect(`/signup?error=${encodeURIComponent(result.error || "Registration failed")}`)
  }

  console.log("✅ [SIGNUP] Registration successful")

  // Email confirmation is enabled - user needs to check their email
  // Redirect back to signup page with success message
  revalidatePath("/")
  redirect("/signup?message=Account created! Please check your email to confirm your account before logging in.")
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    redirect("/login?error=Email and password are required")
  }

  try {
    // Authenticate user
    const result = await authenticateUser(email, password)

    if (!result.success) {
      if (result.requiresMFA) {
        // Redirect to MFA verification page
        redirect(`/login?mfa=true&email=${encodeURIComponent(email)}`)
      }
      console.log("❌ [LOGIN] Authentication failed:", result.error)
      redirect(`/login?error=${encodeURIComponent(result.error || "Login failed")}`)
    }

    // Store user in session (handled by Supabase)
    if (result.user) {
      console.log("✅ [LOGIN] Authentication successful, redirecting to dashboard")
      revalidatePath("/")
      redirect(`/dashboard`)
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
  await signOut()
}


