/**
 * WebAuthn MFA Implementation with Device PIN Authentication
 * 
 * This module implements WebAuthn MFA using platform authenticators
 * (Windows Hello, Android, iOS Face/Touch ID) with device PIN verification.
 * 
 * Key features:
 * - userVerification: 'required' - Enforces PIN/biometric verification
 * - Platform authenticators - Uses device's built-in security
 * - Phishing-resistant - Cryptographic proof of identity
 */

export interface WebAuthnRegistrationOptions {
  challenge: string
  rp: {
    name: string
    id?: string
  }
  user: {
    id: string // Base64URL encoded user ID
    name: string
    displayName: string
  }
  pubKeyCredParams: Array<{
    type: 'public-key'
    alg: number
  }>
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform'
    userVerification: 'required' | 'preferred' | 'discouraged'
    requireResidentKey?: boolean
  }
  timeout?: number
  attestation?: 'none' | 'indirect' | 'direct'
  excludeCredentials?: Array<{
    id: string
    type: 'public-key'
    transports?: string[]
  }>
}

export interface WebAuthnAuthenticationOptions {
  challenge: string
  allowCredentials?: Array<{
    id: string
    type: 'public-key'
    transports?: string[]
  }>
  rpId?: string
  userVerification: 'required' | 'preferred' | 'discouraged'
  timeout?: number
}

export interface WebAuthnCredential {
  id: string // Base64URL encoded credential ID
  publicKey: string
  counter: number
  deviceType: 'platform' | 'cross-platform'
  createdAt: string
  lastUsedAt?: string
}

/**
 * Generate WebAuthn registration options for a new credential
 * This is called on the server to create registration options
 */
export function generateRegistrationOptions(
  userId: string,
  userName: string,
  userDisplayName: string,
  rpName: string = 'Brain Battle',
  rpId?: string
): WebAuthnRegistrationOptions {
  // Generate a random challenge (should be cryptographically secure in production)
  const challenge = generateChallenge()

  // Get RP ID - use provided or default
  let finalRpId = rpId
  if (!finalRpId && typeof window !== 'undefined') {
    finalRpId = window.location.hostname
  } else if (!finalRpId) {
    // Server-side fallback
    finalRpId = process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', '').replace('http://', '').split('/')[0] || 'localhost'
  }

  return {
    challenge,
    rp: {
      name: rpName,
      id: finalRpId
    },
    user: {
      id: base64UrlEncode(userId),
      name: userName,
      displayName: userDisplayName
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Use platform authenticators (device PIN/biometric)
      userVerification: 'required', // REQUIRED: Enforces PIN/biometric verification
      requireResidentKey: false
    },
    timeout: 60000, // 60 seconds
    attestation: 'none' // Don't require attestation for better compatibility
  }
}

/**
 * Generate WebAuthn authentication options for login
 * This is called on the server to create authentication options
 */
export function generateAuthenticationOptions(
  credentialIds?: string[],
  rpId?: string
): WebAuthnAuthenticationOptions {
  const challenge = generateChallenge()

  // Get RP ID - use provided or default
  let finalRpId = rpId
  if (!finalRpId && typeof window !== 'undefined') {
    finalRpId = window.location.hostname
  } else if (!finalRpId) {
    // Server-side fallback
    finalRpId = process.env.NEXT_PUBLIC_SITE_URL?.replace('https://', '').replace('http://', '').split('/')[0] || 'localhost'
  }

  return {
    challenge,
    allowCredentials: credentialIds?.map(id => ({
      id,
      type: 'public-key' as const,
      transports: ['internal'] // Platform authenticators use internal transport
    })),
    rpId: finalRpId,
    userVerification: 'required', // REQUIRED: Enforces PIN/biometric verification
    timeout: 60000 // 60 seconds
  }
}

/**
 * Register a new WebAuthn credential on the client
 * This calls the WebAuthn API to create a new credential
 */
export async function registerCredential(
  options: WebAuthnRegistrationOptions
): Promise<PublicKeyCredential> {
  // Ensure RP ID matches current domain
  // For localhost, use 'localhost' (no port)
  let rpId = options.rp.id
  if (typeof window !== 'undefined') {
    const currentHostname = window.location.hostname
    if (currentHostname === 'localhost' || currentHostname.startsWith('127.0.0.1')) {
      rpId = 'localhost'
    } else if (!rpId) {
      // Fallback to current hostname if not provided
      rpId = currentHostname
    }
  }

  // Convert options to WebAuthn API format
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlDecode(options.challenge),
    rp: {
      ...options.rp,
      id: rpId // Use validated RP ID
    },
    user: {
      id: base64UrlDecode(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: options.authenticatorSelection,
    timeout: options.timeout,
    attestation: options.attestation
  }

  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  // Check if platform authenticators are available
  const isPlatformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  if (!isPlatformAuthenticatorAvailable) {
    throw new Error('Platform authenticator (device PIN/biometric) is not available on this device')
  }

  // Create the credential
  // This will trigger the device PIN/biometric prompt
  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  }) as PublicKeyCredential

  if (!credential) {
    throw new Error('Failed to create credential')
  }

  return credential
}

