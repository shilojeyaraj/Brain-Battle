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

function resolveWorkerSrc() {
  // In serverless we force fake worker; an empty string avoids loading the worker file.
  if (!resolvedWorkerSrc) resolvedWorkerSrc = ''
  return resolvedWorkerSrc
}

/**
 * Configure pdfjs-dist for serverless environments
 * This disables the worker and uses fake worker instead
 * 
 * CRITICAL FIX: PDF.js 4.4.168 checks workerSrc during fake worker initialization
 * at api.js:2314. The check happens internally and bypasses property descriptors.
 * We must set workerSrc to a non-empty value IMMEDIATELY after import.
 */
export async function configurePdfjsForServerless() {
  try {
    if (pdfjsConfigured && configuredPdfjsLib) {
      return configuredPdfjsLib
    }

    // Use the CommonJS build to avoid ESM worker imports in serverless
    const { createRequire } = require('module')
    const req = createRequire(import.meta.url)
    let pdfjsLib: any
    try {
      pdfjsLib = req('pdfjs-dist/legacy/build/pdf.js')
    } catch {
      // Fallback to main CJS build path if legacy CJS is absent in prod
      pdfjsLib = req('pdfjs-dist/build/pdf.js')
    }

    if (pdfjsLib.GlobalWorkerOptions) {
      const workerOptions = pdfjsLib.GlobalWorkerOptions
      workerOptions.workerSrc = resolveWorkerSrc() // empty string -> fake worker
      ;(workerOptions as any).disableWorker = true
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [PDFJS CONFIG] Worker source set to empty (fake worker), using CJS build')
      }
    }

    if (typeof pdfjsLib.setWorkerFetch === 'function') {
      pdfjsLib.setWorkerFetch(false)
    }

    configuredPdfjsLib = pdfjsLib
    pdfjsConfigured = true

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [PDFJS CONFIG] PDF.js configured for serverless environment (CJS build)')
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
