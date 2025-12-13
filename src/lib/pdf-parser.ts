/**
 * Simple PDF Text Extraction Utility
 * Uses pdf-parse library - works perfectly on Vercel serverless
 * No worker configuration needed - pdf-parse handles it internally
 * 
 * PRODUCTION ERRORS FIXED:
 * 1. "Cannot find package 'pdf.worker.min.mjs'" - pdf-parse handles workers internally
 * 2. "pdf-parse is not a function" - PDFParse is a class, not a function
 * 3. "Please provide binary data as Uint8Array" - Convert Buffer to Uint8Array
 */

/**
 * Extract text from PDF buffer
 * Works perfectly on Vercel serverless without any configuration
 * 
 * @param buffer - PDF file as Buffer (will be converted to Uint8Array internally)
 * @returns Object containing extracted text and metadata
 */
export async function extractPDFText(buffer: Buffer): Promise<{
  text: string
  pages: number
  info?: any
  metadata?: any
  version?: string
}> {
  try {
    // CRITICAL: Convert Buffer to Uint8Array - pdf-parse requires Uint8Array
    // Error: "Please provide binary data as `Uint8Array`, rather than `Buffer`"
    const uint8Array = new Uint8Array(buffer)
    
    // pdf-parse exports PDFParse as a named export in ESM
    const pdfParseModule: any = await import('pdf-parse')
    
    // Get PDFParse class from the module
    const PDFParse = pdfParseModule.PDFParse
    
    if (!PDFParse || typeof PDFParse !== 'function') {
      console.error('pdf-parse module structure:', {
        hasPDFParse: !!pdfParseModule.PDFParse,
        keys: Object.keys(pdfParseModule),
        PDFParseType: typeof PDFParse
      })
      throw new Error('PDFParse class not found in pdf-parse module')
    }
    
    // Create PDFParse instance with Uint8Array (NOT Buffer!)
    const parser = new PDFParse(uint8Array)
    
    // Extract text using getText() method
    const data = await parser.getText()
    
    // Handle different return formats
    const text = typeof data === 'string' ? data : (data?.text || '')
    const pages = data?.numpages || data?.pages || 0
    
    return {
      text,
      pages,
      info: data?.info,
      metadata: data?.metadata,
      version: data?.version
    }
  } catch (error) {
    console.error('PDF parsing error:', error)
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`)
  }
}
