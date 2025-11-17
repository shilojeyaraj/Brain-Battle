/**
 * Formula Formatter Utility
 * Converts plain text formulas to LaTeX-style markdown for better display
 * Similar to ChatGPT's method of formatting mathematical equations
 */

/**
 * Converts a formula string to LaTeX-style markdown notation
 * Handles subscripts, superscripts, fractions, Greek letters, and special symbols
 */
export function formatFormulaToMarkdown(formula: string): string {
  let formatted = formula

  // Handle subscripts (e.g., D_i, D₀, l_f)
  // Pattern: letter followed by underscore or subscript character
  formatted = formatted.replace(/([A-Za-z])([₀₁₂₃₄₅₆₇₈₉ᵢᵣᵤᵥᵦᵧᵨᵩᵪ])/g, (match, letter, sub) => {
    const subscriptMap: Record<string, string> = {
      '₀': '₀', '₁': '₁', '₂': '₂', '₃': '₃', '₄': '₄', '₅': '₅',
      '₆': '₆', '₇': '₇', '₈': '₈', '₉': '₉', 'ᵢ': 'ᵢ', 'ᵣ': 'ᵣ',
      'ᵤ': 'ᵤ', 'ᵥ': 'ᵥ', 'ᵦ': 'ᵦ', 'ᵧ': 'ᵧ', 'ᵨ': 'ᵨ', 'ᵩ': 'ᵩ', 'ᵪ': 'ᵪ'
    }
    return `${letter}<sub>${sub}</sub>`
  })

  // Handle explicit subscripts with underscore (D_i, l_f, A_0)
  formatted = formatted.replace(/([A-Za-z])_([0-9a-z]+)/g, '$1<sub>$2</sub>')

  // Handle superscripts (e.g., x², x³, E=mc²)
  formatted = formatted.replace(/([A-Za-z0-9])([²³¹⁰⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ])/g, (match, base, sup) => {
    return `${base}<sup>${sup}</sup>`
  })

  // Handle fractions (e.g., a/b, (a+b)/(c+d))
  // Pattern: (expression)/(expression) or number/number
  formatted = formatted.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '($1)/($2)')
  
  // Handle simple fractions with parentheses
  formatted = formatted.replace(/(\d+)\s*\/\s*(\d+)/g, (match, num, den) => {
    // Only format if it's clearly a fraction (not part of a larger expression)
    if (match.includes('π') || match.includes('√') || match.length < 10) {
      return `${num}/${den}`
    }
    return match
  })

  // Handle square roots (√, sqrt)
  formatted = formatted.replace(/√\(([^)]+)\)/g, '√($1)')
  formatted = formatted.replace(/sqrt\(([^)]+)\)/g, '√($1)')

  // Handle Greek letters (preserve them, they're already Unicode)
  // Common Greek letters: α, β, γ, δ, ε, θ, λ, μ, π, ρ, σ, τ, φ, ω, Δ, Σ, etc.

  // Handle multiplication symbols (×, ·, *)
  formatted = formatted.replace(/×/g, '×')
  formatted = formatted.replace(/·/g, '·')

  // Handle division symbols (÷, /)
  // Keep ÷ as is, handle / in context

  // Handle logarithms (log, ln)
  formatted = formatted.replace(/log\(([^)]+)\)/g, 'log($1)')
  formatted = formatted.replace(/ln\(([^)]+)\)/g, 'ln($1)')

  // Handle integrals (∫)
  formatted = formatted.replace(/∫/g, '∫')

  // Handle summation (Σ)
  formatted = formatted.replace(/Σ/g, 'Σ')

  // Handle product (Π)
  formatted = formatted.replace(/Π/g, 'Π')

  // Handle limits (lim)
  formatted = formatted.replace(/lim/g, 'lim')

  // Handle infinity (∞)
  formatted = formatted.replace(/∞/g, '∞')

  // Handle plus/minus (±)
  formatted = formatted.replace(/±/g, '±')

  // Handle approximately (≈)
  formatted = formatted.replace(/≈/g, '≈')

  // Handle not equal (≠)
  formatted = formatted.replace(/≠/g, '≠')

  // Handle less/greater than or equal (≤, ≥)
  formatted = formatted.replace(/≤/g, '≤')
  formatted = formatted.replace(/≥/g, '≥')

  return formatted
}

