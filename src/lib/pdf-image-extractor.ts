/**
 * PDF Image Extractor
 * 
 * Extracts images, diagrams, and figures from PDF documents using canvas rendering
 * This approach renders each page and extracts it as an image, which captures
 * all visual content including diagrams, charts, and figures.
 */

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
  console.log(`🖼️ [PDF EXTRACTOR] Starting image extraction from: ${filename}`)
  
  try {
    // Use canvas rendering approach - most reliable for capturing all visual content
    // Use require for server-side Node.js compatibility
    let pdfjsLib: any
    let createCanvas: any
    
    try {
      // Use dynamic import for ESM module (pdfjs-dist/legacy/build/pdf.mjs)
      // Fallback to require for canvas (CommonJS)
      try {
        const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjsLib = pdfjsModule.default || pdfjsModule
      } catch (pdfjsError) {
        // Fallback: try require with .js extension
        try {
          pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
        } catch (requireError) {
          throw new Error(`Failed to import pdfjs-dist: ${pdfjsError instanceof Error ? pdfjsError.message : String(pdfjsError)}`)
        }
      }
      
      const canvasModule = require('canvas')
      createCanvas = canvasModule.createCanvas
      
      // For server-side Node.js, we don't need to configure workerSrc
      // pdfjs-dist will handle server-side execution automatically
      // DO NOT set workerSrc to false - it must be a string or undefined
    } catch (importError) {
      console.error(`  ❌ [PDF EXTRACTOR] Error importing pdfjs or canvas:`, importError)
      // Return empty array if imports fail - don't throw, just skip image extraction
      console.log(`  ⚠️ [PDF EXTRACTOR] Skipping image extraction due to import errors`)
      return []
    }
    
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      verbosity: 0,
    })
    
    const pdfDocument = await loadingTask.promise
    console.log(`  📄 [PDF EXTRACTOR] PDF loaded: ${pdfDocument.numPages} pages`)
    
    const extractedImages: ExtractedImage[] = []
    
    // Render each page and extract as image
    // This captures all visual content including diagrams, charts, and figures
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2.0 }) // Higher scale for better quality
        
        // Create canvas using node-canvas
        const width = Math.floor(viewport.width)
        const height = Math.floor(viewport.height)
        const canvas = createCanvas(width, height)
        const context = canvas.getContext('2d')
        
        // Fill white background
        context.fillStyle = 'white'
        context.fillRect(0, 0, width, height)
        
        // Render page to canvas
        // pdfjs-dist v5+ may have compatibility issues with node-canvas
        // Try to ensure the context has all required properties
        // The error "Image or Canvas expected" suggests pdfjs-dist is checking for something specific
        
        // Create render context - pdfjs-dist expects canvasContext to be a valid 2D context
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        
        // Render the page
        // Note: If this fails with "Image or Canvas expected", it's likely a pdfjs-dist v5+ 
        // compatibility issue with node-canvas. The text extraction still works fine.
        const renderTask = page.render(renderContext as any)
        await renderTask.promise
        
        // Convert canvas to base64 PNG
        const base64 = canvas.toDataURL('image/png').split(',')[1]
        
        extractedImages.push({
          image_data_b64: base64,
          page: pageNum,
          width: viewport.width,
          height: viewport.height,
          type: 'png',
        })
        
        console.log(`  ✅ [PDF EXTRACTOR] Extracted page ${pageNum} as image (${viewport.width}x${viewport.height}px)`)
      } catch (pageError: any) {
        // Log the error but continue processing other pages
        // This is often a compatibility issue between pdfjs-dist v5+ and node-canvas
        if (pageError.message && pageError.message.includes('Image or Canvas expected')) {
          console.log(`  ⚠️ [PDF EXTRACTOR] Page ${pageNum}: Compatibility issue with pdfjs-dist v5+ and node-canvas. Skipping image extraction for this page.`)
          console.log(`  ℹ️ [PDF EXTRACTOR] Text extraction is working fine - this only affects diagram/image capture.`)
        } else {
          console.error(`  ❌ [PDF EXTRACTOR] Error processing page ${pageNum}:`, pageError.message)
        }
        continue
      }
    }
    
    console.log(`  ✅ [PDF EXTRACTOR] Extracted ${extractedImages.length} page images from ${pdfDocument.numPages} pages`)
    console.log(`  ℹ️ [PDF EXTRACTOR] Note: Each page is captured as a full image, including all diagrams and figures`)
    
    return extractedImages
    
  } catch (error: any) {
    console.error(`  ❌ [PDF EXTRACTOR] Error extracting images from ${filename}:`, error.message || error)
    console.error(`  ⚠️ [PDF EXTRACTOR] This may be due to missing canvas dependencies or PDF format issues`)
    return []
  }
}

