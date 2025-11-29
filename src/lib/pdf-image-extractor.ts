/**
 * PDF Image Extractor
 * 
 * Extracts embedded images, diagrams, and figures from PDF documents
 * Uses pdf-extract-image library which extracts actual image objects from PDFs
 * (doesn't render pages - only extracts embedded images)
 */

import { extractImagesFromPdf } from 'pdf-extract-image'

interface ExtractedImage {
  image_data_b64: string
  page: number
  width: number
  height: number
  x?: number
  y?: number
  type?: string
}

export async function extractImagesFromPDF(
  buffer: Buffer,
  filename: string
): Promise<ExtractedImage[]> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🖼️ [PDF EXTRACTOR] Starting image extraction from: ${filename}`)
  }
  
  try {
    // Try pdf-extract-image library first - extracts embedded images directly
    // This doesn't require canvas rendering, just extracts actual image objects from PDF
    let images: Buffer[] = []
    
    try {
      // Convert Buffer to ArrayBuffer as required by the library
      // Create a copy to avoid detached ArrayBuffer issues when buffer is used in parallel
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      images = await extractImagesFromPdf(arrayBuffer as any)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`  📄 [PDF EXTRACTOR] Found ${images.length} embedded images using pdf-extract-image`)
      }
    } catch (extractError: any) {
      // pdf-extract-image may fail with "object not resolved" errors for complex PDFs
      if (process.env.NODE_ENV === 'development') {
        console.warn(`  ⚠️ [PDF EXTRACTOR] pdf-extract-image failed: ${extractError.message}`)
        console.log(`  🔄 [PDF EXTRACTOR] Falling back to pdfjs-dist direct extraction...`)
      }
      
      // Fallback: Use pdfjs-dist to extract images directly
      images = await extractImagesWithPdfjs(buffer, filename)
    }
    
    if (images.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`  ⚠️ [PDF EXTRACTOR] No embedded images found in PDF. PDF may contain only text/drawings.`)
        console.log(`  ℹ️ [PDF EXTRACTOR] Note: This only extracts embedded image objects, not rendered pages or vector graphics.`)
      }
      return []
    }
    
    // Convert PNG buffers to base64 and assign page numbers
    // Note: pdf-extract-image doesn't provide page numbers, so we'll need to infer them
    // For now, we'll assign them sequentially or try to extract from pdfjs-dist
    const extractedImages: ExtractedImage[] = []
    
    // Try to get page information from pdfjs-dist
    let pageInfo: { [key: number]: number } = {}
    try {
      const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const pdfjsLib = pdfjsModule.default || pdfjsModule
      
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        verbosity: 0,
      })
      
      const pdfDocument = await loadingTask.promise
      
      // Try to match images to pages by checking which page they appear on
      // This is approximate - we'll assign images sequentially for now
      const imagesPerPage = Math.ceil(images.length / pdfDocument.numPages)
      
      for (let i = 0; i < images.length; i++) {
        const pageNum = Math.min(Math.floor(i / imagesPerPage) + 1, pdfDocument.numPages)
        pageInfo[i] = pageNum
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`  📄 [PDF EXTRACTOR] PDF has ${pdfDocument.numPages} pages`)
      }
    } catch (pdfjsError) {
      // If we can't get page info, assign sequentially
      if (process.env.NODE_ENV === 'development') {
        console.warn(`  ⚠️ [PDF EXTRACTOR] Could not determine page numbers, assigning sequentially`)
      }
    }
    
    // Helper function to parse PNG dimensions from buffer
    const getPNGDimensions = (buffer: Buffer): { width: number; height: number } => {
      try {
        // PNG header: 8 bytes signature, then IHDR chunk
        // Width is bytes 16-19, height is bytes 20-23 (0-indexed)
        if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
          const width = buffer.readUInt32BE(16)
          const height = buffer.readUInt32BE(20)
          return { width, height }
        }
      } catch (e) {
        // If parsing fails, return defaults
      }
      return { width: 800, height: 600 } // Default dimensions
    }
    
    // Convert each image buffer to base64
    for (let i = 0; i < images.length; i++) {
      const imageBuffer = images[i]
      const base64 = imageBuffer.toString('base64')
      
      // Parse actual dimensions from PNG header
      const { width, height } = getPNGDimensions(imageBuffer)
      
      extractedImages.push({
        image_data_b64: base64,
        page: pageInfo[i] || Math.floor(i / 2) + 1, // Approximate page assignment
        width,
        height,
        type: 'png',
      })
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`  ✅ [PDF EXTRACTOR] Extracted image ${i + 1}/${images.length} (${width}x${height}px, ${imageBuffer.length} bytes, page ~${pageInfo[i] || 'unknown'})`)
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`  ✅ [PDF EXTRACTOR] Successfully extracted ${extractedImages.length} images from PDF`)
    }
    
    return extractedImages
    
  } catch (error: any) {
    console.error(`  ❌ [PDF EXTRACTOR] Error extracting images from ${filename}:`, error.message || error)
    console.error(`  ⚠️ [PDF EXTRACTOR] This may be due to PDF format issues or missing dependencies`)
    return []
  }
}

/**
 * Fallback: Extract images directly using pdfjs-dist
 * This is more reliable for complex PDFs that pdf-extract-image can't handle
 */
async function extractImagesWithPdfjs(
  buffer: Buffer,
  filename: string
): Promise<Buffer[]> {
  const images: Buffer[] = []
  
  try {
    const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdfjsLib = pdfjsModule.default || pdfjsModule
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      verbosity: 0,
    })
    
    const pdfDocument = await loadingTask.promise
    
    // Process each page to find embedded images
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum)
        
        // Get operator list to find image operations
        const operatorList = await page.getOperatorList()
        
        // Access common objects where images might be stored
        const commonObjs = pdfDocument.commonObjs
        
        // Try to extract images from common objects
        // This is a simplified approach - we look for image objects in the PDF structure
        if (commonObjs && commonObjs._objs) {
          for (const [key, obj] of Object.entries(commonObjs._objs)) {
            try {
              const imageObj = obj as any
              if (imageObj && imageObj.data) {
                // This might be an image - try to extract it
                const imageData = imageObj.data
                if (imageData && imageData.length > 1000) { // Skip very small images
                  images.push(Buffer.from(imageData))
                }
              }
            } catch (e) {
              // Skip objects that aren't images
            }
          }
        }
      } catch (pageError) {
        // Continue to next page
        if (process.env.NODE_ENV === 'development') {
          console.warn(`  ⚠️ [PDF EXTRACTOR] Error processing page ${pageNum} for image extraction:`, pageError)
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`  📄 [PDF EXTRACTOR] Extracted ${images.length} images using pdfjs-dist fallback`)
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`  ⚠️ [PDF EXTRACTOR] pdfjs-dist fallback also failed:`, error)
    }
  }
  
  return images
}

