import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
// NOTE: For robustness we avoid pdf-extract-image fallbacks in this route.
// All PDF parsing should go through the unified extractor, which applies
// the serverless pdfjs config (workerSrc='' and worker fetch disabled).
import { smartExtractDiagrams } from "@/lib/pdf-smart-extractor"
import { DiagramAnalyzerAgent } from "@/lib/agents/diagram-analyzer-agent"
import { 
  enrichDiagramsWithWebImages, 
  enrichWithYouTubeVideos, 
  generateEmbeddingsForNotes 
} from "@/lib/utils/parallel-enrichment"
import { validateFile } from "@/lib/validation/schemas"
import { sanitizeError, createSafeErrorResponse } from "@/lib/utils/error-sanitizer"
import { createAIClient } from "@/lib/ai/client-factory"
import { extractTextFromDocument } from "@/lib/document-text-extractor"
import type { AIChatMessage } from "@/lib/ai/types"
import { initializeBrowserPolyfills } from "@/lib/polyfills/browser-apis"
import { createHash, randomUUID } from "crypto"
import { getPromptRules } from "@/lib/prompt/rules-loader"
import { distillContent } from "@/lib/prompt/distillation"
import { getOrSetDistillation } from "@/lib/prompt/distillation-cache"

// Ensure this route runs in the Node.js runtime (needed for pdfjs + Supabase client libs)
export const runtime = 'nodejs'

// CRITICAL: Configure global pdfjs worker options BEFORE any PDF parsing code runs
// This must be at module level (top of file) so it runs before pdf-parse imports pdfjs-dist
// pdf-parse internally uses pdfjs-dist, and pdfjs-dist checks for workers during import
// Use empty string to force fake worker mode (no worker file needed, works in serverless)
if (typeof globalThis !== 'undefined') {
  const globalObj: any = globalThis as any
  if (!globalObj.GlobalWorkerOptions) {
    globalObj.GlobalWorkerOptions = {}
  }
  // Empty string = fake worker (no actual worker file, runs in main thread)
  // This is the ONLY way that works in Node.js ESM loader (doesn't support https: protocol)
  globalObj.GlobalWorkerOptions.workerSrc = ''
  globalObj.GlobalWorkerOptions.disableWorker = true
}

/**
 * Repair truncated JSON by closing open structures
 * This handles cases where the AI response is cut off due to token limits
 */
function repairTruncatedJSON(json: string): string {
  let repaired = json.trim()
  
  // Track open structures
  const stack: string[] = []
  let inString = false
  let escapeNext = false
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i]
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\' && inString) {
      escapeNext = true
      continue
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }
    
    if (inString) continue
    
    if (char === '{') stack.push('}')
    else if (char === '[') stack.push(']')
    else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop()
      }
    }
  }
  
  // If we're in a string, close it
  if (inString) {
    // Find the last complete key-value or array item
    // Remove partial content after the last complete item
    const lastGoodPoint = findLastCompletePoint(repaired)
    if (lastGoodPoint > 0) {
      repaired = repaired.substring(0, lastGoodPoint)
      // Re-analyze the stack
      stack.length = 0
      inString = false
      for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i]
        if (escapeNext) { escapeNext = false; continue }
        if (char === '\\' && inString) { escapeNext = true; continue }
        if (char === '"' && !escapeNext) { inString = !inString; continue }
        if (inString) continue
        if (char === '{') stack.push('}')
        else if (char === '[') stack.push(']')
        else if (char === '}' || char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop()
        }
      }
    } else {
      repaired += '"'
    }
  }
  
  // Remove trailing incomplete content (partial key-value pairs)
  repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '')
  repaired = repaired.replace(/,\s*$/, '')
  
  // Close all open structures
  while (stack.length > 0) {
    repaired += stack.pop()
  }
  
  return repaired
}

/**
 * Find the last point where the JSON is complete (after a closing quote, bracket, or brace)
 */
function findLastCompletePoint(json: string): number {
  // Look for the last complete value ending
  const patterns = [
    /"\s*}\s*,?\s*$/,  // End of object
    /"\s*]\s*,?\s*$/,  // End of array
    /"\s*,\s*$/,       // End of string value
    /true\s*,?\s*$/,   // Boolean
    /false\s*,?\s*$/,  // Boolean
    /null\s*,?\s*$/,   // Null
    /\d\s*,?\s*$/,     // Number
  ]
  
  for (let i = json.length - 1; i > json.length - 500 && i > 0; i--) {
    const substr = json.substring(0, i)
    // Check if this is a valid ending point
    if (patterns.some(p => p.test(substr))) {
      // Find the actual end of the match (before trailing comma/whitespace)
      return i
    }
  }
  
  return 0
}

