/**
 * PDF.js Configuration for Serverless Environments
 * 
 * Configures pdfjs-dist to work in serverless environments (Vercel, AWS Lambda, etc.)
 * where worker files cannot be loaded from the file system.
 * 
 * PRODUCTION-READY: This configuration ensures PDF parsing works in both
 * development and production serverless environments.
 */

// Global flag to ensure configuration only happens once
let pdfjsConfigured = false
let configuredPdfjsLib: any = null
let resolvedWorkerSrc: string | null = null

export function resolveWorkerSrc() {
  if (resolvedWorkerSrc !== null) return resolvedWorkerSrc
  // CRITICAL FIX: In production serverless (Vercel), worker files don't exist
  // Setting to empty string forces fake worker mode without trying to import the file
  // This prevents "Cannot find package 'pdf.worker.min.mjs'" errors
  resolvedWorkerSrc = ''
  return resolvedWorkerSrc
}

/**
 * Configure pdfjs-dist for serverless environments
 * This disables the worker and uses fake worker instead
 * 
 * CRITICAL FIX FOR PRODUCTION: PDF.js 4.4.168 tries to import worker file during initialization.
 * In serverless (Vercel), worker files don't exist, causing "Cannot find package" errors.
 * Solution: Set workerSrc to empty string BEFORE import, and disableWorker=true to skip worker entirely.
 */
export async function configurePdfjsForServerless() {
  try {
    if (pdfjsConfigured && configuredPdfjsLib) {
      return configuredPdfjsLib
    }

    // CRITICAL: Set global worker options BEFORE importing pdfjs-dist
    // This prevents pdfjs from trying to import the worker file during module load
    applyGlobalPdfjsWorkerDisable()

    // Use ESM legacy build; fallback to ESM main build if legacy missing
    let pdfjsLib: any
    try {
      const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjsLib = pdfjsModule.default || pdfjsModule
      
      // CRITICAL: Set worker options IMMEDIATELY after import (before any operations)
      // Must set on the pdfjsLib instance, not just global
      if (pdfjsLib.GlobalWorkerOptions) {
        const workerOptions = pdfjsLib.GlobalWorkerOptions
        // Empty string forces fake worker without trying to import the file
        workerOptions.workerSrc = ''
        ;(workerOptions as any).disableWorker = true
      } else {
        // Create GlobalWorkerOptions if it doesn't exist
        pdfjsLib.GlobalWorkerOptions = { workerSrc: '', disableWorker: true }
      }
    } catch (error) {
      // If legacy build fails, try main build
      try {
        const pdfjsModule: any = await import('pdfjs-dist/build/pdf.mjs')
        pdfjsLib = pdfjsModule.default || pdfjsModule
        
        // CRITICAL: Set worker options IMMEDIATELY after import
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = ''
          ;(pdfjsLib.GlobalWorkerOptions as any).disableWorker = true
        } else {
          pdfjsLib.GlobalWorkerOptions = { workerSrc: '', disableWorker: true }
        }
      } catch (fallbackError) {
        console.error('❌ [PDFJS CONFIG] Failed to import pdfjs-dist:', fallbackError)
        throw fallbackError
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [PDFJS CONFIG] Worker disabled, using fake worker (empty workerSrc)')
    }

    if (typeof pdfjsLib.setWorkerFetch === 'function') {
      try {
        pdfjsLib.setWorkerFetch(false)
      } catch (e) {
        // Ignore errors setting worker fetch
      }
    }

    configuredPdfjsLib = pdfjsLib
    pdfjsConfigured = true

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [PDFJS CONFIG] PDF.js configured for serverless environment')
    }

    return pdfjsLib
  } catch (error) {
    console.error('❌ [PDFJS CONFIG] Error configuring pdfjs-dist:', error)
    throw error
  }
}

/**
 * Get pdfjs-dist library with serverless configuration
 * Use this instead of directly importing pdfjs-dist
 * 
 * This ensures the library is properly configured for serverless environments
 * before any PDF operations are performed.
 */
export async function getPdfjsLib() {
  return await configurePdfjsForServerless()
}

/**
 * Default options for getDocument in serverless environments
 * These options optimize PDF parsing for serverless/Node.js environments
 * and ensure compatibility with production deployments.
 */
export const SERVERLESS_PDF_OPTIONS = {
  useSystemFonts: true, // Use system fonts instead of embedded fonts (faster, no file access)
  verbosity: 0, // Minimal logging (reduces output in production)
  isEvalSupported: false, // Disable eval for security
  useWorkerFetch: false, // Disable worker fetch in serverless (no file system access)
  disableAutoFetch: true, // Disable auto-fetching of resources (prevents network calls)
  disableStream: false, // Keep stream enabled for better performance with large PDFs
  disableWorker: true, // HARD DISABLE the worker so pdfjs skips workerSrc checks entirely
  // Note: We still set GlobalWorkerOptions.workerSrc = '' as a belt-and-suspenders,
  // but disableWorker=true avoids the fake-worker check that throws when workerSrc is unset.
}

/**
 * Apply a global fake-worker disable as an absolute fallback.
 * Some pdfjs-dist code paths may access globalThis.GlobalWorkerOptions directly.
 */
export function applyGlobalPdfjsWorkerDisable() {
  const globalObj: any = globalThis as any
  if (!globalObj.GlobalWorkerOptions) {
    globalObj.GlobalWorkerOptions = {}
  }
  if (typeof globalObj.GlobalWorkerOptions !== 'object') {
    globalObj.GlobalWorkerOptions = {}
  }
  globalObj.GlobalWorkerOptions.workerSrc = ''
  ;(globalObj.GlobalWorkerOptions as any).disableWorker = true
}
