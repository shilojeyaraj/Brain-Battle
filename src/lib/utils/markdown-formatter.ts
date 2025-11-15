/**
 * Markdown Formatter Utility
 * Cleans and formats raw study notes into consistent Markdown for PDF export
 */

/**
 * Removes corrupted Unicode characters and normalizes text
 */
function cleanUnicode(text: string): string {
  return text
    // Remove common corrupted Unicode patterns
    .replace(/�/g, '')
    .replace(/�•�/g, '•')
    .replace(/�E�/g, 'E')
    .replace(/�Ã�/g, 'A')
    .replace(/�µ�/g, 'μ')
    .replace(/�/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Formats a formula for Markdown display
 */
function formatFormulaForMarkdown(formula: string): string {
  // Clean the formula first
  let formatted = cleanUnicode(formula)
  
  // For inline formulas, use backticks
  // For multi-line formulas, use code blocks
  if (formatted.includes('\n') || formatted.length > 50) {
    return `\`\`\`\n${formatted}\n\`\`\``
  }
  
  return `\`${formatted}\``
}

/**
 * Formats practice questions consistently
 */
function formatPracticeQuestion(qa: any, index: number): string {
  const questionType = qa.type?.replace('_', ' ') || 'multiple choice'
  const difficulty = qa.difficulty || 'medium'
  
  let formatted = `**Q${index + 1} (Type: ${questionType}, Difficulty: ${difficulty}):**\n\n`
  formatted += `${cleanUnicode(qa.question)}\n\n`
  
  // Add options for multiple choice
  if (qa.options && Array.isArray(qa.options) && qa.options.length > 0) {
    qa.options.forEach((option: string, optIndex: number) => {
      const letter = String.fromCharCode(65 + optIndex)
      formatted += `${letter}) ${cleanUnicode(option)}\n`
    })
    formatted += '\n'
  }
  
  formatted += `**Answer:** ${cleanUnicode(qa.answer)}\n\n`
  
  if (qa.explanation) {
    formatted += `**Explanation:** ${cleanUnicode(qa.explanation)}\n`
  }
  
  return formatted
}

/**
 * Formats key concepts using the template structure
 */
function formatKeyConcept(concept: any, index: number): string {
  const heading = cleanUnicode(concept.heading || `Concept ${index + 1}`)
  let formatted = `### ${heading}\n\n`
  
  // Extract definition from bullets if available
  const definition = concept.bullets && concept.bullets.length > 0 
    ? cleanUnicode(concept.bullets[0])
    : cleanUnicode(concept.heading)
  
  formatted += `**Definition:** ${definition}\n\n`
  
  // Why it matters (from bullets or description)
  if (concept.bullets && concept.bullets.length > 1) {
    formatted += `**Why It Matters:** ${cleanUnicode(concept.bullets.slice(1).join(' '))}\n\n`
  }
  
  // Formula (if any in the concept)
  // This would need to be extracted from the concept text or linked formulas
  
  // Example
  if (concept.examples && concept.examples.length > 0) {
    formatted += `**Example:** ${cleanUnicode(concept.examples[0])}\n\n`
  }
  
  // Connections
  if (concept.connections && concept.connections.length > 0) {
    formatted += `**Connections:** ${cleanUnicode(concept.connections.join(', '))}\n\n`
  }
  
  return formatted
}

/**
 * Converts study notes to clean, formatted Markdown
 */
export function formatNotesToMarkdown(notes: any): string {
  let markdown = ''
  
  // Title
  markdown += `# ${cleanUnicode(notes.title || 'Study Notes')}\n\n`
  
  // Metadata
  if (notes.subject) {
    markdown += `**Subject:** ${cleanUnicode(notes.subject)}\n`
  }
  if (notes.education_level) {
    markdown += `**Education Level:** ${cleanUnicode(notes.education_level.replace('_', ' '))}\n`
  }
  if (notes.difficulty_level) {
    markdown += `**Difficulty:** ${cleanUnicode(notes.difficulty_level)}\n`
  }
  markdown += '\n---\n\n'
  
  // Overview
  markdown += '## Overview\n\n'
  if (notes.outline && Array.isArray(notes.outline)) {
    notes.outline.forEach((item: string) => {
      markdown += `- ${cleanUnicode(item)}\n`
    })
  }
  markdown += '\n'
  
  // Key Concepts
  markdown += '## Key Concepts\n\n'
  if (notes.concepts && Array.isArray(notes.concepts)) {
    notes.concepts.forEach((concept: any, index: number) => {
      markdown += formatKeyConcept(concept, index)
      markdown += '\n'
    })
  }
  
  // Diagrams
  markdown += '## Diagrams\n\n'
  if (notes.diagrams && Array.isArray(notes.diagrams)) {
    notes.diagrams.forEach((diagram: any, index: number) => {
      markdown += `### ${index + 1}. ${cleanUnicode(diagram.title || `Diagram ${index + 1}`)}\n\n`
      markdown += `${cleanUnicode(diagram.caption || '')}\n\n`
      if (diagram.page) {
        markdown += `*Page ${diagram.page}*\n\n`
      }
    })
  }
  
  // Formula Sheet
  markdown += '## Formula Sheet\n\n'
  if (notes.formulas && Array.isArray(notes.formulas)) {
    notes.formulas.forEach((formula: any, index: number) => {
      markdown += `### ${index + 1}. ${cleanUnicode(formula.name || `Formula ${index + 1}`)}\n\n`
      
      // Formula
      if (formula.formula) {
        markdown += `${formatFormulaForMarkdown(formula.formula)}\n\n`
      }
      
      // Description
      if (formula.description) {
        markdown += `${cleanUnicode(formula.description)}\n\n`
      }
      
      // Variables
      if (formula.variables && Array.isArray(formula.variables)) {
        markdown += '**Variables:**\n'
        formula.variables.forEach((variable: any) => {
          markdown += `- \`${variable.symbol}\`: ${cleanUnicode(variable.meaning || '')}\n`
        })
        markdown += '\n'
      }
      
      // Example
      if (formula.example) {
        markdown += `**Example:** ${cleanUnicode(formula.example)}\n\n`
      }
      
      if (formula.page) {
        markdown += `*Page ${formula.page}*\n\n`
      }
    })
  }
  
  // Practice Questions
  markdown += '## Practice Questions\n\n'
  if (notes.practice_questions && Array.isArray(notes.practice_questions)) {
    notes.practice_questions.forEach((qa: any, index: number) => {
      markdown += formatPracticeQuestion(qa, index)
      markdown += '\n---\n\n'
    })
  }
  
  // Study Tips
  markdown += '## Study Tips\n\n'
  if (notes.study_tips && Array.isArray(notes.study_tips)) {
    notes.study_tips.forEach((tip: string) => {
      markdown += `- ${cleanUnicode(tip)}\n`
    })
    markdown += '\n'
  }
  
  // Common Misconceptions
  markdown += '## Common Misconceptions\n\n'
  if (notes.common_misconceptions && Array.isArray(notes.common_misconceptions)) {
    notes.common_misconceptions.forEach((misconception: any) => {
      markdown += `### ${cleanUnicode(misconception.misconception || 'Misconception')}\n\n`
      markdown += `**Correction:** ${cleanUnicode(misconception.correction || '')}\n\n`
      if (misconception.why_common) {
        markdown += `**Why Common:** ${cleanUnicode(misconception.why_common)}\n\n`
      }
    })
  }
  
  // Resources - Links
  markdown += '## Resources – Links\n\n'
  if (notes.resources?.links && Array.isArray(notes.resources.links)) {
    notes.resources.links.forEach((link: any) => {
      markdown += `- [${cleanUnicode(link.title || 'Link')}](${link.url || '#'})`
      if (link.description) {
        markdown += ` - ${cleanUnicode(link.description)}`
      }
      markdown += '\n'
    })
    markdown += '\n'
  }
  
  // Resources - Videos
  markdown += '## Resources – Videos\n\n'
  if (notes.resources?.videos && Array.isArray(notes.resources.videos)) {
    notes.resources.videos.forEach((video: any) => {
      markdown += `- [${cleanUnicode(video.title || 'Video')}](${video.url || '#'})`
      if (video.description) {
        markdown += ` - ${cleanUnicode(video.description)}`
      }
      if (video.duration) {
        markdown += ` (${cleanUnicode(video.duration)})`
      }
      markdown += '\n'
    })
    markdown += '\n'
  }
  
  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  
  return markdown.trim()
}

