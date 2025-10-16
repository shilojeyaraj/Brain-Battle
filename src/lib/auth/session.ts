"use client"

import { User } from "./custom-auth"

// Simple session management using localStorage
// In a production app, you'd want to use more secure methods

export function setUserSession(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('userId', user.id)
  }
}

export function getUserSession(): User | null {
  if (typeof window === 'undefined') return null
  
  try {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    
    const user = JSON.parse(userStr)
    return user
  } catch (error) {
    console.error('Error parsing user session:', error)
    return null
  }
}

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('userId')
}

export function clearUserSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
  }
}

export function isUserLoggedIn(): boolean {
  return getUserSession() !== null
}
