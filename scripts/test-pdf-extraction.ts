// Simple CLI to test PDF text extraction using the same pdfjs fallback used in /api/notes.
// Usage: pnpm test:pdf-extract -- --file ./path/to/file.pdf

import fs from "fs/promises"
import path from "path"

async function main() {
  const args = process.argv.slice(2)
  const fileFlagIndex = args.findIndex((arg) => arg === "--file" || arg === "-f")
  if (fileFlagIndex === -1 || !args[fileFlagIndex + 1]) {
    console.error("Usage: pnpm test:pdf-extract -- --file ./path/to/file.pdf")
    process.exit(1)
  }

  const filePath = path.resolve(process.cwd(), args[fileFlagIndex + 1])
  if (!filePath.toLowerCase().endsWith(".pdf")) {
    console.error("Error: file must be a PDF")
    process.exit(1)
  }

  const buffer = await fs.readFile(filePath)

  const { getPdfjsLib, SERVERLESS_PDF_OPTIONS, applyGlobalPdfjsWorkerDisable } = await import("../src/lib/pdfjs-config")
  applyGlobalPdfjsWorkerDisable()
  const pdfjsLib = await getPdfjsLib()

  if (pdfjsLib?.GlobalWorkerOptions) {
    console.log("🔧 [TEST] pdfjs GlobalWorkerOptions before set:", pdfjsLib.GlobalWorkerOptions)
    try {
      Object.defineProperty(pdfjsLib.GlobalWorkerOptions, "workerSrc", { value: (pdfjsLib as any).GlobalWorkerOptions?.workerSrc ?? "pdf.worker.js", writable: true, configurable: true })
    } catch {}
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = (pdfjsLib as any).GlobalWorkerOptions?.workerSrc ?? "pdf.worker.js"
    }
    ;(pdfjsLib.GlobalWorkerOptions as any).disableWorker = true
    console.log("🔧 [TEST] pdfjs GlobalWorkerOptions after set:", pdfjsLib.GlobalWorkerOptions)
    console.log("🔧 [TEST] pdfjs workerSrc value:", (pdfjsLib.GlobalWorkerOptions as any).workerSrc)
  } else {
    ;(pdfjsLib as any).GlobalWorkerOptions = { workerSrc: "", disableWorker: true }
    console.log("🔧 [TEST] pdfjs GlobalWorkerOptions created:", (pdfjsLib as any).GlobalWorkerOptions)
  }
  if (typeof pdfjsLib?.setWorkerFetch === "function") {
    try {
      pdfjsLib.setWorkerFetch(false)
    } catch {
      /* ignore */
    }
  }

  console.log("📄 Testing PDF:", filePath)
  console.log("🔍 pdfjs version:", (pdfjsLib as any)?.version)
  console.log("🔍 GlobalWorkerOptions:", (pdfjsLib as any)?.GlobalWorkerOptions)

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    ...SERVERLESS_PDF_OPTIONS,
    disableWorker: true,
  })

  const pdfDoc = await loadingTask.promise
  console.log("✅ Loaded PDF with pages:", pdfDoc.numPages)

  const pageTexts: string[] = []
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item: any) => item.str).join(" ")
    pageTexts.push(pageText)
  }

  const text = pageTexts.join("\n\n")
  console.log("✅ Extracted text length:", text.length)
  console.log("🧩 Snippet:", text.slice(0, 500).replace(/\s+/g, " "))
}

main().catch((err) => {
  console.error("❌ Extraction failed:", err)
  process.exit(1)
})