export async function POST(req: NextRequest) {
  // CRITICAL: Initialize browser API polyfills BEFORE any PDF parsing
  // This must happen before pdf-parse or pdfjs-dist are imported/used
  initializeBrowserPolyfills()

  const sessionStartTime = Date.now()
  const sessionId = randomUUID()
  const { ProgressLogger } = await import('@/lib/domain-memory/progress-logger')
  const { FeatureFlags } = await import('@/lib/config/feature-flags')
  const errorsEncountered: string[] = []
  let totalTokensUsed = 0
  const t = (label: string) => console.log(`⏱️ [NOTES] ${label}: ${Date.now() - sessionStartTime}ms`)

  console.log("🚀 [NOTES API] Starting notes generation...")
  try {
    // SECURITY: Get userId from session cookie, not form data
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(req)
    t('auth')
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      )
    }

    const form = await req.formData()
    const files = form.getAll("files") as File[]
    let topic = form.get("topic") as string
    const difficulty = form.get("difficulty") as string
    let instructions = form.get("instructions") as string
    const studyContextStr = form.get("studyContext") as string
    let studyContext = null
    if (studyContextStr) {
      try {
        studyContext = JSON.parse(studyContextStr)
      } catch (e) {
        console.log("⚠️ [NOTES API] Failed to parse study context:", e)
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log("📋 [NOTES API] Request details:")
      console.log(`  - Topic: ${topic}`)
      console.log(`  - Difficulty: ${difficulty}`)
      console.log(`  - Files: ${files.length}`)
      files.forEach((file, index) => {
        console.log(`    ${index + 1}. ${file.name} (${file.type}, ${file.size} bytes)`)
      })
    }
    
    if (!files.length) {
      console.log("❌ [NOTES API] No files provided")
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Check document limit before processing
    const { checkDocumentLimit } = await import('@/lib/subscription/limits')
    const docLimit = await checkDocumentLimit(userId)
    
    if (!docLimit.allowed) {
      console.warn(`⚠️ [NOTES API] Document limit reached: ${docLimit.count}/${docLimit.limit}`)
      return NextResponse.json(
        { 
          error: `You've reached your monthly limit of ${docLimit.limit} documents. Upgrade to Pro for ${docLimit.limit === 15 ? 50 : 'more'} documents per month!`,
          requiresPro: true,
          count: docLimit.count,
          limit: docLimit.limit,
          remaining: docLimit.remaining
        },
        { status: 403 }
      )
    }
    
    console.log(`📊 [NOTES API] Document limit check: ${docLimit.count}/${docLimit.limit} (${docLimit.remaining} remaining)`)

    // SECURITY: Validate and sanitize inputs
    try {
      // Validate difficulty
      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        return NextResponse.json(
          { error: 'Invalid difficulty. Must be easy, medium, or hard.' },
          { status: 400 }
        )
      }

      // Sanitize topic (max 500 chars, trim)
      if (topic && typeof topic === 'string') {
        topic = topic.trim().slice(0, 500)
      }

      // Sanitize instructions (max 1000 chars, trim)
      if (instructions && typeof instructions === 'string') {
        instructions = instructions.trim().slice(0, 1000)
      }

      // SECURITY: Validate all files
      for (const file of files) {
        if (!file || !file.name || typeof file.size !== 'number') {
          return NextResponse.json(
            { error: 'Invalid file object' },
            { status: 400 }
          )
        }

        const validation = validateFile(file)
        if (!validation.valid) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ [NOTES API] File validation failed for ${file.name}:`, validation.error)
          }
          return NextResponse.json(
            { error: validation.error || 'Invalid file' },
            { status: 400 }
          )
        }

        // Additional security: Check file size (5MB limit - optimized for cost control)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds maximum size of 5MB. For larger files, consider splitting them or upgrading to Pro.` },
            { status: 400 }
          )
        }

        // Check file type by MIME type and extension (fallback for browsers that don't send correct MIME types)
        const allowedMimeTypes = [
          'application/pdf',
          'text/plain',
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/vnd.ms-powerpoint', // .ppt
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        ]
        
        // Also check file extension as fallback (some browsers don't send correct MIME types)
        const fileName = file.name.toLowerCase()
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.md']
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
        
        if ((!file.type || !allowedMimeTypes.includes(file.type)) && !hasValidExtension) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ [NOTES API] File type not allowed: ${file.name} (MIME: ${file.type || 'unknown'})`)
          }
          return NextResponse.json(
            { error: `File type not allowed: ${file.name}. Supported types: PDF, DOC, DOCX, PPT, PPTX, TXT, MD` },
            { status: 400 }
          )
        }

        // 🛡️ SECURITY: Validate file content by checking magic numbers (prevents MIME type spoofing)
        const { validateFileContent } = await import('@/lib/security/input-validation')
        const contentValidation = await validateFileContent(file)
        if (!contentValidation.valid) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ [NOTES API] File content validation failed for ${file.name}:`, contentValidation.error)
          }
          return NextResponse.json(
            { error: contentValidation.error || `File content validation failed for ${file.name}. Please ensure the file is not corrupted or malicious.` },
            { status: 400 }
          )
        }
      }
    } catch (validationError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [NOTES API] Validation error:', validationError)
      }
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid input data' },
        { status: 400 }
      )
    }

    // Deduplicate files by name + size (same file uploaded multiple times)
    const uniqueFiles: File[] = []
    const seenFiles = new Set<string>()
    const duplicateFiles: string[] = []
    
    for (const file of files) {
      // Create unique key: name + size (handles same file uploaded twice)
      const fileKey = `${file.name}:${file.size}`
      
      if (seenFiles.has(fileKey)) {
        duplicateFiles.push(file.name)
        if (process.env.NODE_ENV === 'development') {
          console.log(`  ⚠️ [NOTES API] Skipping duplicate file: ${file.name} (${file.size} bytes)`)
        }
        continue
      }
      
      seenFiles.add(fileKey)
      uniqueFiles.push(file)
    }
    
    if (duplicateFiles.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`  ℹ️ [NOTES API] Removed ${duplicateFiles.length} duplicate file(s): ${duplicateFiles.join(', ')}`)
    }
    
    if (uniqueFiles.length === 0) {
      console.log("❌ [NOTES API] All files were duplicates")
      return NextResponse.json({ 
        error: "All uploaded files were duplicates. Please upload unique files." 
      }, { status: 400 })
    }

    // 1) Check if user has Pro subscription for image analysis (Pro-only feature)
    const { validateImageAnalysis } = await import('@/lib/security/subscription-validation')
    const imageAnalysisValidation = await validateImageAnalysis(userId)
    const canAnalyzeImages = imageAnalysisValidation.allowed
    
    if (!canAnalyzeImages && process.env.NODE_ENV === 'development') {
      console.log(`  ℹ️ [NOTES API] Image analysis disabled for free tier user. Upgrade to Pro to enable AI-powered diagram analysis.`)
    }

    // 1) Process files in parallel - extract text and images simultaneously
    const fileContents: string[] = []
    const documentMetadata: { fileName: string; contentHash?: string; fileSize: number; fileType: string }[] = []
    const documentIds: string[] = []
    // Only extract images if user has Pro subscription (uses expensive GPT-4o Vision API)
    const extractedImages: { image_data_b64: string; page: number; width?: number; height?: number }[] = []
    const fileNames: string[] = []
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📁 [NOTES API] Processing ${uniqueFiles.length} unique files in parallel...`)
    }
    
    // Helper function to extract text and images from a single file
    // 🚀 OPTIMIZATION: For PDFs, extract both text and images in a single scan
    const extractTextAndImagesFromFile = async (file: File, buffer: Buffer): Promise<{ textContent: string; fileName: string; images: { image_data_b64: string; page: number; width?: number; height?: number }[] }> => {
      let textContent = ""
      let images: { image_data_b64: string; page: number; width?: number; height?: number }[] = []
      
      if (file.type === "text/plain") {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📝 [NOTES API] Processing ${file.name} as plain text file`)
        }
        textContent = buffer.toString('utf-8')
      } else if (file.type === "application/pdf") {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📄 [NOTES API] Processing ${file.name} as PDF file (using pdf-parse)`)
        }
        
        try {
          // Use pdf-parse - simple API, works on Vercel without any worker configuration
          const { extractPDFText } = await import('@/lib/pdf-parser')
          const pdfData = await extractPDFText(buffer)
          
          textContent = pdfData.text || ''
          
          // Only extract images if user has Pro subscription (uses expensive GPT-4o Vision API)
          if (canAnalyzeImages) {
            try {
              // Use the unified extractor to get both text and images in one pass
              const { extractPDFTextAndImages } = await import('@/lib/pdf-unified-extractor')
              const pdfContent = await extractPDFTextAndImages(buffer, file.name)
              textContent = pdfContent.text || textContent // Use unified text if available
              images = pdfContent.images || []
              
              if (process.env.NODE_ENV === 'development' && images.length > 0) {
                console.log(`  🖼️ [NOTES API] Extracted ${images.length} images from ${file.name}`)
              }
            } catch (imageError) {
              // If image extraction fails, continue with text-only (non-blocking)
              if (process.env.NODE_ENV === 'development') {
                console.warn(`  ⚠️ [NOTES API] Image extraction failed for ${file.name}, continuing with text only:`, imageError)
              }
              images = []
            }
          } else {
            images = [] // Free tier: no image extraction
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from ${file.name} (${pdfData.pages} pages)`)
          }
          
          if (!textContent || textContent.trim().length < 100) {
            throw new Error(`PDF parsing returned insufficient content (${textContent.length} characters).`)
          }
        } catch (pdfError) {
          throw new Error(`Failed to parse PDF "${file.name}". Error: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`)
        }
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword' ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.name.toLowerCase().endsWith('.docx')
      ) {
        // Word document (.docx or .doc) - no images
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📝 [NOTES API] Processing ${file.name} as Word document`)
        }
        try {
          textContent = await extractTextFromDocument(file, buffer)
          if (!textContent || textContent.trim().length < 10) {
            throw new Error(`Word document "${file.name}" appears to be empty.`)
          }
          if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from ${file.name}`)
          }
        } catch (wordError) {
          throw new Error(`Failed to parse Word document "${file.name}". Error: ${wordError instanceof Error ? wordError.message : String(wordError)}`)
        }
        images = [] // Word documents don't have extractable images
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.type === 'application/vnd.ms-powerpoint' ||
        file.name.toLowerCase().endsWith('.ppt') ||
        file.name.toLowerCase().endsWith('.pptx')
      ) {
        // PowerPoint presentation (.pptx or .ppt) - no images
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📊 [NOTES API] Processing ${file.name} as PowerPoint presentation`)
        }
        try {
          textContent = await extractTextFromDocument(file, buffer)
          if (!textContent || textContent.trim().length < 10) {
            throw new Error(`PowerPoint presentation "${file.name}" appears to be empty.`)
          }
          if (process.env.NODE_ENV === 'development') {
            console.log(`  ✅ [NOTES API] Extracted ${textContent.length} characters from ${file.name}`)
          }
        } catch (pptError) {
          throw new Error(`Failed to parse PowerPoint "${file.name}". Error: ${pptError instanceof Error ? pptError.message : String(pptError)}`)
        }
        images = [] // PowerPoint files don't have extractable images in our current implementation
      } else if (file.type?.startsWith('text/') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`  📝 [NOTES API] Processing ${file.name} as text file (${file.type})`)
        }
        textContent = buffer.toString('utf-8')
        if (!textContent || textContent.trim().length < 10) {
          throw new Error(`Text file "${file.name}" appears to be empty.`)
        }
        images = [] // Text files don't have images
      } else {
        throw new Error(`Unsupported file type: ${file.type}. Supported types: PDF, DOC, DOCX, PPT, PPTX, TXT`)
      }
      
      return { textContent, fileName: file.name, images }
    }
    
    // 🚀 OPTIMIZATION: Process all files in parallel
    // For PDFs, text and images are extracted together in a single scan (no duplicate loading!)
    const fileProcessingStart = Date.now()
    const fileProcessingPromises = uniqueFiles.map(async (file, index) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n📄 [NOTES API] Processing file ${index + 1}/${uniqueFiles.length}: ${file.name}`)
      }
      
      const buffer = Buffer.from(await file.arrayBuffer())
      // Compute hash early for document tracking
      const contentHash = createHash('sha256').update(buffer).digest('hex')
      
      // Extract text and images together (for PDFs, this is a single scan)
      const result = await extractTextAndImagesFromFile(file, buffer)
      
      return {
        textContent: result.textContent,
        fileName: result.fileName,
        images: result.images,
        meta: {
          contentHash,
          fileSize: file.size,
          fileType: file.type
        }
      }
    })
    
    // Wait for all files to be processed
    const fileResults = await Promise.allSettled(fileProcessingPromises)
    
    // Process results and collect valid content
    let hasValidContent = false
    for (const result of fileResults) {
      if (result.status === 'fulfilled') {
        const { textContent, fileName, images, meta } = result.value
        
        if (textContent && textContent.trim().length > 0) {
          fileContents.push(textContent)
          fileNames.push(fileName)
          if (textContent.trim().length >= 100) {
            hasValidContent = true
          }
        }
        
        if (meta?.contentHash) {
          documentMetadata.push({
            fileName,
            contentHash: meta.contentHash,
            fileSize: meta.fileSize ?? 0,
            fileType: meta.fileType ?? ''
          })
        } else {
          documentMetadata.push({
            fileName,
            fileSize: meta?.fileSize ?? 0,
            fileType: meta?.fileType ?? ''
          })
        }
        
        if (images && images.length > 0) {
          extractedImages.push(...images)
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error(`  ❌ [NOTES API] Error processing file:`, result.reason)
        }
        // Re-throw critical errors
        if (result.reason instanceof Error && result.reason.message.includes('Failed to parse')) {
          throw result.reason
        }
      }
    }
    
    t('file-extraction')
    
    // CRITICAL: Validate that we have actual document content before proceeding
    if (!hasValidContent || fileContents.length === 0 || fileContents.every(content => content.trim().length < 100)) {
      const totalContent = fileContents.join('').trim().length
      console.error(`  ❌ [NOTES API] CRITICAL: No valid content extracted from documents. Total content length: ${totalContent} characters`)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to extract meaningful content from the uploaded documents. Please ensure the files are not corrupted, password-protected, or image-only PDFs. Extracted only ${totalContent} characters total.` 
      }, { status: 400 })
    }
    
    const totalContentLength = fileContents.join('').length
    console.log(`  ✅ [NOTES API] Successfully extracted ${totalContentLength} total characters from ${fileContents.length} files`)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n📊 [NOTES API] File processing summary:`)
      console.log(`  - Files received: ${files.length}`)
      console.log(`  - Unique files processed: ${uniqueFiles.length}`)
      if (duplicateFiles.length > 0) {
        console.log(`  - Duplicate files skipped: ${duplicateFiles.length} (${duplicateFiles.join(', ')})`)
      }
      console.log(`  - File contents extracted: ${fileContents.length}`)
      console.log(`  - Images extracted: ${extractedImages.length}`)
      console.log(`  - Total content length: ${totalContentLength} characters`)
    }

    // 2a) CACHE HIT: Check if notes already exist for this exact document+params combo
    const primaryHash = documentMetadata[0]?.contentHash
    if (primaryHash) {
      try {
        const instructionsHash = createHash('sha256')
          .update(JSON.stringify({ topic, difficulty, instructions, studyContext: studyContext, fileNames }))
          .digest('hex')
        const adminClient = createAdminClient()
        const { data: cached } = await adminClient
          .from('study_notes_cache')
          .select('notes_json')
          .eq('user_id', userId)
          .eq('document_id', primaryHash)
          .eq('instructions_hash', instructionsHash)
          .maybeSingle()
        if (cached?.notes_json) {
          const cacheTime = Date.now() - sessionStartTime
          console.log(`⚡ [NOTES API] Cache hit! Returning cached notes in ${cacheTime}ms (skipped AI call)`)
          return NextResponse.json({
            success: true,
            notes: cached.notes_json,
            cached: true,
            processedFiles: fileNames.length,
            fileNames,
            fileContents: fileContents.length,
          })
        }
      } catch (cacheErr) {
        console.warn('⚠️ [NOTES API] Cache lookup failed (non-critical):', cacheErr)
      }
    }

    // 2b) Track documents in database (non-blocking - runs in background while AI call proceeds)
    const documentTrackingPromise = (async () => {
      if (documentMetadata.length === 0) return
      try {
        const adminClient = createAdminClient()
        const { data: existingUser, error: userCheckError } = await adminClient
          .from('users').select('id').eq('id', userId).single()
        if (userCheckError || !existingUser) {
          const { ensureUserExists } = await import('@/lib/utils/ensure-user-exists')
          await ensureUserExists(userId)
        }
        for (const meta of documentMetadata) {
          if (!meta.contentHash) continue
          const payload = {
            user_id: userId,
            original_name: meta.fileName,
            filename: meta.fileName,
            storage_path: '',
            file_url: '',
            uploaded_by: userId,
            file_type: meta.fileType || 'application/octet-stream',
            file_size: meta.fileSize || 0,
            content_hash: meta.contentHash
          }
          const { data: docRow, error: docError } = await adminClient
            .from('documents')
            .upsert(payload, { onConflict: 'user_id,content_hash', ignoreDuplicates: false })
            .select('id').maybeSingle()
          if (!docError && docRow?.id) {
            documentIds.push(docRow.id)
          } else if (docError) {
            errorsEncountered.push(`Document upsert failed for ${meta.fileName}: ${docError.message}`)
          } else {
            const { data: existing } = await adminClient
              .from('documents').select('id')
              .eq('user_id', userId).eq('content_hash', meta.contentHash).maybeSingle()
            if (existing?.id) documentIds.push(existing.id)
          }
        }
      } catch (err) {
        console.error('⚠️ [NOTES API] Document tracking error (non-critical):', err)
      }
    })()

    // 3) Analyze content complexity and education level
    
    // Build study context instructions
    let contextInstructions = ""
    if (studyContext) {
      contextInstructions = "\n\nSTUDY PREFERENCES:\n"
      if (studyContext.studyFocus) {
        contextInstructions += `- Study Focus: ${studyContext.studyFocus}\n`
      }
      if (studyContext.questionTypes && studyContext.questionTypes.length > 0) {
        contextInstructions += `- Preferred Question Types: ${studyContext.questionTypes.join(', ')}\n`
      }
      if (studyContext.difficulty) {
        contextInstructions += `- Difficulty Level: ${studyContext.difficulty}\n`
      }
      if (studyContext.specialInstructions) {
        contextInstructions += `- Special Instructions: ${studyContext.specialInstructions}\n`
      }
      contextInstructions += "\nPlease tailor the study notes to these preferences while still basing everything on the document content.\n"
    }

    // Auto-generate topic from document content if not provided
    let studyTopic = topic || instructions
    if (!studyTopic) {
      // Extract first few lines from documents to generate a topic
      const firstDocument = fileContents[0] || ''
      const firstLines = firstDocument.split('\n').slice(0, 10).join(' ').substring(0, 200)
      studyTopic = `Study materials from uploaded documents: ${firstLines}...`
    }

    
    // Start diagram analysis early (in parallel with notes generation)
    // Only run if user has Pro subscription and images were extracted
    const diagramAnalysisStart = Date.now()
    const diagramAnalysisPromise = canAnalyzeImages && extractedImages.length > 0
      ? (async () => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`\n🖼️ [NOTES API] Starting early diagram analysis (${extractedImages.length} images)...`)
          }
          try {
            const diagramAnalyzer = new DiagramAnalyzerAgent()
            const diagramResult = await diagramAnalyzer.execute({
              documentContent: fileContents.join('\n'),
              fileNames: fileNames,
              topic: topic,
              difficulty: difficulty,
              instructions: instructions,
              studyContext: studyContext,
              extractedImages: extractedImages,
              relevantChunks: [],
              metadata: {
                contentExtraction: {}
              }
            })
            
            if (diagramResult.success && diagramResult.data?.diagrams) {
              const analysisTime = Date.now() - diagramAnalysisStart
              if (process.env.NODE_ENV === 'development') {
                console.log(`  ✅ [NOTES API] Early diagram analysis completed in ${analysisTime}ms: ${diagramResult.data.diagrams.length} diagrams`)
              }
              return diagramResult.data.diagrams
            }
            return []
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`  ⚠️ [NOTES API] Early diagram analysis error:`, error)
            }
            return []
          }
        })()
      : Promise.resolve([])
    
    // Use Moonshot for study notes generation (non-thinking model for speed)
    const aiProvider = 'moonshot' as const
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🤖 [NOTES API] Preparing AI API call...`)
      console.log(`  - Provider: Moonshot (Kimi K2)`)
      console.log(`  - Model: ${process.env.MOONSHOT_MODEL || 'moonshotai/kimi-k2'}`)
      console.log(`  - Temperature: 0.2`)
      console.log(`  - Total document content: ${fileContents.join('').length} characters`)
    }
    
    const notesGenerationStart = Date.now()
    let content: string
    let responseId: string
    let modelUsed: string
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
    let provider: 'moonshot' = 'moonshot'

    // Build compact prompts using shared rules + distillation
    const rules = await getPromptRules()
    const distillKeyParts = [
      fileContents.join("||"),
      instructions || "",
      contextInstructions || "",
      fileNames.join(",") || ""
    ]
    const distilledContent = await getOrSetDistillation(
      distillKeyParts,
      () => distillContent(fileContents, 4000)
    )

    // Streamlined system prompt
    const systemPrompt = `${rules}

