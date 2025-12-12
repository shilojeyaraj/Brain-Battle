/**
 * Simple PDF Text Extraction Utility
 * Uses pdf-parse library - works perfectly on Vercel serverless
 * No worker configuration needed - pdf-parse handles it internally
 */

import pdfParse from 'pdf-parse'

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

