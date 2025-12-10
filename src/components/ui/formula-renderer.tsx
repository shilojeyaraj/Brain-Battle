"use client"

import { useEffect, useRef } from 'react'
import katex from 'katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

interface FormulaRendererProps {
  formula: string
  className?: string
  displayMode?: boolean
}

export function FormulaRenderer({ formula, className = '', displayMode = false }: FormulaRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Log if formula is missing or empty
    if (!formula || formula.trim() === '') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('FormulaRenderer: Empty or missing formula string')
      }
      if (containerRef.current) {
        // SECURITY: Use textContent instead of innerHTML to prevent XSS
        containerRef.current.textContent = 'Formula not available'
        containerRef.current.style.color = '#888'
        containerRef.current.style.fontStyle = 'italic'
      }
      return
    }

    try {
      // Clean the formula first - remove any malformed HTML
      let cleanFormula = formula
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/="[^"]*">?/g, '') // Remove broken attributes
        .replace(/style\s*=\s*"[^"]*"/g, '') // Remove style attributes
        .replace(/class\s*=\s*"[^"]*"/g, '') // Remove class attributes
        .replace(/vertical\s*-\s*align[^">;]*/g, '') // Remove vertical-align fragments
        .replace(/text\s*-\s*xs[^">]*/g, '') // Remove text-xs fragments
        .replace(/align\s*-\s*baseline[^">;]*/g, '') // Remove align-baseline fragments
        .trim()

      // SECURITY: Sanitize formula content to prevent XSS
      cleanFormula = DOMPurify.sanitize(cleanFormula, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [], // No attributes allowed
        KEEP_CONTENT: true, // Keep text content
      })

      // Fix common subscript issues: protect variable names with underscores
      // Pattern: variable name followed by underscore and a descriptive word (e.g., e_lateral, e_longitudinal)
      // These should be treated as variable names, not subscripts
      // Common patterns: e_lateral, e_longitudinal, stress_longitudinal, strain_lateral, etc.
      const longWordPatterns = ['lateral', 'longitudinal', 'tensile', 'compressive', 'shear', 'normal', 'tangential', 'radial', 'axial', 'transverse']
      
      // Replace underscores in variable names with a space or use \text{} for proper rendering
      // For words longer than 2 characters that are descriptive (not mathematical subscripts)
      cleanFormula = cleanFormula.replace(/([a-zA-Z])_([a-z]{4,})/g, (match, letter, word) => {
        // Check if it's a known descriptive word (like "lateral", "longitudinal")
        if (longWordPatterns.some(pattern => word.toLowerCase().includes(pattern))) {
          // Use \text{} to render as regular text, not subscript
          return `${letter}_{\\text{${word}}}`
        }
        // For other long words, also treat as text in subscript
        return `${letter}_{\\text{${word}}}`
      })
      
      // Keep short subscripts as-is (e_0, x_1, D_i, etc.) - these are actual mathematical subscripts
      // Pattern: letter_short (where short is 1-3 chars, numbers, or Greek letters)
      // This is already handled correctly by KaTeX

      // Check if formula is empty after cleaning
      if (!cleanFormula || cleanFormula.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('FormulaRenderer: Formula became empty after cleaning. Original:', formula)
        }
        if (containerRef.current) {
          // SECURITY: Use textContent instead of innerHTML
          containerRef.current.textContent = 'Formula not available'
          containerRef.current.style.color = '#888'
          containerRef.current.style.fontStyle = 'italic'
        }
        return
      }

      // Log the formula being rendered (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('FormulaRenderer: Rendering formula:', cleanFormula)
      }

      // Clear container before rendering
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      // Convert common plain text patterns to LaTeX before rendering
      let latexFormula = cleanFormula
      
      // Fix common function name errors: "In" -> "ln", "in" -> "ln" (when it's natural log)
      latexFormula = latexFormula.replace(/\bIn\s*\(/g, '\\ln(')
      latexFormula = latexFormula.replace(/\bin\s*\(/g, '\\ln(')
      
      // Superscript map for conversion
      const superscriptMap: Record<string, string> = {
        '²': '2', '³': '3', '¹': '1', '⁰': '0', '⁴': '4', '⁵': '5',
        '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-'
      }
      
      // Convert subscripts: l_f -> l_{f}, A_0 -> A_{0}, D_i -> D_{i}
      // Handle both single and multi-character subscripts
      latexFormula = latexFormula.replace(/([A-Za-z0-9\)\]])_([0-9a-z]+)/g, '$1_{$2}')
      
      // Convert superscripts: x² -> x^{2}, x³ -> x^{3}, D² -> D^{2}
      Object.entries(superscriptMap).forEach(([sup, num]) => {
        latexFormula = latexFormula.replace(new RegExp(`([A-Za-z0-9\)\]])${sup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `$1^{${num}}`)
      })
      
      // Convert square roots: √(expression) -> \sqrt{expression}, sqrt(expression) -> \sqrt{expression}
      latexFormula = latexFormula.replace(/√\s*\(([^)]+)\)/g, '\\sqrt{$1}')
      latexFormula = latexFormula.replace(/sqrt\s*\(([^)]+)\)/g, '\\sqrt{$1}')
      latexFormula = latexFormula.replace(/√\s*([A-Za-z0-9_]+)/g, '\\sqrt{$1}')
      
      // Convert fractions: a/b -> \frac{a}{b}
      // Handle complex fractions with parentheses: (a+b)/(c+d) -> \frac{a+b}{c+d}
      latexFormula = latexFormula.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}')
      // Handle simple fractions: number/number or variable/variable
      latexFormula = latexFormula.replace(/(\d+|[A-Za-z_]+)\s*\/\s*(\d+|[A-Za-z_]+)/g, (match, num, den) => {
        // Skip if it's part of a larger expression that's already been converted
        if (match.includes('\\frac') || match.includes('\\sqrt')) return match
        return `\\frac{${num}}{${den}}`
      })
      
      // Convert Greek letters to LaTeX commands (if not already)
      const greekMap: Record<string, string> = {
        'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon',
        'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu', 'π': '\\pi', 'ρ': '\\rho',
        'σ': '\\sigma', 'τ': '\\tau', 'φ': '\\phi', 'ω': '\\omega',
        'Δ': '\\Delta', 'Σ': '\\Sigma', 'Π': '\\Pi', 'Ω': '\\Omega'
      }
      Object.entries(greekMap).forEach(([unicode, latexCmd]) => {
        // Only replace if not already a LaTeX command
        if (!latexFormula.includes(latexCmd)) {
          latexFormula = latexFormula.replace(new RegExp(unicode, 'g'), latexCmd)
        }
      })
      
      // Convert operators to LaTeX
      latexFormula = latexFormula.replace(/×/g, '\\times')
      latexFormula = latexFormula.replace(/÷/g, '\\div')
      latexFormula = latexFormula.replace(/±/g, '\\pm')
      latexFormula = latexFormula.replace(/≈/g, '\\approx')
      latexFormula = latexFormula.replace(/≠/g, '\\neq')
      latexFormula = latexFormula.replace(/≤/g, '\\leq')
      latexFormula = latexFormula.replace(/≥/g, '\\geq')
      latexFormula = latexFormula.replace(/∞/g, '\\infty')
      
      // Convert percentages: % -> \%
      latexFormula = latexFormula.replace(/%/g, '\\%')
      
      // Handle complex nested expressions: improve fraction handling in denominators/numerators
      // Example: 2F/(πD[D-√(D²-D_i²)]) should become \frac{2F}{\pi D[D-\sqrt{D^2-D_i^2}]}
      // This is a more complex pattern that needs careful handling
      
      // Try to render as LaTeX
      let renderSuccess = false
      try {
        katex.render(latexFormula, containerRef.current, {
          throwOnError: false,
          displayMode: displayMode,
          errorColor: '#ff6b6b', // Red for errors
          strict: false, // Allow more flexible parsing
        })
        renderSuccess = true
      } catch (renderError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('KaTeX render error (non-fatal):', renderError, 'Formula:', latexFormula)
        }
        renderSuccess = false
      }

      // Force text color on KaTeX-rendered elements to ensure visibility
      // KaTeX CSS might override Tailwind classes, so we need to set it directly
      if (containerRef.current) {
        const katexElements = containerRef.current.querySelectorAll('.katex, .katex *')
        
        if (katexElements.length === 0 && renderSuccess) {
          // KaTeX rendered but no elements found - might be a CSS issue
          if (process.env.NODE_ENV === 'development') {
            console.warn('FormulaRenderer: KaTeX rendered but no elements found. Formula:', cleanFormula)
          }
        }
        
        katexElements.forEach((el) => {
          const htmlEl = el as HTMLElement
          // Ensure text is visible - use brighter blue color (#bfdbfe = blue-200)
          htmlEl.style.color = '#bfdbfe' // blue-200 - brighter for better visibility
          // Ensure background is transparent so dark background shows through
          htmlEl.style.backgroundColor = 'transparent'
          // Ensure font is visible and slightly larger
          htmlEl.style.opacity = '1'
          htmlEl.style.fontSize = '1.1em' // Slightly larger for better readability
          // Allow wrapping for long formulas
          if (el.classList.contains('katex-display')) {
            htmlEl.style.overflowX = 'auto'
            htmlEl.style.overflowY = 'hidden'
            htmlEl.style.maxWidth = '100%'
          }
        })
        
        // Set container styles for overflow handling
        containerRef.current.style.color = '#bfdbfe' // blue-200 - brighter
        containerRef.current.style.opacity = '1'
        containerRef.current.style.maxWidth = '100%'
        containerRef.current.style.overflowX = 'hidden' // Changed from 'auto' to 'hidden' - we'll scale instead
        containerRef.current.style.overflowY = 'hidden'
        
        // Make KaTeX elements responsive and scale down if needed
        const katexDisplay = containerRef.current.querySelector('.katex-display')
        const katexInline = containerRef.current.querySelector('.katex:not(.katex-display)')
        const katexElement = (katexDisplay || katexInline) as HTMLElement
        
        if (katexElement) {
          // Reset any previous transforms
          katexElement.style.transform = 'scale(1)'
          katexElement.style.transformOrigin = 'center center'
          
          // Use requestAnimationFrame to ensure DOM is fully rendered
          requestAnimationFrame(() => {
            if (!containerRef.current || !katexElement) return
            
            // Get the container's available width (accounting for padding)
            const container = containerRef.current.parentElement
            if (!container) return
            
            const containerWidth = container.clientWidth
            const containerPadding = 48 // 24px padding on each side (p-6 = 1.5rem = 24px)
            const availableWidth = containerWidth - containerPadding
            
            // Get the formula's actual width
            const formulaWidth = katexElement.scrollWidth
            
            // If formula is wider than available space, scale it down
            if (formulaWidth > availableWidth && availableWidth > 0) {
              const scaleFactor = availableWidth / formulaWidth
              // Ensure minimum scale of 0.5 to keep it readable
              const finalScale = Math.max(scaleFactor, 0.5)
              
              katexElement.style.transform = `scale(${finalScale})`
              katexElement.style.transformOrigin = 'center center'
              katexElement.style.width = `${formulaWidth}px` // Keep original width for proper centering
              katexElement.style.maxWidth = 'none' // Allow it to be wider, we'll scale it
            } else {
              // Formula fits, ensure no scaling
              katexElement.style.transform = 'scale(1)'
              katexElement.style.maxWidth = '100%'
            }
          })
        }
        
        // If no KaTeX elements were created, show the formula as formatted plain text
        if (katexElements.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('FormulaRenderer: Falling back to formatted text display. Formula:', cleanFormula)
          }
          
          // Format the formula with HTML for better display
          let formattedText = cleanFormula
          
          // Convert subscripts to HTML: l_f -> l<sub>f</sub>
          formattedText = formattedText.replace(/([A-Za-z])_([0-9a-z]+)/g, '$1<sub>$2</sub>')
          
          // Convert superscripts to HTML: x² -> x<sup>2</sup>
          Object.entries(superscriptMap).forEach(([sup, num]) => {
            formattedText = formattedText.replace(new RegExp(`([A-Za-z0-9])${sup}`, 'g'), `$1<sup>${num}</sup>`)
          })
          
          // Use dangerouslySetInnerHTML for formatted text (we've already sanitized)
          containerRef.current.innerHTML = DOMPurify.sanitize(formattedText, {
            ALLOWED_TAGS: ['sub', 'sup'],
            ALLOWED_ATTR: [],
          })
          containerRef.current.style.fontSize = '1.4em' // Larger for better readability
          containerRef.current.style.fontFamily = 'system-ui, -apple-system, sans-serif'
          containerRef.current.style.color = '#bfdbfe' // blue-200 - brighter
          containerRef.current.style.lineHeight = '1.8' // More spacing for readability
          containerRef.current.style.fontWeight = '500' // Medium weight for better visibility
          
          // Scale down plain text formulas if they overflow
          requestAnimationFrame(() => {
            if (!containerRef.current) return
            
            const container = containerRef.current.parentElement
            if (!container) return
            
            const containerWidth = container.clientWidth
            const containerPadding = 48
            const availableWidth = containerWidth - containerPadding
            const formulaWidth = containerRef.current.scrollWidth
            
            if (formulaWidth > availableWidth && availableWidth > 0) {
              const scaleFactor = availableWidth / formulaWidth
              const finalScale = Math.max(scaleFactor, 0.5)
              
              containerRef.current.style.transform = `scale(${finalScale})`
              containerRef.current.style.transformOrigin = 'center center'
              containerRef.current.style.width = `${formulaWidth}px`
            } else {
              containerRef.current.style.transform = 'scale(1)'
            }
          })
        }
      }
    } catch (error) {
      // Fallback to plain text if KaTeX fails
      console.error('KaTeX rendering error:', error, 'Formula:', formula)
      if (containerRef.current) {
        // SECURITY: Sanitize before displaying
        const sanitized = DOMPurify.sanitize(formula, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          KEEP_CONTENT: true,
        }).replace(/<[^>]+>/g, '').trim()
        
        // If we have cleaned text, show it as plain text
        if (sanitized) {
          containerRef.current.textContent = sanitized
          containerRef.current.style.fontSize = '1.2em'
          containerRef.current.style.fontFamily = 'monospace'
          
          // Scale down if it overflows
          requestAnimationFrame(() => {
            if (!containerRef.current) return
            
            const container = containerRef.current.parentElement
            if (!container) return
            
            const containerWidth = container.clientWidth
            const containerPadding = 48
            const availableWidth = containerWidth - containerPadding
            const formulaWidth = containerRef.current.scrollWidth
            
            if (formulaWidth > availableWidth && availableWidth > 0) {
              const scaleFactor = availableWidth / formulaWidth
              const finalScale = Math.max(scaleFactor, 0.5)
              
              containerRef.current.style.transform = `scale(${finalScale})`
              containerRef.current.style.transformOrigin = 'center center'
              containerRef.current.style.width = `${formulaWidth}px`
            } else {
              containerRef.current.style.transform = 'scale(1)'
            }
          })
        } else {
          // SECURITY: Use textContent instead of innerHTML
          containerRef.current.textContent = 'Formula not available'
          containerRef.current.style.color = '#888'
          containerRef.current.style.fontStyle = 'italic'
        }
      }
    }
  }, [formula, displayMode])

  return (
    <span 
      ref={containerRef} 
      className={className}
      style={{ 
        color: '#bfdbfe', // blue-200 - brighter for better visibility
        display: 'inline-block',
        minHeight: '1em',
        maxWidth: '100%',
        overflowX: 'hidden', // Changed to hidden - we scale instead of scroll
        overflowY: 'hidden',
        wordBreak: 'break-word',
        wordWrap: 'break-word',
        fontWeight: '500', // Medium weight for better visibility
      }}
    />
  )
}

