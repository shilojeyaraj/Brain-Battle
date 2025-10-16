"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function signupSimple(formData: FormData) {
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

  console.log("Attempting to create user with email:", email.toLowerCase().trim())
  
  // Just try basic Supabase auth without custom tables
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
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

  console.log("User created successfully:", authData.user.id)

  // Revalidate and redirect
  revalidatePath("/")
  redirect("/dashboard")
}
