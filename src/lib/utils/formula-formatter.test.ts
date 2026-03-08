import {
  formatFormulaToMarkdown,
  formatFormulaToHTML,
  formatFormulaToLaTeX,
  formatFormulaForPDF,
} from './formula-formatter'

describe('formatFormulaToMarkdown', () => {
  it('converts underscore subscripts to HTML sub tags', () => {
    expect(formatFormulaToMarkdown('D_i')).toContain('<sub>')
    expect(formatFormulaToMarkdown('A_0')).toContain('<sub>0</sub>')
  })

  it('converts Unicode superscripts to HTML sup tags', () => {
    expect(formatFormulaToMarkdown('x²')).toContain('<sup>')
  })

  it('preserves Greek letters', () => {
    const result = formatFormulaToMarkdown('σ = F/A')
    expect(result).toContain('σ')
  })

  it('handles square roots', () => {
    expect(formatFormulaToMarkdown('√(x)')).toContain('√')
    expect(formatFormulaToMarkdown('sqrt(x)')).toContain('√')
  })

  it('returns input unchanged when no special chars', () => {
    expect(formatFormulaToMarkdown('simple text')).toBe('simple text')
  })
})

describe('formatFormulaToHTML', () => {
  it('returns empty string for falsy input', () => {
    expect(formatFormulaToHTML('')).toBe('')
    expect(formatFormulaToHTML(null as any)).toBe('')
    expect(formatFormulaToHTML(undefined as any)).toBe('')
  })

  it('strips existing HTML tags', () => {
    const result = formatFormulaToHTML('<b>bold</b>')
    expect(result).not.toContain('<b>')
  })

  it('converts underscore subscripts', () => {
    const result = formatFormulaToHTML('D_i')
    expect(result).toContain('<sub')
    expect(result).toContain('i')
    expect(result).toContain('</sub>')
  })

  it('converts Unicode superscripts', () => {
    const result = formatFormulaToHTML('E²')
    expect(result).toContain('<sup')
    expect(result).toContain('²')
  })

  it('wraps Greek letters in spans', () => {
    const result = formatFormulaToHTML('σ')
    expect(result).toContain('σ')
    expect(result).toContain('italic')
  })

  it('adds spacing around operators', () => {
    const result = formatFormulaToHTML('a=b')
    expect(result).toContain('=')
    expect(result.length).toBeGreaterThan('a=b'.length)
  })
})

describe('formatFormulaToLaTeX', () => {
  it('converts underscore subscripts to LaTeX', () => {
    expect(formatFormulaToLaTeX('D_i')).toBe('D_{i}')
  })

  it('converts Unicode superscripts to LaTeX', () => {
    expect(formatFormulaToLaTeX('x²')).toBe('x^{2}')
    expect(formatFormulaToLaTeX('x³')).toBe('x^{3}')
  })

  it('converts fractions', () => {
    expect(formatFormulaToLaTeX('1/2')).toBe('\\frac{1}{2}')
  })

  it('converts parenthesized fractions', () => {
    expect(formatFormulaToLaTeX('(a+b)/(c+d)')).toBe('\\frac{a+b}{c+d}')
  })

  it('converts square roots', () => {
    expect(formatFormulaToLaTeX('√(x)')).toBe('\\sqrt{x}')
    expect(formatFormulaToLaTeX('sqrt(y)')).toBe('\\sqrt{y}')
  })

  it('converts Greek letters', () => {
    expect(formatFormulaToLaTeX('α')).toBe('\\alpha')
    expect(formatFormulaToLaTeX('β')).toBe('\\beta')
    expect(formatFormulaToLaTeX('π')).toBe('\\pi')
    expect(formatFormulaToLaTeX('Σ')).toBe('\\Sigma')
  })

  it('converts operators', () => {
    expect(formatFormulaToLaTeX('×')).toBe('\\times')
    expect(formatFormulaToLaTeX('÷')).toBe('\\div')
    expect(formatFormulaToLaTeX('±')).toBe('\\pm')
    expect(formatFormulaToLaTeX('≈')).toBe('\\approx')
    expect(formatFormulaToLaTeX('≠')).toBe('\\neq')
    expect(formatFormulaToLaTeX('≤')).toBe('\\leq')
    expect(formatFormulaToLaTeX('≥')).toBe('\\geq')
    expect(formatFormulaToLaTeX('∞')).toBe('\\infty')
  })
})

describe('formatFormulaForPDF', () => {
  it('adds spacing around operators', () => {
    const result = formatFormulaForPDF('a=b+c')
    expect(result).toContain(' = ')
    expect(result).toContain(' + ')
  })

  it('adds spacing around comparison operators', () => {
    expect(formatFormulaForPDF('x≤y')).toContain(' ≤ ')
    expect(formatFormulaForPDF('x≥y')).toContain(' ≥ ')
  })

  it('collapses multiple spaces', () => {
    const result = formatFormulaForPDF('a  =  b')
    expect(result).not.toContain('  ')
  })

  it('trims whitespace', () => {
    const result = formatFormulaForPDF('  a = b  ')
    expect(result).toBe('a = b')
  })
})
