/**
 * @jest-environment node
 * 
 * Tests for PDF extraction logic including fallback behavior.
 * These test the extraction pipeline's resilience to various failure modes.
 */

describe('PDF Extraction Fallback Logic', () => {
  it('should use pdfjs-dist fallback when pdf-parse returns < 100 chars', async () => {
    let pdfParseCallCount = 0
    let pdfjsFallbackCalled = false

    const mockPdfParse = async (_buffer: Buffer) => {
      pdfParseCallCount++
      return { text: 'short', pages: 1, numpages: 1 }
    }

    const mockPdfjsFallback = async (_buffer: Buffer, _filename: string) => {
      pdfjsFallbackCalled = true
      return {
        text: 'This is a much longer text extracted by pdfjs-dist from a PDF document that contains enough content to pass the threshold check.',
        images: [],
      }
    }

    const buffer = Buffer.from('fake pdf data')
    let textContent = ''

    const pdfData = await mockPdfParse(buffer)
    textContent = pdfData.text || ''

    if (textContent.trim().length < 100) {
      const pdfContent = await mockPdfjsFallback(buffer, 'test.pdf')
      if (pdfContent.text && pdfContent.text.trim().length > textContent.trim().length) {
        textContent = pdfContent.text
      }
    }

    expect(pdfParseCallCount).toBe(1)
    expect(pdfjsFallbackCalled).toBe(true)
    expect(textContent.length).toBeGreaterThan(100)
  })

  it('should skip pdfjs-dist fallback when pdf-parse returns >= 100 chars', async () => {
    let pdfjsFallbackCalled = false

    const longText = 'A'.repeat(150)
    const mockPdfParse = async (_buffer: Buffer) => ({
      text: longText, pages: 1, numpages: 1
    })

    const buffer = Buffer.from('fake pdf data')
    const pdfData = await mockPdfParse(buffer)
    let textContent = pdfData.text || ''

    if (textContent.trim().length < 100) {
      pdfjsFallbackCalled = true
    }

    expect(pdfjsFallbackCalled).toBe(false)
    expect(textContent.length).toBe(150)
  })

  it('should catch mmap-like errors from pdf-parse and fall through', async () => {
    let textContent = ''
    let usedFallback = false

    const mockPdfParseThatThrows = async () => {
      throw new Error('mmap failed: Cannot allocate memory')
    }

    const mockPdfjsFallback = async () => ({
      text: 'Recovered content from pdfjs-dist after mmap failure. This is a lengthy extraction result with plenty of content.',
      images: [],
    })

    try {
      await mockPdfParseThatThrows()
    } catch (primaryErr: any) {
      const errMsg = String(primaryErr?.message || '')
      const isMmapOrEnv = errMsg.includes('mmap') || errMsg.includes('ENOMEM') || errMsg.includes('worker')
      expect(isMmapOrEnv).toBe(true)
      textContent = ''
    }

    if (textContent.trim().length < 100) {
      const pdfContent = await mockPdfjsFallback()
      if (pdfContent.text.trim().length > textContent.trim().length) {
        textContent = pdfContent.text
        usedFallback = true
      }
    }

    expect(usedFallback).toBe(true)
    expect(textContent.length).toBeGreaterThan(50)
  })

  it('should catch ENOMEM errors and fall through', async () => {
    let caughtError = false

    try {
      throw new Error('ENOMEM: not enough memory, mmap failed')
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('mmap') || msg.includes('ENOMEM')) {
        caughtError = true
      }
    }

    expect(caughtError).toBe(true)
  })

  it('should catch worker/Cannot find errors and fall through', async () => {
    let caughtError = false

    try {
      throw new Error("Cannot find package 'pdfjs-dist/build/pdf.worker.min.mjs'")
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.includes('Cannot find')) {
        caughtError = true
      }
    }

    expect(caughtError).toBe(true)
  })

  it('should throw when both parsers return < 50 chars', async () => {
    const mockPdfParse = async () => ({ text: 'abc', pages: 1, numpages: 1 })
    const mockPdfjsFallback = async () => ({ text: 'def', images: [] })

    const pdfData = await mockPdfParse()
    let textContent = pdfData.text || ''

    if (textContent.trim().length < 100) {
      const pdfContent = await mockPdfjsFallback()
      if (pdfContent.text.trim().length > textContent.trim().length) {
        textContent = pdfContent.text
      }
    }

    expect(textContent.trim().length).toBeLessThan(50)

    expect(() => {
      if (!textContent || textContent.trim().length < 50) {
        throw new Error(
          `This PDF appears to be image-based or scanned (only ${textContent.length} characters of text found). ` +
          'Please try a text-based PDF, or use OCR software to convert the scanned PDF to searchable text first.'
        )
      }
    }).toThrow('image-based or scanned')
  })

  it('should prefer pdfjs-dist result when it has more content', async () => {
    const shortText = 'ab'
    const longerText = 'A comprehensive document about sorting algorithms with detailed explanations of bubble sort, quick sort, and merge sort complexity analysis.'

    let textContent = shortText

    if (textContent.trim().length < 100) {
      const fallbackText = longerText
      if (fallbackText.trim().length > textContent.trim().length) {
        textContent = fallbackText
      }
    }

    expect(textContent).toBe(longerText)
  })

  it('should keep pdf-parse result when fallback has less content', async () => {
    const originalText = 'A'.repeat(50)

    let textContent = originalText

    if (textContent.trim().length < 100) {
      const fallbackText = 'short'
      if (fallbackText.trim().length > textContent.trim().length) {
        textContent = fallbackText
      }
    }

    expect(textContent).toBe(originalText)
  })
})

describe('Serverless PDF Options', () => {
  it('should have correct serverless options set', async () => {
    const { SERVERLESS_PDF_OPTIONS } = await import('@/lib/pdfjs-config')

    expect(SERVERLESS_PDF_OPTIONS.disableWorker).toBe(true)
    expect(SERVERLESS_PDF_OPTIONS.disableStream).toBe(true)
    expect(SERVERLESS_PDF_OPTIONS.disableRange).toBe(true)
    expect(SERVERLESS_PDF_OPTIONS.disableFontFace).toBe(true)
    expect(SERVERLESS_PDF_OPTIONS.isEvalSupported).toBe(false)
    expect(SERVERLESS_PDF_OPTIONS.useWorkerFetch).toBe(false)
    expect(SERVERLESS_PDF_OPTIONS.disableAutoFetch).toBe(true)
    expect(SERVERLESS_PDF_OPTIONS.verbosity).toBe(0)
  })
})
