"use client"

import { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface FormulaRendererProps {
  formula: string
  className?: string
  displayMode?: boolean
}

export function FormulaRenderer({ formula, className = '', displayMode = false }: FormulaRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!containerRef.current || !formula) return

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

      // Try to render as LaTeX
      katex.render(cleanFormula, containerRef.current, {
        throwOnError: false,
        displayMode: displayMode,
        errorColor: '#cc0000',
      })
    } catch (error) {
      // Fallback to plain text if KaTeX fails
      if (containerRef.current) {
        containerRef.current.textContent = formula.replace(/<[^>]+>/g, '')
      }
      console.warn('KaTeX rendering failed, falling back to plain text:', error)
    }
  }, [formula, displayMode])

  return <span ref={containerRef} className={className} />
}

