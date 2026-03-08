import { distillContent } from './distillation'

describe('distillContent', () => {
  it('returns empty string for empty input', () => {
    expect(distillContent([])).toBe('')
    expect(distillContent([''])).toBe('')
  })

  it('deduplicates identical lines', () => {
    const result = distillContent(['Hello: definition\nHello: definition\nWorld: definition\nWorld: definition'])
    expect(result.match(/Hello/g)?.length).toBe(1)
    expect(result.match(/World/g)?.length).toBe(1)
  })

  it('preserves order after deduplication', () => {
    const result = distillContent(['Alpha: first\nBeta: second\nAlpha: first\nGamma: third'])
    const lines = result.split('\n')
    expect(lines[0]).toContain('Alpha')
    expect(lines[1]).toContain('Beta')
  })

  it('prioritizes heading-like lines (capitalized, short)', () => {
    const input = [
      'Introduction to Physics\nForce and Motion\nEnergy Conservation'
    ]
    const result = distillContent(input)
    expect(result).toContain('Introduction to Physics')
    expect(result).toContain('Force and Motion')
  })

  it('prioritizes lines with formulas/symbols', () => {
    const input = ['E = mc²\nF = ma']
    const result = distillContent(input)
    expect(result).toContain('E = mc²')
    expect(result).toContain('F = ma')
  })

  it('prioritizes lines with colons (definitions)', () => {
    const input = ['Velocity: the rate of change of displacement']
    const result = distillContent(input)
    expect(result).toContain('Velocity: the rate of change of displacement')
  })

  it('respects maxLength parameter', () => {
    const lines = Array.from({ length: 500 }, (_, i) => `Line ${i}: content`).join('\n')
    const result = distillContent([lines], 200)
    expect(result.length).toBeLessThanOrEqual(220)
  })

  it('skips lines that individually exceed maxLength', () => {
    const longLine = 'A'.repeat(200)
    const result = distillContent([longLine], 50)
    // The single line is >50 chars so it never gets added; result is empty
    expect(result).toBe('')
  })

  it('handles multiple file contents joined together', () => {
    const result = distillContent(['File 1: content', 'File 2: content'])
    expect(result).toContain('File 1: content')
    expect(result).toContain('File 2: content')
  })

  it('trims whitespace from lines', () => {
    const result = distillContent(['  Trimmed: yes  \n  Content: yes  '])
    expect(result).toContain('Trimmed: yes')
    expect(result).toContain('Content: yes')
  })

  it('drops empty lines', () => {
    const result = distillContent(['Line1: a\n\n\n\nLine2: b'])
    const lines = result.split('\n')
    expect(lines.every(l => l.length > 0)).toBe(true)
  })

  it('falls back to unique lines when no prioritized lines found', () => {
    const input = ['all lowercase no special chars here and it is long enough to not be a heading by any stretch of the imagination']
    const result = distillContent(input)
    expect(result.length).toBeGreaterThan(0)
  })

  it('hard truncates when a single accepted line exceeds max', () => {
    // Create content where accumulated result exceeds maxLength
    const lines = Array.from({ length: 20 }, (_, i) => `Heading ${i}: short`).join('\n')
    const result = distillContent([lines], 50)
    expect(result.length).toBeLessThanOrEqual(70)
  })
})
