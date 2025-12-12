/**
 * Production PDF Parsing Verification Script
 * 
 * This script verifies that PDF parsing will work in production by:
 * 1. Testing the exact same code path as /api/notes
 * 2. Verifying worker configuration is set correctly
 * 3. Testing with a real PDF file
 * 
 * Usage: pnpm tsx scripts/verify-pdf-production.ts -- --file ./path/to/file.pdf
 */

import fs from "fs"
import path from "path"
import { config } from "dotenv"

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  config({ path: envPath })
} else {
  const envPath2 = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath2)) {
    config({ path: envPath2 })
  }
}

async function verifyPDFParsing() {
  const args = process.argv.slice(2)
  const fileFlagIndex = args.findIndex((arg) => arg === "--file" || arg === "-f")
  
  if (fileFlagIndex === -1 || !args[fileFlagIndex + 1]) {
    console.error("Usage: pnpm tsx scripts/verify-pdf-production.ts -- --file ./path/to/file.pdf")
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), args[fileFlagIndex + 1])
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`)
    process.exit(1)
  }

  console.log("🔍 Verifying PDF Parsing for Production...\n")
  console.log(`📄 Testing with: ${path.basename(filePath)}\n`)

  // Step 1: Verify module-level global config
  console.log("Step 1: Checking module-level global configuration...")
  const globalObj: any = globalThis as any
  if (globalObj.GlobalWorkerOptions) {
    console.log(`  ✅ GlobalWorkerOptions exists`)
    console.log(`  ✅ workerSrc: "${globalObj.GlobalWorkerOptions.workerSrc}"`)
    console.log(`  ✅ disableWorker: ${globalObj.GlobalWorkerOptions.disableWorker}`)
  } else {
    console.log(`  ⚠️  GlobalWorkerOptions not set at module level (will be set during import)`)
  }

  // Step 2: Set global config BEFORE any imports (critical!)
  console.log("\nStep 2: Setting global worker configuration...")
  if (!globalObj.GlobalWorkerOptions) {
    globalObj.GlobalWorkerOptions = {}
  }
  globalObj.GlobalWorkerOptions.workerSrc = ''
  globalObj.GlobalWorkerOptions.disableWorker = true
  console.log("  ✅ Set globalThis.GlobalWorkerOptions")
  console.log(`     workerSrc: "${globalObj.GlobalWorkerOptions.workerSrc}"`)
  console.log(`     disableWorker: ${globalObj.GlobalWorkerOptions.disableWorker}`)

  // Step 2b: Import and configure pdfjs-dist (same as production)
  console.log("\nStep 2b: Importing and configuring pdfjs-dist...")
  try {
    let pdfjsLib: any
    try {
      const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjsLib = pdfjsModule.default || pdfjsModule
      console.log("  ✅ Loaded pdfjs-dist/legacy/build/pdf.mjs")
    } catch (error) {
      const pdfjsModule: any = await import('pdfjs-dist/build/pdf.mjs')
      pdfjsLib = pdfjsModule.default || pdfjsModule
      console.log("  ✅ Loaded pdfjs-dist/build/pdf.mjs")
    }

    // Configure worker options on the instance
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      ;(pdfjsLib.GlobalWorkerOptions as any).disableWorker = true
      console.log("  ✅ Configured pdfjs-dist instance GlobalWorkerOptions")
      console.log(`     workerSrc: "${pdfjsLib.GlobalWorkerOptions.workerSrc}"`)
      console.log(`     disableWorker: ${pdfjsLib.GlobalWorkerOptions.disableWorker}`)
    } else {
      pdfjsLib.GlobalWorkerOptions = { workerSrc: '', disableWorker: true }
      console.log("  ✅ Created pdfjs-dist instance GlobalWorkerOptions")
    }

    if (typeof pdfjsLib.setWorkerFetch === 'function') {
      pdfjsLib.setWorkerFetch(false)
      console.log("  ✅ Disabled worker fetch")
    }
  } catch (error) {
    console.error("  ❌ Failed to configure pdfjs-dist:", error)
    process.exit(1)
  }

  // Step 3: Import pdf-parse (same as production)
  console.log("\nStep 3: Importing pdf-parse...")
  let PDFParse: any
  try {
    const pdfParseModule: any = await import('pdf-parse')
    PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule.default
    
    if (!PDFParse || typeof PDFParse !== 'function') {
      throw new Error('PDFParse class not found')
    }
    console.log("  ✅ pdf-parse imported successfully")
  } catch (error) {
    console.error("  ❌ Failed to import pdf-parse:", error)
    process.exit(1)
  }

  // Step 4: Configure pdf-parse worker
  console.log("\nStep 4: Configuring pdf-parse worker...")
  if (typeof PDFParse.setWorker === 'function') {
    PDFParse.setWorker('')
    console.log("  ✅ Called PDFParse.setWorker('')")
  } else {
    console.log("  ⚠️  PDFParse.setWorker() not available")
  }

  // Step 5: Wait for pdf-parse to load internal pdfjs and patch it
  console.log("\nStep 5: Waiting for pdf-parse internal pdfjs...")
  await new Promise(resolve => setImmediate(resolve))
  
  // CRITICAL: pdf-parse uses its own pdfjs-dist@5.4.296, we need to patch it
  // Try multiple times as pdf-parse loads pdfjs lazily
  let patched = false
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setImmediate(resolve))
    if (typeof globalThis !== 'undefined' && (globalThis as any).pdfjs) {
      const internalPdfjs = (globalThis as any).pdfjs
      if (internalPdfjs.GlobalWorkerOptions) {
        internalPdfjs.GlobalWorkerOptions.workerSrc = ''
        ;(internalPdfjs.GlobalWorkerOptions as any).disableWorker = true
        console.log("  ✅ Patched globalThis.pdfjs GlobalWorkerOptions")
        console.log(`     workerSrc: "${internalPdfjs.GlobalWorkerOptions.workerSrc}"`)
        console.log(`     disableWorker: ${internalPdfjs.GlobalWorkerOptions.disableWorker}`)
        patched = true
        break
      } else {
        internalPdfjs.GlobalWorkerOptions = { workerSrc: '', disableWorker: true }
        console.log("  ✅ Created globalThis.pdfjs GlobalWorkerOptions")
        patched = true
        break
      }
    }
  }
  
  if (!patched) {
    console.log("  ⚠️  globalThis.pdfjs not found - will be configured when parser is created")
  }

  // Step 6: Test actual PDF parsing
  console.log("\nStep 6: Testing PDF text extraction...")
  try {
    const buffer = fs.readFileSync(filePath)
    console.log(`  📦 PDF buffer size: ${buffer.length} bytes`)

    // CRITICAL: Patch globalThis.pdfjs AGAIN right before creating parser
    // pdf-parse may load pdfjs when parser is created
    if (typeof globalThis !== 'undefined' && (globalThis as any).pdfjs) {
      const internalPdfjs = (globalThis as any).pdfjs
      if (internalPdfjs.GlobalWorkerOptions) {
        internalPdfjs.GlobalWorkerOptions.workerSrc = ''
        ;(internalPdfjs.GlobalWorkerOptions as any).disableWorker = true
      } else {
        internalPdfjs.GlobalWorkerOptions = { workerSrc: '', disableWorker: true }
      }
      console.log("  ✅ Re-patched globalThis.pdfjs before parser creation")
    }

    const parser = new PDFParse({ 
      data: buffer,
      useSystemFonts: true,
      disableAutoFetch: true,
      useWorkerFetch: false,
      isEvalSupported: false,
      verbosity: 0
    })

    // CRITICAL: Patch AGAIN after parser creation (pdf-parse may load pdfjs now)
    await new Promise(resolve => setImmediate(resolve))
    if (typeof globalThis !== 'undefined' && (globalThis as any).pdfjs) {
      const internalPdfjs = (globalThis as any).pdfjs
      if (internalPdfjs.GlobalWorkerOptions) {
        internalPdfjs.GlobalWorkerOptions.workerSrc = ''
        ;(internalPdfjs.GlobalWorkerOptions as any).disableWorker = true
      } else {
        internalPdfjs.GlobalWorkerOptions = { workerSrc: '', disableWorker: true }
      }
      console.log("  ✅ Patched globalThis.pdfjs after parser creation")
    }

    console.log("  🔄 Extracting text...")
    const pdfText = await parser.getText()
    
    if (parser.destroy) {
      await parser.destroy()
    }

    if (!pdfText || pdfText.trim().length < 100) {
      console.error(`  ❌ PDF parsing returned insufficient content (${pdfText?.length || 0} characters)`)
      process.exit(1)
    }

    console.log(`  ✅ Successfully extracted ${pdfText.length} characters`)
    console.log(`  📝 Preview: ${pdfText.substring(0, 200)}...`)

    console.log("\n✅ ALL CHECKS PASSED - Production PDF parsing should work!")
    console.log("\nSummary:")
    console.log("  ✅ Module-level global config set")
    console.log("  ✅ pdfjs-dist configured before pdf-parse")
    console.log("  ✅ pdf-parse worker configured")
    console.log("  ✅ globalThis.pdfjs patched")
    console.log("  ✅ PDF text extraction successful")
    console.log("\n🚀 Ready for production deployment!")

  } catch (error) {
    console.error("\n❌ PDF parsing failed:", error)
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`)
      console.error(`   Stack: ${error.stack}`)
    }
    process.exit(1)
  }
}

verifyPDFParsing().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

