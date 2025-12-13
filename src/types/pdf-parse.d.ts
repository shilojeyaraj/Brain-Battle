/**
 * Type declarations for pdf-parse@1.1.1
 * This version doesn't have built-in types
 */
declare module 'pdf-parse' {
  interface PdfParseResult {
    numpages: number
    numrender: number
    info: any
    metadata: any
    version: string
    text: string
  }

  interface PdfParseOptions {
    pagerender?: (pageData: any) => string
    max?: number
    version?: string
  }

  function pdfParse(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>

  export = pdfParse
}

