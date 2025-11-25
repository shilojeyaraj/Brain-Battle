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

// Get user-friendly error message, filtering out technical errors
const getUserFriendlyError = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred'
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // Filter out technical error messages
  if (errorMessage.includes('NEXT_REDIRECT') || 
      errorMessage.includes('digest') ||
      errorMessage.toLowerCase().includes('redirect')) {
    return 'An error occurred. Please try again.'
  }
  
  // Return user-friendly message
  return errorMessage
}

// Register a new user
export async function registerUser(
  email: string | undefined, 
  password: string, 
  username: string
): Promise<AuthResponse> {
  try {
    // Use admin client to bypass RLS for registration
    // Use the same client instance for all operations to ensure transaction consistency
    const supabase = createAdminClient()
    const adminClient = supabase // Use same client for consistency

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
      console.error('❌ [AUTH] Error details:', JSON.stringify(userError, null, 2))
      return { success: false, error: `Registration failed: ${userError.message}` }
    }
    
    if (!userData) {
      console.error('❌ [AUTH] No user returned after insert')
      console.error('❌ [AUTH] Insert response:', JSON.stringify(attempt, null, 2))
      return { success: false, error: 'Registration failed: No user data returned' }
    }
    
    console.log('✅ [AUTH] User created successfully:', userData.id)
    console.log('✅ [AUTH] User data:', JSON.stringify({ id: userData.id, username: userData.username, email: userData.email }, null, 2))
    
    // Immediately query to verify the insert was committed
    console.log('🔍 [AUTH] Immediately checking if user exists in database...')
    const immediateCheck = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .eq('id', userData.id)
      .single()
    
    if (immediateCheck.error) {
      console.error('❌ [AUTH] Immediate check failed:', immediateCheck.error)
      console.error('❌ [AUTH] This suggests the insert may not have been committed')
    } else if (immediateCheck.data) {
      console.log('✅ [AUTH] Immediate check passed - user found:', immediateCheck.data.id)
    } else {
      console.warn('⚠️ [AUTH] Immediate check returned no data - user may not be committed yet')
    }
    
    // Verify user was actually created in database
    // Add a small delay to ensure insert is committed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .eq('id', userData.id)
      .single()
    
    if (verifyError) {
      console.error('❌ [AUTH] User verification failed after creation:', verifyError)
      console.error('❌ [AUTH] Verification error details:', JSON.stringify(verifyError, null, 2))
      // Try one more time after a longer delay
      await new Promise(resolve => setTimeout(resolve, 200))
      const { data: retryVerify, error: retryError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('id', userData.id)
        .single()
      
      if (retryError || !retryVerify) {
        console.error('❌ [AUTH] User still not found after retry:', retryError)
        console.error('❌ [AUTH] This suggests the insert may have failed or rolled back')
        return { success: false, error: 'User creation verification failed. The user may not have been saved to the database.' }
      }
      
      console.log('✅ [AUTH] User verified in database after retry:', retryVerify.id)
    } else if (!verifyUser) {
      console.error('❌ [AUTH] User verification returned no data')
      return { success: false, error: 'User creation verification failed. Please try again.' }
    } else {
      console.log('✅ [AUTH] User verified in database:', verifyUser.id)
      console.log('✅ [AUTH] Verified user details:', JSON.stringify(verifyUser, null, 2))
    }
    
    // Create initial player stats using the same admin client to ensure transaction consistency
    // Add retry logic to handle potential timing issues with transaction commits
    try {
      // Use the same adminClient instance that was used for user creation
      
      // Retry logic for player stats creation (handles transaction timing issues)
      // PostgREST commits each request separately, so we need to wait for the user insert to be fully committed
      const createPlayerStatsWithRetry = async (retries = 3, delay = 150): Promise<{ error: any | null }> => {
        // Small initial delay to ensure user insert transaction is fully committed
        await new Promise(resolve => setTimeout(resolve, 50))
        
        for (let attempt = 1; attempt <= retries; attempt++) {
          // Additional delay for retries (exponential backoff)
          if (attempt > 1) {
            await new Promise(resolve => setTimeout(resolve, delay * attempt))
            console.log(`🔄 [AUTH] Retrying player stats creation (attempt ${attempt}/${retries})...`)
          } else {
            console.log(`🔄 [AUTH] Attempting player stats creation (attempt ${attempt}/${retries})...`)
          }
          
          // Verify user still exists before attempting stats creation
          const { data: verifyBeforeStats, error: verifyErr } = await adminClient
            .from('users')
            .select('id')
            .eq('id', userData.id)
            .single()
          
          if (verifyErr || !verifyBeforeStats) {
            console.error(`❌ [AUTH] User verification failed before stats creation (attempt ${attempt}):`, verifyErr)
            if (attempt === retries) {
              return { error: { code: '23503', message: 'User not found in database' } }
            }
            continue
          }
          
          // Attempt to create player stats
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
          
          if (!statsError) {
            console.log(`✅ [AUTH] Player stats created successfully (attempt ${attempt})`)
            return { error: null }
          }
          
          // If foreign key error, retry (transaction might not be committed yet)
          if (statsError.code === '23503') {
            console.warn(`⚠️ [AUTH] Foreign key constraint on attempt ${attempt} - user might not be committed yet`)
            if (attempt === retries) {
              console.error('❌ [AUTH] Player stats creation failed after all retries:', statsError)
              return { error: statsError }
            }
            continue
          }
          
          // For other errors, return immediately
          console.error(`❌ [AUTH] Player stats creation failed (non-retryable error):`, statsError)
          return { error: statsError }
        }
        
        return { error: { code: 'RETRY_EXHAUSTED', message: 'Failed after all retry attempts' } }
      }
      
      const { error: statsError } = await createPlayerStatsWithRetry()
      
      if (statsError) {
        console.error('❌ [AUTH] Player stats creation failed after retries:', statsError)
        // Don't fail the registration for this - stats can be created later via API
        // The user profile API will create stats if they don't exist
        console.log('⚠️ [AUTH] Registration will continue - stats can be created later via API')
      }
    } catch (statsException) {
      console.error('❌ [AUTH] Exception creating player stats:', statsException)
      // Don't fail the registration for this - stats can be created later via API
    }
    
    // Create profile with the correct username during signup
    try {
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', userData.id)
        .single()
      
      if (!existingProfile) {
        // Profile doesn't exist, create it with the username from signup
        const { error: profileError } = await adminClient
          .from('profiles')
          .insert({
            user_id: userData.id,
            username: userData.username, // Use the username from signup
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (profileError) {
          console.error('❌ [AUTH] Profile creation failed:', profileError)
          // Don't fail registration - profile can be created later via API
          console.log('⚠️ [AUTH] Registration will continue - profile can be created later via API')
        } else {
          console.log('✅ [AUTH] Profile created successfully with username:', userData.username)
        }
      } else {
        // Profile exists, update username if it's different
        const { error: updateError } = await adminClient
          .from('profiles')
          .update({
            username: userData.username,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.id)
        
        if (updateError) {
          console.error('❌ [AUTH] Profile update failed:', updateError)
        } else {
          console.log('✅ [AUTH] Profile updated with username:', userData.username)
        }
      }
    } catch (profileException) {
      console.error('❌ [AUTH] Exception creating/updating profile:', profileException)
      // Don't fail registration - profile can be created later via API
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

  console.log("✅ [SIGNUP] Registration successful, redirecting to pricing page...")
  
  // Store user in session
  if (result.user && result.user.id) {
    revalidatePath("/")
    // Set secure session cookie instead of query parameter
    const { setSessionCookie } = await import('@/lib/auth/session-cookies')
    await setSessionCookie(result.user.id)
    
    // Redirect new users to pricing page to choose their plan
    redirect("/pricing?newUser=true")
  } else {
    revalidatePath("/")
    // Redirect new users to pricing page to choose their plan
    redirect("/pricing?newUser=true")
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

    // Store user in secure session cookie
    if (result.user) {
      const { setSessionCookie } = await import('@/lib/auth/session-cookies')
      await setSessionCookie(result.user.id)
      
      console.log("✅ [LOGIN] Authentication successful, session cookie set, redirecting to dashboard")
      revalidatePath("/")
      // Redirect without userId query parameter - session is in cookie
      redirect("/dashboard")
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
  // Clear session cookie
  const { clearSessionCookie } = await import('@/lib/auth/session-cookies')
  await clearSessionCookie()
  
  revalidatePath("/")
  redirect("/")
}
