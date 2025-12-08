/**
 * PDF Parsing Test Utility
 * 
 * This utility tests PDF text extraction and image/figure extraction
 * Run this to verify your PDF parsing implementation works correctly
 */

import { extractImagesFromPDF } from './pdf-image-extractor'

/**
 * Test PDF text extraction
 */
export async function testPDFTextExtraction(buffer: Buffer): Promise<{
  success: boolean
  textLength: number
  pageCount: number
  preview: string
  error?: string
}> {
  try {
    // Use serverless-compatible pdfjs configuration
    const { getPdfjsLib, SERVERLESS_PDF_OPTIONS } = await import('@/lib/pdfjs-config')
    const pdfjsLib = await getPdfjsLib()
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      ...SERVERLESS_PDF_OPTIONS,
    })
    
    const pdfDocument = await loadingTask.promise
    const pageCount = pdfDocument.numPages
    
    console.log(`📄 [PDF TEST] PDF loaded: ${pageCount} pages`)
    
    // Extract text from all pages
    const textParts: string[] = []
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      textParts.push(pageText)
    }
    
    const fullText = textParts.join('\n\n')
    const preview = fullText.substring(0, 500)
    
    return {
      success: true,
      textLength: fullText.length,
      pageCount,
      preview,
    }
  } catch (error: any) {
    console.error('❌ [PDF TEST] Text extraction failed:', error)
    return {
      success: false,
      textLength: 0,
      pageCount: 0,
      preview: '',
      error: error.message || String(error),
    }
  }
}

/**
 * Test PDF image/figure extraction
 */
export async function testPDFImageExtraction(
  buffer: Buffer,
  filename: string = 'test.pdf'
): Promise<{
  success: boolean
  imageCount: number
  images: Array<{
    page: number
    width: number
    height: number
    type: string
    dataSize: number
  }>
  error?: string
}> {
  try {
    const images = await extractImagesFromPDF(buffer, filename)
    
    const imageInfo = images.map(img => ({
      page: img.page,
      width: img.width,
      height: img.height,
      type: 'png', // Default type for extracted images
      dataSize: img.image_data_b64?.length || 0,
    }))
    
    return {
      success: true,
      imageCount: images.length,
      images: imageInfo,
    }
  } catch (error: any) {
    console.error('❌ [PDF TEST] Image extraction failed:', error)
    return {
      success: false,
      imageCount: 0,
      images: [],
      error: error.message || String(error),
    }
  }
}

/**
 * Comprehensive PDF parsing test
 */
export async function testPDFParsing(
  buffer: Buffer,
  filename: string = 'test.pdf'
): Promise<{
  textExtraction: Awaited<ReturnType<typeof testPDFTextExtraction>>
  imageExtraction: Awaited<ReturnType<typeof testPDFImageExtraction>>
  overallSuccess: boolean
  recommendations: string[]
}> {
  console.log(`\n🧪 [PDF TEST] Starting comprehensive PDF parsing test for: ${filename}`)
  console.log(`  - Buffer size: ${buffer.length} bytes`)
  
  const textResult = await testPDFTextExtraction(buffer)
  const imageResult = await testPDFImageExtraction(buffer, filename)
  
  const recommendations: string[] = []
  
  // Analyze results
  if (!textResult.success) {
    recommendations.push('❌ Text extraction failed - check PDF format and ensure it contains selectable text')
  } else if (textResult.textLength < 100) {
    recommendations.push('⚠️ Very little text extracted - PDF may be image-based or corrupted')
  } else {
    recommendations.push(`✅ Text extraction successful: ${textResult.textLength} characters from ${textResult.pageCount} pages`)
  }
  
  if (!imageResult.success) {
    recommendations.push('❌ Image extraction failed - check canvas dependency installation')
  } else if (imageResult.imageCount === 0) {
    recommendations.push('⚠️ No images extracted - PDF may not contain visual content or canvas rendering failed')
  } else {
    recommendations.push(`✅ Image extraction successful: ${imageResult.imageCount} images/frames extracted`)
  }
  
  // Check for common issues
  if (textResult.success && imageResult.success && imageResult.imageCount === 0) {
    recommendations.push('💡 Tip: If PDF has diagrams but no images extracted, check canvas dependency: npm install canvas')
  }
  
  if (textResult.textLength < 100 && imageResult.imageCount > 0) {
    recommendations.push('💡 PDF appears to be image-based - consider OCR for text extraction')
  }
  
  const overallSuccess = textResult.success && (imageResult.success || imageResult.imageCount === 0)
  
  console.log(`\n📊 [PDF TEST] Test Results:`)
  console.log(`  - Text extraction: ${textResult.success ? '✅' : '❌'}`)
  console.log(`  - Image extraction: ${imageResult.success ? '✅' : '❌'}`)
  console.log(`  - Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`)
  
  return {
    textExtraction: textResult,
    imageExtraction: imageResult,
    overallSuccess,
    recommendations,
  }
}

