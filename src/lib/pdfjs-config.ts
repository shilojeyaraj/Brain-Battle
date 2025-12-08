/**
 * PDF.js Configuration for Serverless Environments
 * 
 * Configures pdfjs-dist to work in serverless environments (Vercel, AWS Lambda, etc.)
 * where worker files cannot be loaded from the file system.
 */

/**
 * Configure pdfjs-dist for serverless environments
 * This disables the worker and uses fake worker instead
 */
export async function configurePdfjsForServerless() {
  try {
    const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdfjsLib = pdfjsModule.default || pdfjsModule
    
    // Disable worker in serverless environments
    // This prevents the "Cannot find module pdf.worker.mjs" error
    if (pdfjsLib.GlobalWorkerOptions) {
      // Set worker source to empty string to disable worker
      // This forces pdfjs to use the fake worker (no actual worker thread)
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
    }
    
    // Also disable worker fetch if available
    if (typeof pdfjsLib.setWorkerFetch === 'function') {
      pdfjsLib.setWorkerFetch(false)
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
 */
export async function getPdfjsLib() {
  return await configurePdfjsForServerless()
}

/**
 * Default options for getDocument in serverless environments
 */
export const SERVERLESS_PDF_OPTIONS = {
  useSystemFonts: true,
  verbosity: 0,
  isEvalSupported: false,
  useWorkerFetch: false, // Disable worker fetch in serverless
  disableAutoFetch: true, // Disable auto-fetching
  disableStream: false, // Keep stream enabled for better performance
}

