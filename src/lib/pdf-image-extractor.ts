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
  if (process.env.NODE_ENV === 'development') {
    console.log(`🖼️ [PDF EXTRACTOR] Starting image extraction from: ${filename}`)
  }
  
  try {
    // Use canvas rendering approach - most reliable for capturing all visual content
    // Use require for server-side Node.js compatibility
    let pdfjsLib: any
    let createCanvas: any
    
    try {
      // Use dynamic import for ESM module (pdfjs-dist/legacy/build/pdf.mjs)
      // This is the correct path for pdfjs-dist v4.x
      const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjsLib = pdfjsModule.default || pdfjsModule
      
      // Check version and warn if v5+ (compatibility issues)
      const version = pdfjsLib.version || 'unknown'
      if (version.startsWith('5.')) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  ⚠️ [PDF EXTRACTOR] Detected pdfjs-dist v5 (${version}). Using compatibility mode for node-canvas.`)
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
    if (process.env.NODE_ENV === 'development') {
      console.log(`  📄 [PDF EXTRACTOR] PDF loaded: ${pdfDocument.numPages} pages`)
    }
    
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
        
        // Fix for pdfjs-dist compatibility with node-canvas
        // Apply compatibility layer regardless of version to ensure it works
        // This handles both v4.x edge cases and v5+ strict type checking
        
        const canvasElement = canvas as any
        const canvasContext = context as any
        
        // Always add DOM-like properties to ensure compatibility
        // This is safe even for v4.x and ensures v5+ compatibility
        const canvasProps = {
          nodeName: 'CANVAS',
          tagName: 'CANVAS',
          nodeType: 1, // ELEMENT_NODE
          localName: 'canvas',
          namespaceURI: 'http://www.w3.org/1999/xhtml',
        }
        
        for (const [key, value] of Object.entries(canvasProps)) {
          if (!(key in canvasElement)) {
            Object.defineProperty(canvasElement, key, {
              value: value,
              writable: false,
              enumerable: true,
              configurable: true
            })
          }
        }
        
        // Ensure context has canvas reference (required by pdfjs-dist)
        if (!canvasContext.canvas) {
          Object.defineProperty(canvasContext, 'canvas', {
            value: canvasElement,
            writable: false,
            enumerable: true,
            configurable: true
          })
        }
        
        // Additional compatibility: ensure canvas has proper prototype chain
        // This helps with instanceof checks in pdfjs-dist
        if (!canvasElement.constructor || canvasElement.constructor.name !== 'Canvas') {
          Object.defineProperty(canvasElement, 'constructor', {
            value: { name: 'Canvas' },
            writable: false,
            enumerable: false,
            configurable: true
          })
        }
        
        // Create render context
        // For pdfjs-dist v4.x, use standard format
        // For v5+, the canvas should now pass validation
        const renderContext = {
          canvasContext: canvasContext,
          viewport: viewport,
        }
        
        // Try to render the page
        try {
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
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ [PDF EXTRACTOR] Extracted page ${pageNum} as image (${viewport.width}x${viewport.height}px)`)
          }
        } catch (renderError: any) {
          // If canvas rendering fails, try alternative method
          if (renderError.message && renderError.message.includes('Image or Canvas expected')) {
            // Fallback: Try rendering with a simpler approach (no compatibility layer)
            console.warn(`  ⚠️ [PDF EXTRACTOR] Page ${pageNum}: Canvas rendering failed, trying simplified approach...`)
            
            try {
              // Create a fresh canvas without compatibility layer
              const simpleCanvas = createCanvas(width, height)
              const simpleContext = simpleCanvas.getContext('2d')
              
              // Fill white background
              simpleContext.fillStyle = 'white'
              simpleContext.fillRect(0, 0, width, height)
              
              // Try rendering with minimal context - sometimes this works when the full compatibility layer doesn't
              const simpleRenderContext: any = {
                canvasContext: simpleContext,
                viewport: viewport,
              }
              
              // Try to render
              const simpleRenderTask = page.render(simpleRenderContext)
              await simpleRenderTask.promise
              
              // Convert to base64
              const base64 = simpleCanvas.toDataURL('image/png').split(',')[1]
              
              extractedImages.push({
                image_data_b64: base64,
                page: pageNum,
                width: viewport.width,
                height: viewport.height,
                type: 'png',
              })
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`  ✅ [PDF EXTRACTOR] Extracted page ${pageNum} using simplified method`)
              }
            } catch (altError: any) {
              // If simplified approach also fails, log detailed diagnostics
              console.error(`  ❌ [PDF EXTRACTOR] Page ${pageNum}: All extraction methods failed`)
              console.error(`     Original error: ${renderError.message}`)
              console.error(`     Alternative error: ${altError?.message || altError}`)
              console.error(`     pdfjs-dist version: ${pdfjsLib.version || 'unknown'}`)
              console.error(`     Canvas library: ${createCanvas ? 'available' : 'missing'}`)
              
              // Still create a placeholder entry so the page isn't completely skipped
              // This allows diagram analysis to proceed even without the image
              if (process.env.NODE_ENV === 'development') {
                console.warn(`  ⚠️ [PDF EXTRACTOR] Page ${pageNum}: Creating placeholder entry (no image data)`)
              }
              
              // Don't add placeholder - let the diagram analyzer work with text-only
              // extractedImages.push({
              //   image_data_b64: '', // Empty - will be handled by diagram analyzer
              //   page: pageNum,
              //   width: viewport.width,
              //   height: viewport.height,
              //   type: 'placeholder',
              // })
            }
          } else {
            // Log other errors
            console.error(`  ❌ [PDF EXTRACTOR] Error processing page ${pageNum}:`, renderError.message)
            if (renderError.stack) {
              console.error(`     Stack: ${renderError.stack}`)
            }
          }
        }
      } catch (pageError: any) {
        // Catch any other errors
        console.error(`  ❌ [PDF EXTRACTOR] Unexpected error processing page ${pageNum}:`, pageError.message)
        if (pageError.stack) {
          console.error(`     Stack: ${pageError.stack}`)
        }
        continue
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`  ✅ [PDF EXTRACTOR] Extracted ${extractedImages.length} page images from ${pdfDocument.numPages} pages`)
      console.log(`  ℹ️ [PDF EXTRACTOR] Note: Each page is captured as a full image, including all diagrams and figures`)
    }
    
    return extractedImages
    
  } catch (error: any) {
    console.error(`  ❌ [PDF EXTRACTOR] Error extracting images from ${filename}:`, error.message || error)
    console.error(`  ⚠️ [PDF EXTRACTOR] This may be due to missing canvas dependencies or PDF format issues`)
    return []
  }
}

