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
    
    // Create PDFParse instance with buffer
    const parser = new PDFParse(buffer)
    
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