Generate study notes as JSON matching notesSchema. Use only provided content. Cite pages.`

    // Compact user prompt
    const userPrompt = `DOCUMENT:
${distilledContent || '[no text extracted]'}

FILES: ${fileNames.join(', ') || 'uploaded files'}
${instructions ? `INSTRUCTIONS: ${instructions}` : ''}
${extractedImages.length > 0 ? `IMAGES: ${extractedImages.length} (reference by page)` : ''}
${contextInstructions ? `CONTEXT: ${contextInstructions}` : ''}

Generate notesSchema JSON:
- Extract ALL formulas with exact notation
- Outline items must be document-specific (headings/examples/formulas)
- Include page refs for facts
- Return valid JSON only`

    // Log prompt details after they're created
    if (process.env.NODE_ENV === 'development') {
      console.log(`  - System prompt length: ${systemPrompt.length} characters`)
      console.log(`  - User prompt length: ${userPrompt.length} characters`)
    }

    // Use Moonshot for study notes generation
    const aiClient = createAIClient('moonshot')
      
    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    const response = await aiClient.chatCompletions(messages, {
      model: process.env.MOONSHOT_MODEL || 'moonshotai/kimi-k2',
      temperature: 0.2,
      responseFormat: 'json_object',
      maxTokens: 12000,
    })

    content = response.content
    responseId = response.id
    modelUsed = response.model
    usage = response.usage
    // MEMORY ARCHITECTURE: Track token usage
    if (usage) {
      totalTokensUsed = (usage.total_tokens || 0) + totalTokensUsed
    }
    // Provider is always 'moonshot' since we're using Moonshot client

    t('ai-call')
    console.log(`✅ [NOTES API] AI call done. Model: ${modelUsed}, Tokens: ${JSON.stringify(usage)}`)

    if (!content) {
      console.log(`❌ [NOTES API] No content in Moonshot response`)
      throw new Error(`No response from Moonshot`)
    }

    console.log(`📝 [NOTES API] Processing Moonshot response...`)
    console.log(`  - Content length: ${content.length} characters`)
    console.log(`  - Content preview: ${content.substring(0, 200)}...`)

    let notesData
    try {
      console.log(`🔍 [NOTES API] Parsing JSON response...`)
      
      // Strip markdown code blocks if present (AI sometimes wraps JSON in ```json ... ```)
      let cleanedContent = content.trim()
      if (cleanedContent.startsWith('```')) {
        // Remove opening ```json or ```
        cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '')
        // Remove closing ```
        cleanedContent = cleanedContent.replace(/\s*```$/i, '')
        cleanedContent = cleanedContent.trim()
        console.log(`  🔧 [NOTES API] Stripped markdown code blocks from response`)
      }
      
      // Try parsing directly first
      try {
        notesData = JSON.parse(cleanedContent)
      } catch (parseError) {
        // JSON is truncated - try to repair it
        console.log(`  ⚠️ [NOTES API] JSON parsing failed, attempting repair...`)
        console.log(`  - Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
        
        // Repair truncated JSON by closing open structures
        const repairedContent = repairTruncatedJSON(cleanedContent)
        
        try {
          notesData = JSON.parse(repairedContent)
          console.log(`  ✅ [NOTES API] JSON repair successful!`)
        } catch (repairError) {
          console.error(`  ❌ [NOTES API] JSON repair failed:`, repairError)
          throw parseError // Throw the original error
        }
      }
      console.log(`✅ [NOTES API] Successfully parsed JSON response`)
      console.log(`  - Title: ${notesData.title || 'No title'}`)
      console.log(`  - Outline items: ${notesData.outline?.length || 0}`)
      console.log(`  - Key terms: ${notesData.key_terms?.length || 0}`)
      console.log(`  - Concepts: ${notesData.concepts?.length || 0}`)
      console.log(`  - Diagrams: ${notesData.diagrams?.length || 0}`)
      console.log(`  - Formulas: ${notesData.formulas?.length || 0}`)
      console.log(`  - Quiz questions: ${notesData.practice_questions?.length || 0}`)
      
      // Post-processing: de-duplicate practice questions by question text (case-insensitive)
      if (Array.isArray(notesData.practice_questions)) {
        const seenQuestions = new Map<string, any>()
        for (const q of notesData.practice_questions as any[]) {
          const key = (q?.question || "").toString().trim().toLowerCase()
          if (!key) continue
          if (!seenQuestions.has(key)) {
            seenQuestions.set(key, q)
          }
        }
        const originalCount = notesData.practice_questions.length
        const deduped = Array.from(seenQuestions.values())
        if (deduped.length !== originalCount) {
          console.warn(
            `  ⚠️ [NOTES API] De-duplicated practice_questions: ${originalCount} → ${deduped.length}`
          )
        }
        notesData.practice_questions = deduped
      }
      
      // Post-processing validation: Check for missing content and generic content
      if (process.env.NODE_ENV === 'development') {
        const formulaCount = notesData.formulas?.length || 0
        const conceptCount = notesData.concepts?.length || 0
        const diagramCount = notesData.diagrams?.length || 0
        const outlineCount = notesData.outline?.length || 0
        
        console.log(`\n📊 [NOTES API] Content extraction summary:`)
        console.log(`  - Formulas extracted: ${formulaCount}`)
        console.log(`  - Concepts extracted: ${conceptCount}`)
        console.log(`  - Diagrams extracted: ${diagramCount}`)
        console.log(`  - Outline items: ${outlineCount}`)
        
        // Check for generic outline items (CRITICAL VALIDATION)
        const genericPatterns = [
          /definition and importance of/i,
          /understanding.*concepts/i,
          /introduction to/i,
          /tensile testing and its role/i,
          /elastic modulus and yield strength concepts/i,
          /poisson's ratio and its significance/i,
          /^[^()]*concepts?$/i,  // Items ending with just "concepts" or "concept"
          /^[^()]*significance$/i,  // Items ending with just "significance"
          /^[^()]*importance$/i,  // Items ending with just "importance"
        ]
        
        const genericOutlineItems = notesData.outline?.filter((item: string) => 
          genericPatterns.some(pattern => pattern.test(item))
        ) || []
        
        if (genericOutlineItems.length > 0) {
          console.error(`  ❌ [NOTES API] CRITICAL: ${genericOutlineItems.length} generic outline items detected!`)
          console.error(`     Generic items found:`)
          genericOutlineItems.forEach((item: string, idx: number) => {
            console.error(`       ${idx + 1}. "${item}"`)
          })
          console.error(`     Outline items MUST contain specific formulas, examples, calculations, or procedures from the document`)
          console.error(`     Each item should be identifiable to THIS specific document only`)
        }
        
        // Check if outline items have specific content (formulas, examples, page refs)
        const outlineHasSpecifics = notesData.outline?.some((item: string) => {
          const hasFormula = /[=+\-×÷√lnlog∫Σ∏]|%|[\u03B1-\u03C9\u0391-\u03A9]|[\u2080-\u2089\u00B2\u00B3]|[\u2070-\u2079]|O\(|T\(|f\(|g\(|h\(|S\s*=|e\s*=|σ\s*=|ε\s*=|x\s*=|y\s*=|z\s*=/.test(item)
          const hasExample = /\d+\.?\d*\s*(mm|cm|m|kg|g|psi|pa|%|°|rad|deg|s|min|h|Hz|J|W|V|A|Ω|F|H|C|K|mol)/i.test(item) || /example|worked|case study|trace|calculation/i.test(item)
          const hasPageRef = /\(p\.|\(pp\.|\(page|\(pg\./i.test(item)
          const hasSpecificProcedure = /test|procedure|method|algorithm|technique|process|step/i.test(item)
          return hasFormula || hasExample || hasPageRef || hasSpecificProcedure
        })
        
        if (!outlineHasSpecifics && (notesData.outline?.length || 0) > 0) {
          console.warn(`  ⚠️ [NOTES API] WARNING: Outline items lack specific content (formulas, examples, page refs)`)
        }
        
        // Check if formulas might be missing (generic pattern matching)
        const documentHasMath = /[=+\-×÷√lnlog∫Σ∏]|%|[\u03B1-\u03C9\u0391-\u03A9]|[\u2080-\u2089\u00B2\u00B3]|[\u2070-\u2079]|O\(|T\(|f\(|g\(|h\(|S\s*=|e\s*=|σ\s*=|ε\s*=|x\s*=|y\s*=|z\s*=/.test(fileContents.join(''))
        if (documentHasMath && formulaCount === 0) {
          console.error(`  ❌ [NOTES API] CRITICAL: Document appears to contain formulas but none were extracted!`)
          console.error(`     Document contains mathematical notation but formulas array is empty`)
        } else if (documentHasMath && formulaCount < 3) {
          console.warn(`  ⚠️ [NOTES API] WARNING: Document contains mathematical notation but only ${formulaCount} formula(s) were extracted`)
          console.warn(`     Consider reviewing if more formulas should be extracted`)
        }
      }
    } catch (parseError) {
      console.error(`❌ [NOTES API] Failed to parse JSON response:`, parseError)
      console.log(`📄 [NOTES API] Raw content:`, content)
      throw new Error("Failed to parse AI response as JSON")
    }

    // 4) Wait for diagram analysis to complete (ran in parallel with notes generation)
    const notesGenerationTime = Date.now() - notesGenerationStart
    if (process.env.NODE_ENV === 'development') {
      console.log(`  ⏱️ [NOTES API] Notes generation completed in ${notesGenerationTime}ms`)
    }
    
    let analyzedDiagrams = notesData.diagrams || []
    
    // Wait for diagram analysis (may have already completed)
    const diagramAnalysisResult = await diagramAnalysisPromise
    if (diagramAnalysisResult.length > 0) {
      analyzedDiagrams = diagramAnalysisResult
      if (process.env.NODE_ENV === 'development') {
        console.log(`  ✅ [NOTES API] Diagram analysis completed: ${analyzedDiagrams.length} diagrams (ran in parallel)`)
      }
    } else if (extractedImages.length > 0 && analyzedDiagrams.length === 0) {
      // Fallback: If early analysis didn't work, try again with key_terms
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🖼️ [NOTES API] Retrying diagram analysis with key_terms...`)
      }
      try {
        const diagramAnalyzer = new DiagramAnalyzerAgent()
        const diagramResult = await diagramAnalyzer.execute({
          documentContent: fileContents.join('\n'),
          fileNames: fileNames,
          topic: topic,
          difficulty: difficulty,
          instructions: instructions,
          studyContext: studyContext,
              extractedImages: extractedImages,
              relevantChunks: [],
              metadata: {
                contentExtraction: {
                  key_terms: notesData.key_terms || [],
                }
              }
        })
        
        if (diagramResult.success && diagramResult.data?.diagrams) {
          analyzedDiagrams = diagramResult.data.diagrams
          
          // Ensure image_data_b64 is preserved from extracted images
          // Match analyzed diagrams with extracted images by page number
          analyzedDiagrams = analyzedDiagrams.map((diagram: any, idx: number) => {
            if (diagram.source === 'file' && diagram.page) {
              // Try page number matching first (most reliable)
              let matchingImage = extractedImages.find((img) => img.page === diagram.page)
              
              // Fallback to index-based matching if page number doesn't match
              if (!matchingImage && extractedImages[idx]) {
                matchingImage = extractedImages[idx]
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`[NOTES API] Page number mismatch for diagram ${idx + 1} (expected page ${diagram.page}, using index ${idx})`)
                }
              }
              
              if (matchingImage && matchingImage.image_data_b64) {
                return {
                  ...diagram,
                  page: matchingImage.page, // Use actual page number from extracted image
                  image_data_b64: matchingImage.image_data_b64,
                  width: matchingImage.width,
                  height: matchingImage.height,
                }
              } else if (process.env.NODE_ENV === 'development') {
                console.warn(`[NOTES API] No matching image found for diagram ${idx + 1} (page ${diagram.page})`)
              }
            }
            return diagram
          })
        } else {
          console.log(`⚠️ [NOTES API] Diagram analysis failed, will rely on text-based diagrams from AI`)
          analyzedDiagrams = []
        }
      } catch (diagramError) {
        console.error(`❌ [NOTES API] Error analyzing diagrams:`, diagramError)
        analyzedDiagrams = []
      }
    } else {
      // No images extracted (disabled for free tier), but we still have diagrams from AI text analysis
      // These diagrams won't have image_data_b64, but we can enrich with web images
      if (process.env.NODE_ENV === 'development') {
        console.log(`ℹ️ [NOTES API] PDF image extraction disabled (free tier)`)
        console.log(`  ℹ️ [NOTES API] Using text-based diagrams from AI analysis only`)
        console.log(`  💡 [NOTES API] Diagrams will be enriched with web images if keywords are available`)
      }
      
      // Ensure diagrams from AI have proper structure even without images
      if (analyzedDiagrams && analyzedDiagrams.length > 0) {
        analyzedDiagrams = analyzedDiagrams.map((diagram: any) => ({
          ...diagram,
          source: diagram.source || 'text',
          image_data_b64: diagram.image_data_b64 || null, // Explicitly set to null if missing
        }))
      } else {
        analyzedDiagrams = []
      }
    }

    // Validate that the AI response is non-empty / meaningful
    const hasMeaningfulContent =
      Boolean(notesData?.title && String(notesData.title).trim().length > 1 && notesData.title !== ':') ||
      (Array.isArray(notesData?.outline) && notesData.outline.length > 0) ||
      (Array.isArray(notesData?.key_terms) && notesData.key_terms.length > 0) ||
      (Array.isArray(notesData?.concepts) && notesData.concepts.length > 0) ||
      (Array.isArray(notesData?.formulas) && notesData.formulas.length > 0)

    if (!hasMeaningfulContent) {
      console.error('❌ [NOTES API] AI returned empty/meaningless notes payload; failing fast')
      throw new Error('Notes generation returned empty content. Please retry with a clearer document.')
    }

    // 5) Assemble initial notes (diagrams from AI + diagram analysis that ran in parallel)
    const baseNotes = { ...notesData, diagrams: analyzedDiagrams }

    const topicForVideos = notesData.title || studyTopic || fileNames.join(", ")

    // Save notes to DB (need noteId for the response & redirect)
    let noteId: string | null = null
    try {
      const supabase = createAdminClient()
      const { data: savedNote, error: saveError } = await supabase
        .from('user_study_notes')
        .insert({
          user_id: userId,
          title: baseNotes.title,
          subject: baseNotes.subject,
          notes_json: baseNotes,
          file_names: fileNames,
        })
        .select('id')
        .single()
      if (!saveError && savedNote) {
        noteId = savedNote.id
      }
    } catch (dbErr) {
      console.error('⚠️ [NOTES API] Database save error:', dbErr)
    }

    const totalTime = Date.now() - sessionStartTime
    console.log(`✅ [NOTES API] Notes ready in ${totalTime}ms (AI: ${Date.now() - notesGenerationStart}ms)`)

    // 6) Fire-and-forget: enrichment, cache, embeddings, logging
    // These run AFTER the response is sent so the user isn't waiting
    const enrichmentCleanup = async () => {
      try {
        const [enrichedDiagrams, videoResult, _embeddingResult] = await Promise.allSettled([
          enrichDiagramsWithWebImages(analyzedDiagrams).catch(() => analyzedDiagrams),
          enrichWithYouTubeVideos(baseNotes, topicForVideos, fileNames).catch(() => ({ videos: [] })),
          generateEmbeddingsForNotes(fileContents, fileNames, userId).catch(() => ({ success: false })),
        ])

        const enrichedNotes = { ...baseNotes }
        if (enrichedDiagrams.status === 'fulfilled') {
          enrichedNotes.diagrams = enrichedDiagrams.value
        }
        if (videoResult.status === 'fulfilled') {
          enrichedNotes.resources = { ...enrichedNotes.resources, videos: videoResult.value.videos }
        }

        // Update the saved note with enriched data
        if (noteId) {
          const supabase = createAdminClient()
          await supabase.from('user_study_notes').update({ notes_json: enrichedNotes }).eq('id', noteId)
        }

        // Persist cache (wait for document tracking to finish first)
        await documentTrackingPromise
        if (documentIds[0]) {
          const instructionsHash = createHash('sha256')
            .update(JSON.stringify({ topic, difficulty, instructions, studyContext: studyContext, fileNames }))
            .digest('hex')
          const adminClient = createAdminClient()
          await adminClient.from('study_notes_cache').upsert({
            user_id: userId,
            document_id: documentIds[0],
            topic: topic || null,
            education_level: studyContext?.educationLevel || null,
            content_focus: studyContext?.contentFocus || null,
            instructions_hash: instructionsHash,
            notes_json: enrichedNotes,
          }, { onConflict: 'user_id,document_id,instructions_hash' }).then(({ error }) => {
            if (error) console.warn('⚠️ [NOTES API] Cache write failed:', error.message)
          })
        }

        // Progress logging
        ProgressLogger.logGeneration({
          session_id: sessionId,
          task_type: 'study_notes',
          timestamp: new Date().toISOString(),
          user_id: userId,
          document_types: fileNames.map(f => f.split('.').pop() || 'unknown'),
          features_worked_on: FeatureFlags.FEATURE_BACKLOG ? ['notes_generation'] : [],
          key_learnings: errorsEncountered.length === 0 ? ['Generation completed successfully'] : [],
          errors_encountered: errorsEncountered,
          tokens_used: totalTokensUsed,
          processing_time_ms: Date.now() - sessionStartTime,
          notes_quality_metrics: ProgressLogger.extractQualityMetrics(enrichedNotes),
        }).catch(() => {})
      } catch (err) {
        console.error('⚠️ [NOTES API] Background enrichment error:', err)
      }
    }

    // Don't await - let it run after response is sent
    enrichmentCleanup().catch(() => {})

    return NextResponse.json({ 
      success: true, 
      noteId,
      notes: baseNotes,
      extractedImages: extractedImages.length,
      processedFiles: fileNames.length,
      fileNames,
      fileContents: fileContents.length,
    })

  } catch (error) {
    console.error("\n❌ [NOTES API] Error generating study notes:", error)
    console.error(`❌ [NOTES API] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    console.error(`❌ [NOTES API] Error message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    if (error instanceof Error && error.stack) {
      console.error(`❌ [NOTES API] Stack trace:`, error.stack)
    }

    // MEMORY ARCHITECTURE: Log error to progress log (non-blocking)
    try {
      // Only log if session tracking was initialized and userId is available
      if (typeof sessionStartTime !== 'undefined' && sessionId) {
        const { ProgressLogger } = await import('@/lib/domain-memory/progress-logger')
        const processingTime = Date.now() - sessionStartTime
        // Try to get userId if not already available
        let errorUserId: string | undefined = undefined
        try {
          const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
          const fetchedUserId = await getUserIdFromRequest(req)
          errorUserId = fetchedUserId || undefined
        } catch {
          // Ignore - userId might not be available
        }
        
        ProgressLogger.logGeneration({
          session_id: sessionId,
          task_type: 'study_notes',
          timestamp: new Date().toISOString(),
          user_id: errorUserId,
          errors_encountered: [error instanceof Error ? error.message : 'Unknown error'],
          tokens_used: totalTokensUsed || 0,
          processing_time_ms: processingTime,
        }).catch(() => {
          // Fail silently - logging is non-critical
        })
      }
    } catch (logError) {
      // Ignore logging errors
    }

    // SECURITY: Sanitize error message before sending to client
    const sanitized = sanitizeError(error, 'Failed to generate notes')
    return NextResponse.json(
      { 
        success: false, 
        ...createSafeErrorResponse(error, 'Failed to generate notes')
      },
      { status: sanitized.statusCode }
    )
  }
}

// Helper function to extract images from PDF
async function extractImagesFromPDF(buffer: Buffer, filename: string): Promise<{ image_data_b64: string; page: number; width?: number; height?: number }[]> {
  try {
    // Use the smart extractor to get individual diagrams
    const diagrams = await smartExtractDiagrams(buffer, filename, {
      minDiagramSize: 10000, // 100x100 pixels minimum
      maxDiagramsPerPage: 5, // Limit to prevent too many diagrams
    })
    
    // Convert to expected format
    return diagrams.map(diagram => ({
      image_data_b64: diagram.image_data_b64,
      page: diagram.page,
      width: diagram.width,
      height: diagram.height,
      x: diagram.x,
      y: diagram.y
    }))
  } catch (error) {
    // Fallback to original extractor if smart extractor fails
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [NOTES API] Smart extraction failed, falling back to full page extraction:`, error)
    }
    
    // Use the original extractor as fallback
    const { extractImagesFromPDF: extractFullPages } = await import('@/lib/pdf-image-extractor')
    return extractFullPages(buffer, filename)
  }
}

// Note: enrichWithWebImages has been replaced with parallel enrichment
// See src/lib/utils/parallel-enrichment.ts for enrichDiagramsWithWebImages
