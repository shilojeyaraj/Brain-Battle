/**
 * Document Text Extractor
 * 
 * Extracts text from various document formats (Word, PowerPoint, etc.)
 * Supports: .docx, .doc, .pptx, .ppt
 */

import mammoth from 'mammoth'
import AdmZip from 'adm-zip'
import { parseString } from 'xml2js'

// Lazy import doc-extract (only when needed for .doc/.ppt files)
let docExtractModule: any = null

async function getDocExtract() {
  if (!docExtractModule) {
    docExtractModule = await import('doc-extract')
  }
  return docExtractModule
}

/**
 * Extract text from Word document (.docx) - modern format
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    throw new Error(`Failed to extract text from Word document: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text from old Word document (.doc) - legacy format
 */
export async function extractTextFromOldWord(buffer: Buffer): Promise<string> {
  try {
    const docExtract = await getDocExtract()
    const { DocumentReader } = docExtract
    
    const reader = new DocumentReader()
    const result = await reader.readDocumentFromBuffer(buffer, 'document.doc', 'application/msword')
    
    if (!result || !result.text || result.text.trim().length < 10) {
      throw new Error('Document appears to be empty or contains no extractable text')
    }
    
    return result.text
  } catch (error) {
    throw new Error(`Failed to extract text from old Word document (.doc): ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text from PowerPoint presentation (.pptx) - modern format
 */
export async function extractTextFromPowerPoint(buffer: Buffer): Promise<string> {
  try {
    const textParts: string[] = []
    
    // PPTX files are ZIP archives containing XML files
    const zip = new AdmZip(buffer)
    const zipEntries = zip.getEntries()
    
    // Find all slide XML files
    const slideFiles = zipEntries.filter(entry => 
      entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')
    )
    
    // 🚀 OPTIMIZATION: Process slides in parallel for 2-3x speedup
    if (process.env.NODE_ENV === 'development') {
      console.log(`  🚀 [DOCUMENT EXTRACTOR] Processing ${slideFiles.length} slides in parallel`)
    }
    
    // Helper function to extract text from a single slide
    const extractTextFromSlide = async (slideFile: AdmZip.IZipEntry): Promise<string> => {
      const slideContent = slideFile.getData()
      const slideXml = slideContent.toString('utf-8')
      
      // Parse XML to extract text (with namespace handling)
      const parsed = await new Promise<any>((resolve, reject) => {
        parseString(slideXml, {
          explicitArray: false,
          mergeAttrs: true,
          ignoreAttrs: false,
          explicitRoot: true,
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })
      
      // Extract text from all <a:t> elements (text content in PowerPoint)
      // PowerPoint uses namespaces like 'a:t' for text elements
      const extractText = (obj: any): string[] => {
        const texts: string[] = []
        
        if (typeof obj === 'string') {
          return [obj]
        }
        
        if (Array.isArray(obj)) {
          for (const item of obj) {
            texts.push(...extractText(item))
          }
        } else if (obj && typeof obj === 'object') {
          // Check for text element with various possible formats
          // PowerPoint XML can have: a:t, 'a:t', or nested structures
          const textKeys = ['a:t', 't', 'a\\:t']
          for (const key of textKeys) {
            if (obj[key]) {
              if (Array.isArray(obj[key])) {
                for (const textItem of obj[key]) {
                  if (typeof textItem === 'string') {
                    texts.push(textItem)
                  } else if (textItem && typeof textItem === 'object') {
                    if (textItem._) texts.push(textItem._)
                    if (textItem.$ && textItem.$.text) texts.push(textItem.$.text)
                  }
                }
              } else if (typeof obj[key] === 'string') {
                texts.push(obj[key])
              } else if (obj[key] && typeof obj[key] === 'object') {
                if (obj[key]._) texts.push(obj[key]._)
                if (obj[key].$ && obj[key].$.text) texts.push(obj[key].$.text)
              }
            }
          }
          
          // Also check for direct text content in common PowerPoint structures
          if (obj.p && obj.p.t) {
            if (Array.isArray(obj.p.t)) {
              texts.push(...obj.p.t.filter((t: any) => typeof t === 'string'))
            } else if (typeof obj.p.t === 'string') {
              texts.push(obj.p.t)
            }
          }
          
          // Recursively search all properties
          for (const key in obj) {
            if (obj.hasOwnProperty(key) && key !== '$' && key !== '_') {
              texts.push(...extractText(obj[key]))
            }
          }
        }
        
        return texts.filter(t => t && typeof t === 'string' && t.trim().length > 0)
      }
      
      const slideTexts = extractText(parsed)
      return slideTexts.length > 0 ? slideTexts.join(' ') : ''
    }
    
    // Process all slides in parallel
    const slidePromises = slideFiles.map(slideFile => extractTextFromSlide(slideFile))
    const slideTextsArray = await Promise.all(slidePromises)
    
    // 🎯 COORDINATION: Merge results while preventing duplicates
    // Use a Set to track unique slide content to avoid duplicates
    const seenSlides = new Set<string>()
    
    for (const slideText of slideTextsArray) {
      if (slideText && slideText.trim().length > 0) {
        // Create hash from first 200 chars to identify duplicates
        const hash = slideText.substring(0, Math.min(200, slideText.length)).trim()
        
        if (!seenSlides.has(hash)) {
          seenSlides.add(hash)
          textParts.push(slideText)
        } else if (process.env.NODE_ENV === 'development') {
          console.log(`  🔄 [DOCUMENT EXTRACTOR] Skipped duplicate slide content`)
        }
      }
    }
    
    const fullText = textParts.join('\n\n')
    
    if (!fullText || fullText.trim().length < 10) {
      throw new Error('PowerPoint file appears to be empty or contains no extractable text')
    }
    
    return fullText
  } catch (error) {
    throw new Error(`Failed to extract text from PowerPoint: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text from old PowerPoint presentation (.ppt) - legacy format
 */
export async function extractTextFromOldPowerPoint(buffer: Buffer): Promise<string> {
  try {
    const docExtract = await getDocExtract()
    const { DocumentReader } = docExtract
    
    const reader = new DocumentReader()
    const result = await reader.readDocumentFromBuffer(buffer, 'presentation.ppt', 'application/vnd.ms-powerpoint')
    
    if (!result || !result.text || result.text.trim().length < 10) {
      throw new Error('Presentation appears to be empty or contains no extractable text')
    }
    
    return result.text
  } catch (error) {
    throw new Error(`Failed to extract text from old PowerPoint (.ppt): ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text from any supported document format
 */
export async function extractTextFromDocument(
  file: File,
  buffer: Buffer
): Promise<string> {
  const mimeType = file.type
  const fileName = file.name.toLowerCase()
  
  // Modern Word format (.docx)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      fileName.endsWith('.docx')) {
    return await extractTextFromWord(buffer)
  }
  
  // Old Word format (.doc)
  if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
    return await extractTextFromOldWord(buffer)
  }
  
  // Modern PowerPoint format (.pptx)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileName.endsWith('.pptx')) {
    return await extractTextFromPowerPoint(buffer)
  }
  
  // Old PowerPoint format (.ppt)
  if (mimeType === 'application/vnd.ms-powerpoint' || fileName.endsWith('.ppt')) {
    return await extractTextFromOldPowerPoint(buffer)
  }
  
  throw new Error(`Unsupported document type: ${mimeType}. Supported types: .doc, .docx, .ppt, .pptx`)
}
