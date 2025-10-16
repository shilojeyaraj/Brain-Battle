"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const username = formData.get("username") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    throw new Error("All fields are required")
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match")
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  if (username.length < 3) {
    throw new Error("Username must be at least 3 characters")
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error("Please enter a valid email address")
  }

  // Create user with Supabase Auth
  console.log("Attempting to create user with email:", email.toLowerCase().trim())
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      data: {
        username: username,
      }
    }
  })

  if (authError) {
    console.error("Supabase auth error details:", {
      message: authError.message,
      status: authError.status,
      name: authError.name
    })
    throw new Error(authError.message)
  }

  if (!authData.user) {
    throw new Error("Failed to create user")
  }

  // Insert user data into our custom users table
  try {
    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        username: username,
        email: email.toLowerCase().trim(),
        password_hash: "supabase_auth", // We don't store password hash since Supabase handles it
      })

    if (userError) {
      console.error("Error inserting user:", userError)
      // Don't throw here as the auth user was created successfully
    }

    // Create initial player stats
    const { error: statsError } = await supabase
      .from("player_stats")
      .insert({
        user_id: authData.user.id,
        level: 1,
        xp: 0,
        total_wins: 0,
        total_losses: 0,
      })

    if (statsError) {
      console.error("Error creating player stats:", statsError)
    }
  } catch (dbError) {
    console.error("Database error:", dbError)
    // Continue with redirect even if database operations fail
  }

  // Revalidate and redirect
  revalidatePath("/")
  redirect("/dashboard")
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    throw new Error("Email and password are required")
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error("Login failed")
  }

  // Update last login
  await supabase
    .from("users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.user.id)

  revalidatePath("/")
  redirect("/dashboard")
}

export async function logout() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  revalidatePath("/")
  redirect("/")
}
