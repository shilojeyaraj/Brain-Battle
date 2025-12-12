/**
 * Simple PDF Text Extraction Utility
 * Uses pdf-parse library - works perfectly on Vercel serverless
 * No worker configuration needed - pdf-parse handles it internally
 */

/**
 * Extract text from PDF buffer
 * Works perfectly on Vercel serverless without any configuration
 */
export async function extractPDFText(buffer: Buffer): Promise<{
  text: string
  pages: number
  info?: any
  metadata?: any
  version?: string
}> {
  try {
    // Dynamic import to handle pdf-parse's export structure
    const pdfParseModule: any = await import('pdf-parse')
    // pdf-parse exports the function directly or as default, handle both
    const pdfParse = pdfParseModule.default || pdfParseModule
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse is not a function')
    }
    
    const data = await pdfParse(buffer)
    
    return {
      text: data.text || '',
      pages: data.numpages || 0,
      info: data.info,
      metadata: data.metadata,
      version: data.version
    }
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
}
