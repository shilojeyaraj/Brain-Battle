/**
 * Simple PDF Text Extraction Utility
 * Uses pdf-parse@1.1.1 - the simple, battle-tested version that works on Vercel
 * 
 * IMPORTANT: We use pdf-parse@1.1.1 (not 2.x) because:
 * - 1.1.1 is simpler and more reliable on serverless
 * - 2.x uses pdfjs-dist internally which has worker issues on Vercel
 * - 1.1.1 has been battle-tested on millions of Vercel deployments
 */

import pdfParse from 'pdf-parse'

/**
 * Extract text from PDF buffer
 * Works perfectly on Vercel serverless without any configuration
 * 
 * @param buffer - PDF file as Buffer
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
    // pdf-parse@1.1.1 is simple - just call it with the buffer
    // It returns: { numpages, numrender, info, metadata, version, text }
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