/**
 * Authenticate with an existing WebAuthn credential
 * This calls the WebAuthn API to verify the user
 */
export async function authenticateWithCredential(
  options: WebAuthnAuthenticationOptions
): Promise<PublicKeyCredential> {
  // Ensure RP ID matches current domain
  // For localhost, use 'localhost' (no port)
  let rpId = options.rpId
  if (typeof window !== 'undefined') {
    const currentHostname = window.location.hostname
    if (currentHostname === 'localhost' || currentHostname.startsWith('127.0.0.1')) {
      rpId = 'localhost'
    } else if (!rpId) {
      // Fallback to current hostname if not provided
      rpId = currentHostname
    }
  }

  // Convert options to WebAuthn API format
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlDecode(options.challenge),
    allowCredentials: options.allowCredentials?.map(cred => ({
      id: base64UrlDecode(cred.id),
      type: 'public-key',
      transports: cred.transports as AuthenticatorTransport[]
    })),
    rpId: rpId, // Use validated RP ID
    userVerification: options.userVerification,
    timeout: options.timeout
  }

  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  // Get the credential
  // This will trigger the device PIN/biometric prompt
  const credential = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  }) as PublicKeyCredential

  if (!credential) {
    throw new Error('Failed to authenticate with credential')
  }

  return credential
}

/**
 * Extract credential data from PublicKeyCredential for storage
 */
export function extractCredentialData(credential: PublicKeyCredential): {
  id: string
  rawId: string
  response: {
    clientDataJSON: string
    attestationObject?: string
    authenticatorData?: string
    signature?: string
    userHandle?: string
  }
} {
  if (!(credential.response instanceof AuthenticatorAttestationResponse) &&
      !(credential.response instanceof AuthenticatorAssertionResponse)) {
    throw new Error('Invalid credential response type')
  }

  const response = credential.response

  if (response instanceof AuthenticatorAttestationResponse) {
    // Registration response
    return {
      id: credential.id,
      rawId: base64UrlEncode(new Uint8Array(credential.rawId)),
      response: {
        clientDataJSON: base64UrlEncode(new Uint8Array(response.clientDataJSON)),
        attestationObject: base64UrlEncode(new Uint8Array(response.attestationObject))
      }
    }
  } else {
    // Authentication response
    return {
      id: credential.id,
      rawId: base64UrlEncode(new Uint8Array(credential.rawId)),
      response: {
        clientDataJSON: base64UrlEncode(new Uint8Array(response.clientDataJSON)),
        authenticatorData: base64UrlEncode(new Uint8Array(response.authenticatorData)),
        signature: base64UrlEncode(new Uint8Array(response.signature)),
        userHandle: response.userHandle ? base64UrlEncode(new Uint8Array(response.userHandle)) : undefined
      }
    }
  }
}

/**
 * Utility functions
 */

function generateChallenge(): string {
  // Generate a random 32-byte challenge
  const array = new Uint8Array(32)
  
  // Use crypto.getRandomValues if available (browser), otherwise use Node.js crypto
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array)
  } else {
    // Fallback for Node.js
    const nodeCrypto = require('crypto')
    const randomBytes = nodeCrypto.randomBytes(32)
    array.set(randomBytes)
  }
  
  return base64UrlEncode(array)
}

function base64UrlEncode(buffer: Uint8Array | string): string {
  if (typeof buffer === 'string') {
    buffer = new TextEncoder().encode(buffer)
  }
  
  let binary = ''
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(base64: string): Uint8Array {
  // Add padding if needed
  let padded = base64.replace(/-/g, '+').replace(/_/g, '/')
  while (padded.length % 4) {
    padded += '='
  }
  
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  
  return bytes
}

/**
 * Check if WebAuthn is supported in the current browser
 */
export async function isWebAuthnSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  if (!window.PublicKeyCredential) {
    return false
  }

  try {
    // Check if platform authenticator is available
    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return isAvailable
  } catch {
    return false
  }
}

