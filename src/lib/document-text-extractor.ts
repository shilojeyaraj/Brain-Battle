/**
 * Document Text Extractor
 * 
 * Extracts text from various document formats (Word, PowerPoint, etc.)
 */

import mammoth from 'mammoth'
import AdmZip from 'adm-zip'
import { parseString } from 'xml2js'

/**
 * Extract text from Word document (.docx)
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
 * Extract text from PowerPoint presentation (.pptx)
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
    
    // Extract text from each slide
    for (const slideFile of slideFiles) {
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
      if (slideTexts.length > 0) {
        textParts.push(slideTexts.join(' '))
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
 * Extract text from any supported document format
 */
export async function extractTextFromDocument(
  file: File,
  buffer: Buffer
): Promise<string> {
  const mimeType = file.type
  
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // Word document (.docx)
    return await extractTextFromWord(buffer)
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint'
  ) {
    // PowerPoint presentation (.pptx or .ppt)
    return await extractTextFromPowerPoint(buffer)
  } else {
    throw new Error(`Unsupported document type: ${mimeType}`)
  }
}

