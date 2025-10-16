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
    
    // Test basic Supabase connection first
    console.log('🔍 [AUTH] Testing Supabase connection...')
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ [AUTH] Supabase connection failed:', testError)
      return { success: false, error: `Database connection failed: ${testError.message}` }
    }
    
    console.log('✅ [AUTH] Supabase connection successful')
    
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('email', normalizedEmail)
      .single()
    
    if (existingUser) {
      console.log('❌ [AUTH] User already exists with this email')
      return { success: false, error: 'User already exists with this email' }
    }
    
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
  } catch (error: any) {
    console.error('❌ [AUTH] Registration failed with exception:', error)
    return { success: false, error: `Registration failed: ${error.message}` }
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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()
    
    if (userError || !userData) {
      console.error('❌ [AUTH] User not found:', userError)
      return { success: false, error: 'Invalid email or password' }
    }
    
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
  } catch (error: any) {
    console.error('❌ [AUTH] Authentication failed:', error)
    return { success: false, error: error.message }
  }
}

// Get user profile by ID
export async function getUserProfile(userId: string): Promise<AuthResponse> {
  try {
    const supabase = await createClient()
    console.log('👤 [AUTH] Getting user profile:', userId)
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, created_at, updated_at, last_login')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('❌ [AUTH] Profile fetch error:', error)
      return { success: false, error: error.message }
    }
    
    if (!data) {
      return { success: false, error: 'User profile not found' }
    }
    
    const user: User = {
      id: data.id,
      email: data.email,
      username: data.username,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login: data.last_login
    }
    
    console.log('✅ [AUTH] Profile loaded successfully:', user.username)
    return { success: true, user }
  } catch (error: any) {
    console.error('❌ [AUTH] Profile fetch failed:', error)
    return { success: false, error: error.message }
  }
}