/**
 * Converts a formula to display-friendly HTML with proper math notation
 * Properly handles subscripts, superscripts, and special characters
 */
export function formatFormulaToHTML(formula: string): string {
  if (!formula || typeof formula !== 'string') {
    return formula || ''
  }

  // First, STRIP ALL HTML completely - we'll rebuild it properly
  let cleanFormula = formula
    // Remove ALL HTML tags and their content attributes first
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    // Remove broken attribute patterns (very aggressive)
    .replace(/="[^"]*">/g, '') // Remove ="..." >
    .replace(/="[^"]*"/g, '') // Remove ="..." 
    .replace(/="[^"]*\s*>/g, '') // Remove ="..." with whitespace before >
    // Remove attribute fragments with spaces/dashes (like ="text - xs align - baseline")
    .replace(/="[^"]*\s*-\s*[^"]*"/g, '') // Remove attributes with dashes
    .replace(/="[^"]*\s*style\s*=\s*[^"]*"/g, '') // Remove style in attributes
    .replace(/style\s*=\s*"[^"]*"/g, '') // Remove style="..."
    // Remove CSS property fragments (even without quotes)
    .replace(/vertical\s*-\s*align[^">;]*/g, '') // Remove vertical-align fragments
    .replace(/text\s*-\s*xs[^">]*/g, '') // Remove text-xs fragments  
    .replace(/align\s*-\s*baseline[^">;]*/g, '') // Remove align-baseline fragments
    .replace(/class\s*=\s*"[^"]*"/g, '') // Remove class="..."
    // Remove multi-part attribute patterns
    .replace(/="[^"]*\s*-\s*[^"]*\s*-\s*[^"]*"/g, '') // Multi-dash attributes
    // Remove HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    // Remove any remaining = "..." patterns
    .replace(/\s*=\s*"[^"]*"/g, '') // Remove = "..."
    .replace(/\s*=\s*"[^"]*">/g, '') // Remove = "..." >
    .replace(/\s*style\s*=\s*/g, '') // Remove style= 
    .replace(/\s*vertical\s*-\s*align\s*:\s*[^;"]*/g, '') // Remove vertical-align: value
    // Remove any remaining HTML-like fragments
    .replace(/<[^>]*/g, '') // Remove any remaining < tags
    .replace(/[^>]*>/g, '') // Remove any remaining > tags
    // Clean up multiple spaces and normalize
    .replace(/\s+/g, ' ')
    .trim()

  // Use a marker system to protect parts we're converting
  const markers: { [key: string]: string } = {}
  let markerIndex = 0
  
  const getMarker = (content: string) => {
    const marker = `__MARKER_${markerIndex++}__`
    markers[marker] = content
    return marker
  }

  let html = cleanFormula

  // Step 1: Protect and convert Unicode subscripts FIRST (Dᵢ, D₀, etc.)
  const subscriptUnicode = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', 'ᵢ', 'ᵣ', 'ᵤ', 'ᵥ', 'ᵦ', 'ᵧ', 'ᵨ', 'ᵩ', 'ᵪ']
  subscriptUnicode.forEach((sub) => {
    const regex = new RegExp(`([A-Za-z0-9])${sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
    html = html.replace(regex, (match, base) => {
      // Check if this is inside parentheses that might be part of a larger expression
      const marker = getMarker(`${base}<sub class="text-xs align-baseline" style="vertical-align: baseline;">${sub}</sub>`)
      return marker
    })
  })

  // Step 2: Handle underscore subscripts (D_i, l_f, A_0)
  // First, clean up any malformed HTML that might be between underscore and subscript
  // Pattern: letter_="..." style="...">subscript_value
  // Handle patterns like: 1_= "text - xs align - baseline" style = "vertical - align: baseline;">f
  html = html.replace(/([A-Za-z0-9])_\s*=\s*"[^"]*"\s*style\s*=\s*"[^"]*">\s*([0-9a-z]+)/g, '$1_$2')
  html = html.replace(/([A-Za-z0-9])_\s*=\s*"[^"]*">\s*([0-9a-z]+)/g, '$1_$2')
  html = html.replace(/([A-Za-z0-9])_\s*style\s*=\s*"[^"]*">\s*([0-9a-z]+)/g, '$1_$2')
  // Handle patterns with spaces around = and dashes: = "text - xs align - baseline"
  html = html.replace(/([A-Za-z0-9])_\s*=\s*"[^"]*\s*-\s*[^"]*"\s*style\s*=\s*"[^"]*">\s*([0-9a-z]+)/g, '$1_$2')
  html = html.replace(/([A-Za-z0-9])_\s*=\s*"[^"]*\s*-\s*[^"]*">\s*([0-9a-z]+)/g, '$1_$2')
  // Remove any remaining attribute fragments between underscore and value (very aggressive)
  html = html.replace(/([A-Za-z0-9])_\s*[^0-9a-z]*([0-9a-z]+)/g, '$1_$2')
  
  // Now process clean underscore subscripts
  html = html.replace(/([A-Za-z])_([0-9a-z]+)/g, (match, letter, sub) => {
    // Skip if this match contains a marker (already processed)
    if (match.includes('__MARKER_')) {
      return match
    }
    const marker = getMarker(`${letter}<sub class="text-xs align-baseline" style="vertical-align: baseline;">${sub}</sub>`)
    return marker
  })

  // Step 3: Handle superscripts (x², E=mc², D²)
  const superscriptUnicode = ['²', '³', '¹', '⁰', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁺', '⁻', '⁼', '⁽', '⁾', 'ⁿ']
  superscriptUnicode.forEach((sup) => {
    const regex = new RegExp(`([A-Za-z0-9])${sup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
    html = html.replace(regex, (match, base) => {
      // Skip if already marked
      if (match.includes('__MARKER_')) {
        return match
      }
      const marker = getMarker(`${base}<sup class="text-xs align-baseline" style="vertical-align: baseline;">${sup}</sup>`)
      return marker
    })
  })

  // Step 4: Replace all markers with their HTML content
  Object.entries(markers).forEach(([marker, content]) => {
    // Escape the marker for use in regex
    const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    html = html.replace(new RegExp(escapedMarker, 'g'), content)
  })

  // Step 5: Ensure proper spacing around parentheses and brackets for readability
  html = html.replace(/([A-Za-z0-9])\(/g, '$1 (') // Space before opening paren
  html = html.replace(/\)([A-Za-z0-9])/g, ') $1') // Space after closing paren

  // Step 6: Style Greek letters (wrap in italic span) - but only if not already in a tag
  html = html.replace(/([αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ])/g, (match) => {
    // Don't wrap if already inside a tag
    if (match.includes('<') || match.includes('>')) {
      return match
    }
    return `<span class="italic">${match}</span>`
  })

  // Step 7: Add spacing around operators for readability
  html = html.replace(/([=+\-×÷])/g, ' <span class="mx-0.5">$1</span> ')
  
  // Handle square root symbol
  html = html.replace(/√/g, '<span class="mx-0.5">√</span>')

  // Final cleanup: remove any remaining broken HTML fragments that might have slipped through
  html = html.replace(/="[^"]*">/g, '') // Remove any remaining ="..." >
  html = html.replace(/="[^"]*"/g, '') // Remove any remaining ="..." 
  html = html.replace(/style\s*=\s*"[^"]*"/g, '') // Remove any remaining style="..."
  html = html.replace(/vertical\s*-\s*align[^">;]*/g, '') // Remove any remaining vertical-align
  html = html.replace(/text\s*-\s*xs[^">]*/g, '') // Remove any remaining text-xs
  html = html.replace(/align\s*-\s*baseline[^">;]*/g, '') // Remove any remaining align-baseline

  // Clean up multiple spaces but preserve intentional spacing
  html = html.replace(/\s{2,}/g, ' ').trim()

  return html
}

/**
 * Converts a formula to LaTeX notation for advanced rendering
 * This can be used with libraries like KaTeX or MathJax if needed
 */
export function formatFormulaToLaTeX(formula: string): string {
  let latex = formula

  // Convert subscripts
  latex = latex.replace(/([A-Za-z])_([0-9a-z]+)/g, '$1_{$2}')

  // Convert superscripts
  latex = latex.replace(/([A-Za-z0-9])([²³¹⁰⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ])/g, (match, base, sup) => {
    const superscriptMap: Record<string, string> = {
      '²': '2', '³': '3', '¹': '1', '⁰': '0', '⁴': '4', '⁵': '5',
      '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-',
      '⁼': '=', '⁽': '(', '⁾': ')', 'ⁿ': 'n'
    }
    return `${base}^{${superscriptMap[sup] || sup}}`
  })

  // Convert fractions
  latex = latex.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}')
  latex = latex.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}')

  // Convert square roots
  latex = latex.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
  latex = latex.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')

  // Convert Greek letters to LaTeX commands
  const greekMap: Record<string, string> = {
    'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon',
    'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu', 'π': '\\pi', 'ρ': '\\rho',
    'σ': '\\sigma', 'τ': '\\tau', 'φ': '\\phi', 'ω': '\\omega',
    'Δ': '\\Delta', 'Σ': '\\Sigma', 'Π': '\\Pi'
  }

  Object.entries(greekMap).forEach(([unicode, latexCmd]) => {
    latex = latex.replace(new RegExp(unicode, 'g'), latexCmd)
  })

  // Convert operators
  latex = latex.replace(/×/g, '\\times')
  latex = latex.replace(/÷/g, '\\div')
  latex = latex.replace(/±/g, '\\pm')
  latex = latex.replace(/≈/g, '\\approx')
  latex = latex.replace(/≠/g, '\\neq')
  latex = latex.replace(/≤/g, '\\leq')
  latex = latex.replace(/≥/g, '\\geq')
  latex = latex.replace(/∞/g, '\\infty')

  return latex
}

/**
 * Formats a formula for PDF generation (plain text with better spacing)
 */
export function formatFormulaForPDF(formula: string): string {
  // For PDF, we want clean text with proper spacing
  let pdfFormula = formula

  // Add spacing around operators
  pdfFormula = pdfFormula.replace(/([=+\-×÷])/g, ' $1 ')
  
  // Add spacing around comparison operators
  pdfFormula = pdfFormula.replace(/([≤≥≈≠])/g, ' $1 ')

  // Clean up multiple spaces
  pdfFormula = pdfFormula.replace(/\s+/g, ' ').trim()

  return pdfFormula
}

/**
 * Example usage and test cases
 */
export const formulaExamples = {
  brinell: {
    original: "BHN = 2F/(πD[D-√(D²-Di²)])",
    markdown: "BHN = 2F/(πD[D-√(D²-D<sub>i</sub>²)])",
    html: "BHN = 2F/(πD[D-√(D²-D<sub>i</sub>²)])",
    latex: "BHN = \\frac{2F}{\\pi D[D-\\sqrt{D^{2}-D_{i}^{2}}]}"
  },
  impactEnergy: {
    original: "E = mass × g × (h0 - hf)",
    markdown: "E = mass × g × (h<sub>0</sub> - h<sub>f</sub>)",
    html: "E = mass × g × (h<sub>0</sub> - h<sub>f</sub>)",
    latex: "E = mass \\times g \\times (h_{0} - h_{f})"
  }
}

