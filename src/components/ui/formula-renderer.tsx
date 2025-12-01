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
      
      // Superscript map for conversion
      const superscriptMap: Record<string, string> = {
        '²': '2', '³': '3', '¹': '1', '⁰': '0', '⁴': '4', '⁵': '5',
        '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-'
      }
      
      // Convert subscripts: l_f -> l_{f}, A_0 -> A_{0}
      latexFormula = latexFormula.replace(/([A-Za-z])_([0-9a-z]+)/g, '$1_{$2}')
      
      // Convert superscripts: x² -> x^{2}, x³ -> x^{3}
      Object.entries(superscriptMap).forEach(([sup, num]) => {
        latexFormula = latexFormula.replace(new RegExp(`([A-Za-z0-9])${sup.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `$1^{${num}}`)
      })
      
      // Convert fractions: a/b -> \frac{a}{b} (but be careful with complex expressions)
      // Only convert simple fractions (number/number or single variable/variable)
      latexFormula = latexFormula.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}')
      latexFormula = latexFormula.replace(/([A-Za-z])\s*\/\s*([A-Za-z])/g, '\\frac{$1}{$2}')
      
      // Convert percentages: % -> \%
      latexFormula = latexFormula.replace(/%/g, '\\%')
      
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
          // Ensure text is visible - use blue-300 color (#93c5fd)
          htmlEl.style.color = '#93c5fd' // blue-300 - force visibility
          // Ensure background is transparent so dark background shows through
          htmlEl.style.backgroundColor = 'transparent'
          // Ensure font is visible
          htmlEl.style.opacity = '1'
        })
        
        // Also set color on the container itself
        containerRef.current.style.color = '#93c5fd' // blue-300
        containerRef.current.style.opacity = '1'
        
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
          containerRef.current.style.fontSize = '1.25em'
          containerRef.current.style.fontFamily = 'system-ui, -apple-system, sans-serif'
          containerRef.current.style.color = '#93c5fd' // blue-300
          containerRef.current.style.lineHeight = '1.6'
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
        color: '#93c5fd', // blue-300 - ensure visibility
        display: 'inline-block',
        minHeight: '1em',
      }}
    />
  )
}

