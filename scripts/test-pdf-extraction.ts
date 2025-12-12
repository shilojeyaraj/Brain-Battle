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

  const { extractPDFTextAndImages } = await import("../src/lib/pdf-unified-extractor")

  console.log("📄 Testing PDF:", filePath)
  try {
    const result = await extractPDFTextAndImages(Buffer.from(buffer), path.basename(filePath))
    console.log("✅ Extracted text length:", result.text.length)
    console.log("🧩 Snippet:", result.text.slice(0, 500).replace(/\s+/g, " "))
    console.log("🖼️ Images extracted:", result.images.length)
  } catch (err) {
    console.error("❌ Extraction failed:", err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("❌ Extraction failed:", err)
  process.exit(1)
})

