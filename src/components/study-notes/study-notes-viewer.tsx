"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Lightbulb,
  Image,
  Play,
  ChevronLeft,
  ChevronRight,
  Download,
  ChevronDown,
  ChevronUp,
  Info,
  Calculator,
  Youtube,
  FileText,
  Share2,
  Copy
} from "lucide-react"
import { StudyNotes } from "@/lib/schemas/notes-schema"
import { formatFormulaForPDF } from "@/lib/utils/formula-formatter"
import { formatNotesToMarkdown } from "@/lib/utils/markdown-formatter"
import { FormulaRenderer } from "@/components/ui/formula-renderer"

interface StudyNotesViewerProps {
  notes: StudyNotes
  onStartBattle: () => void
  fileNames?: string[]
}

export function StudyNotesViewer({ notes, onStartBattle, fileNames }: StudyNotesViewerProps) {
  const [activeSection, setActiveSection] = useState<"outline" | "concepts" | "diagrams" | "formulas" | "videos" | "quiz">("outline")
  const [currentDiagram, setCurrentDiagram] = useState(0)
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set())
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null)
  const [hoveredTermPosition, setHoveredTermPosition] = useState<{ x: number; y: number; transform?: string } | null>(null)
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isPro, setIsPro] = useState(false)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)

  // Safety: Ensure diagrams and concepts are arrays
  const diagrams = Array.isArray(notes.diagrams) ? notes.diagrams : []
  const concepts = Array.isArray(notes.concepts) ? notes.concepts : []

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Get userId from session cookie API
        const userResponse = await fetch('/api/user/current')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.success && userData.userId) {
            const statusResponse = await fetch(`/api/subscription/status?userId=${userData.userId}`)
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              setIsPro(statusData.isPro || false)
            }
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
        // Default to free if check fails
        setIsPro(false)
      } finally {
        setSubscriptionLoading(false)
      }
    }

    checkSubscription()
  }, [])

  // Filter sections based on subscription - diagrams only for pro users
  const allSections = [
    { id: "outline", label: "Outline", icon: BookOpen },
    { id: "concepts", label: "Concepts", icon: Lightbulb },
    { id: "diagrams", label: "Diagrams", icon: Image },
    { id: "videos", label: "Videos", icon: Youtube },
    { id: "formulas", label: "Formulas", icon: Calculator },
    { id: "quiz", label: "Quiz Prep", icon: Play }
  ] as const

  // Show all sections - diagrams are now available for all users
  const sections = allSections

  const toggleOutlineItem = (index: number) => {
    const newExpanded = new Set(expandedOutlineItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedOutlineItems(newExpanded)
  }

  const toggleCardFlip = (index: number) => {
    const newFlipped = new Set(flippedCards)
    if (newFlipped.has(index)) {
      // If card is already flipped, move to next card
      if (index < notes.practice_questions.length - 1) {
        setCurrentCardIndex(index + 1)
        newFlipped.delete(index)
        newFlipped.delete(index + 1) // Reset next card to question side
      } else {
        // Last card, just flip back
        newFlipped.delete(index)
      }
    } else {
      // Flip to show answer
      newFlipped.add(index)
    }
    setFlippedCards(newFlipped)
  }

  const handleDownloadMarkdown = () => {
    try {
      const cleanMarkdown = formatNotesToMarkdown(notes)
      const blob = new Blob([cleanMarkdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${notes.title || 'study-notes'}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading markdown:', error)
      alert('Failed to download markdown file')
    }
  }

  const handleShareNotes = async () => {
    try {
      const cleanMarkdown = formatNotesToMarkdown(notes)
      const shareData = {
        title: notes.title || 'Study Notes',
        text: cleanMarkdown.substring(0, 1000) + '...', // Preview
        url: window.location.href,
      }

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(cleanMarkdown)
        alert('Notes copied to clipboard!')
      }
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing notes:', error)
        // Fallback: Copy to clipboard
        try {
          const cleanMarkdown = formatNotesToMarkdown(notes)
          await navigator.clipboard.writeText(cleanMarkdown)
          alert('Notes copied to clipboard!')
        } catch (clipboardError) {
          alert('Failed to share notes. Please try downloading instead.')
        }
      }
    }
  }

  const handleDownloadNotes = async () => {
    try {
      // First, convert notes to clean markdown format
      const cleanMarkdown = formatNotesToMarkdown(notes)
      
      // Dynamically import jsPDF
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      
      let yPosition = 20
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const maxWidth = pageWidth - (margin * 2)
      const lineHeight = 7
      const sectionSpacing = 10
      
      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
        // Clean Unicode characters before adding
        const cleanText = text.replace(/�/g, '').replace(/\s+/g, ' ').trim()
        if (!cleanText) return
        
        doc.setFontSize(fontSize)
        doc.setTextColor(color[0], color[1], color[2])
        if (isBold) {
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setFont('helvetica', 'normal')
        }
        
        const lines = doc.splitTextToSize(cleanText, maxWidth)
        
        // Check if we need a new page
        if (yPosition + (lines.length * lineHeight) > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        
        doc.text(lines, margin, yPosition)
        yPosition += lines.length * lineHeight
      }
      
      // Parse markdown and convert to PDF
      // Remove markdown syntax and convert to plain text for PDF
      const parseMarkdownToPDF = (markdown: string) => {
        const lines = markdown.split('\n')
        for (const line of lines) {
          // Skip empty lines
          if (!line.trim()) {
            yPosition += lineHeight / 2
            continue
          }
          
          // Headers
          if (line.startsWith('# ')) {
            addText(line.replace(/^# /, ''), 20, true, [0, 0, 0])
            yPosition += 5
          } else if (line.startsWith('## ')) {
            addText(line.replace(/^## /, ''), 16, true, [0, 0, 0])
            yPosition += sectionSpacing
          } else if (line.startsWith('### ')) {
            addText(line.replace(/^### /, ''), 14, true, [0, 0, 0])
            yPosition += 3
          } else if (line.startsWith('**') && line.endsWith('**')) {
            // Bold text
            const text = line.replace(/\*\*/g, '')
            addText(text, 12, true, [0, 0, 0])
          } else if (line.startsWith('- ')) {
            // Bullet point
            addText(line.replace(/^- /, '• '), 12, false, [0, 0, 0])
          } else if (line.match(/^\d+\. /)) {
            // Numbered list
            addText(line, 12, false, [0, 0, 0])
          } else if (line.startsWith('`') && line.endsWith('`')) {
            // Code/inline formula
            const formula = line.replace(/`/g, '')
            doc.setFont('courier', 'bold')
            doc.setFontSize(12)
            doc.setTextColor(0, 100, 200)
            const formulaLines = doc.splitTextToSize(formula, maxWidth)
            if (yPosition + (formulaLines.length * lineHeight) > pageHeight - margin) {
              doc.addPage()
              yPosition = margin
            }
            doc.text(formulaLines, margin, yPosition)
            yPosition += formulaLines.length * lineHeight
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(12)
            doc.setTextColor(0, 0, 0)
          } else if (line.startsWith('```')) {
            // Code block - skip the markers
            continue
          } else if (line.match(/^[A-Z]\)/)) {
            // Multiple choice option
            addText(line, 12, false, [0, 0, 0])
          } else if (line.startsWith('---')) {
            // Horizontal rule
            yPosition += sectionSpacing
          } else {
            // Regular text
            addText(line, 12, false, [0, 0, 0])
          }
        }
      }
      
      // Convert markdown to PDF
      parseMarkdownToPDF(cleanMarkdown)
      
      // Save the PDF
      const fileName = `${notes.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_study_notes.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error downloading notes:', error)
      alert('Failed to download notes. Please try again.')
    }
  }

  // Generate detailed content for outline items based on the topic
  const generateOutlineDetails = (outlineItem: string, index: number) => {
    const topic = notes.title.toLowerCase()
    
    // Find related concepts and diagrams
    const relatedConcepts = concepts.filter(concept => 
      concept.heading.toLowerCase().includes(outlineItem.toLowerCase().split(' ')[0]) ||
      outlineItem.toLowerCase().includes(concept.heading.toLowerCase().split(' ')[0]) ||
      concept.heading.toLowerCase().includes(outlineItem.toLowerCase()) ||
      outlineItem.toLowerCase().includes(concept.heading.toLowerCase())
    )
    
    const relatedDiagrams = diagrams.filter(diagram =>
      diagram.title.toLowerCase().includes(outlineItem.toLowerCase().split(' ')[0]) ||
      outlineItem.toLowerCase().includes(diagram.title.toLowerCase().split(' ')[0]) ||
      diagram.title.toLowerCase().includes(outlineItem.toLowerCase()) ||
      outlineItem.toLowerCase().includes(diagram.title.toLowerCase())
    )

    // Extract actual content from related concepts
    let description = ""
    let keyPoints: string[] = []
    let examples: string[] = []
    
    if (relatedConcepts.length > 0) {
      // Use the first related concept's content
      const primaryConcept = relatedConcepts[0]
      
      // Build description from concept bullets
      if (primaryConcept.bullets && primaryConcept.bullets.length > 0) {
        description = primaryConcept.bullets.slice(0, 3).join(' ')
        if (primaryConcept.bullets.length > 3) {
          description += ' ' + primaryConcept.bullets.slice(3).join(' ')
        }
      } else {
        description = `${primaryConcept.heading}: ${outlineItem} as covered in the study materials.`
      }
      
      // Extract key points from concept bullets
      if (primaryConcept.bullets && primaryConcept.bullets.length > 0) {
        keyPoints = primaryConcept.bullets.slice(0, 5).map(bullet => bullet.trim())
      }
      
      // Use actual examples from concept
      if (primaryConcept.examples && primaryConcept.examples.length > 0) {
        examples = primaryConcept.examples
      }
      
      // If we have connections, add them as additional context
      if (primaryConcept.connections && primaryConcept.connections.length > 0 && examples.length < 3) {
        examples = [...examples, ...primaryConcept.connections.slice(0, 3 - examples.length)]
      }
    } else {
      // Fallback: search for any concept that might be related
      const allBullets = concepts.flatMap(c => c.bullets || [])
      const matchingBullets = allBullets.filter(bullet => 
        bullet.toLowerCase().includes(outlineItem.toLowerCase().split(' ')[0]) ||
        outlineItem.toLowerCase().split(' ').some(word => bullet.toLowerCase().includes(word))
      )
      
      if (matchingBullets.length > 0) {
        description = matchingBullets.slice(0, 2).join(' ')
        keyPoints = matchingBullets.slice(0, 5)
      } else {
        // Last resort: use outline item with context
        description = `${outlineItem} as described in the study materials.`
        keyPoints = [`Review the main concepts related to ${outlineItem.toLowerCase()}`]
      }
    }
    
    // If no examples found, try to extract from all concepts
    if (examples.length === 0) {
      const allExamples = concepts.flatMap(c => c.examples || [])
      const matchingExamples = allExamples.filter(example =>
        example.toLowerCase().includes(outlineItem.toLowerCase().split(' ')[0]) ||
        outlineItem.toLowerCase().split(' ').some(word => example.toLowerCase().includes(word))
      )
      examples = matchingExamples.slice(0, 3)
    }

    return {
      description: description || `${outlineItem} as covered in the study materials.`,
      examples: examples.length > 0 ? examples : [],
      keyPoints: keyPoints.length > 0 ? keyPoints : [],
      relatedConcepts,
      relatedDiagrams
    }
  }

  // Generate definitions for key terms
  const generateTermDefinition = (term: string) => {
    const topic = notes.title.toLowerCase()
    
    // Create contextual definitions based on the study topic
    const definitions: Record<string, string> = {
      "material properties": "The physical and chemical characteristics that define how a material behaves under different conditions, including mechanical, thermal, and electrical properties.",
      "stress-strain curve": "A graphical representation showing the relationship between stress (force per unit area) and strain (deformation) in a material, revealing its mechanical behavior.",
      "microstructure": "The microscopic structure of a material, including grain size, phase distribution, and defects that influence material properties.",
      "thermal conductivity": "A material's ability to conduct heat, measured as the rate of heat transfer through a material per unit temperature gradient.",
      "environmental degradation": "The deterioration of material properties due to exposure to environmental factors like temperature, humidity, chemicals, or radiation.",
      "mechanical testing": "Laboratory procedures used to determine material properties such as strength, hardness, toughness, and fatigue resistance.",
      "fatigue resistance": "A material's ability to withstand repeated loading cycles without failure, important for components subject to cyclic stresses.",
      "tensile strength": "The maximum stress a material can withstand while being stretched or pulled before breaking.",
      "elastic modulus": "A measure of a material's stiffness, representing the ratio of stress to strain in the elastic deformation region.",
      "yield point": "The stress level at which a material begins to deform plastically (permanently) rather than elastically."
    }
    
    return definitions[term.toLowerCase()] || `A key concept in ${topic} that relates to the fundamental principles and applications covered in this study material.`
  }

  return (
    <div className="w-full px-4 xl:px-8 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {notes.title}
        </h1>
        <p className="text-blue-100/70 font-bold">
          Study notes generated from {fileNames && fileNames.length > 0 ? `${fileNames.length} document${fileNames.length > 1 ? 's' : ''}` : 'your documents'}
        </p>
        {fileNames && fileNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 justify-center">
            {fileNames.map((fileName, index) => (
              <Badge key={index} className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">
                {fileName}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-2 p-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                variant={activeSection === section.id ? "default" : "ghost"}
                className={`flex items-center gap-2 px-4 py-2 font-black border-2 ${
                  activeSection === section.id
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400"
                    : "border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={3} />
                {section.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-7 xl:col-span-8 order-1">
          {activeSection === "outline" && (
            <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
              <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-blue-400" strokeWidth={3} />
                Study Outline
              </h2>
              <div className="space-y-3">
                {notes.outline.map((point, index) => {
                  const isExpanded = expandedOutlineItems.has(index)
                  const details = generateOutlineDetails(point, index)
                  
                  return (
                    <div key={index} className="rounded-xl bg-slate-700/50 border-2 border-slate-600/50 overflow-hidden">
                      <div 
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-700/70 transition-colors"
                        onClick={() => toggleOutlineItem(index)}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 border-2 border-blue-400">
                          {index + 1}
                        </div>
                        <p className="text-white font-bold flex-1">{point}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" strokeWidth={3} />
                          ) : (
                            <ChevronDown className="h-4 w-4" strokeWidth={3} />
                          )}
                        </Button>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t border-slate-600/50 pt-4">
                          {/* Description */}
                          <div>
                            <h4 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                              <Info className="h-4 w-4 text-blue-400" strokeWidth={3} />
                              Description
                            </h4>
                            <p className="text-sm text-blue-100/70 font-bold">{details.description}</p>
                          </div>
                          
                          {/* Key Points */}
                          <div>
                            <h4 className="text-sm font-black text-white mb-2">Key Points</h4>
                            <ul className="space-y-1">
                              {details.keyPoints.map((keyPoint, keyIndex) => (
                                <li key={keyIndex} className="flex items-start gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                                  <span className="text-blue-100/70 font-bold">{keyPoint}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* Examples */}
                          {details.examples.length > 0 && (
                            <div>
                              <h4 className="text-sm font-black text-white mb-2">Examples</h4>
                              <ul className="space-y-1">
                                {details.examples.map((example, exampleIndex) => (
                                  <li key={exampleIndex} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                                    <span className="text-blue-100/70 font-bold">{example}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Related Concepts */}
                          {details.relatedConcepts.length > 0 && (
                            <div>
                              <h4 className="text-sm font-black text-white mb-2">Related Concepts</h4>
                              <div className="flex flex-wrap gap-2">
                                {details.relatedConcepts.map((concept, conceptIndex) => (
                                  <Badge key={conceptIndex} className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">
                                    {concept.heading}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Related Diagrams */}
                          {details.relatedDiagrams.length > 0 && (
                            <div>
                              <h4 className="text-sm font-black text-white mb-2">Related Diagrams</h4>
                              <div className="flex flex-wrap gap-2">
                                {details.relatedDiagrams.map((diagram, diagramIndex) => (
                                  <Badge key={diagramIndex} className="border-2 border-orange-400/50 bg-orange-500/20 text-orange-300 font-bold">
                                    {diagram.title}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {activeSection === "concepts" && (
            <div className="space-y-6">
              {concepts.map((concept, index) => (
                <Card key={index} className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
                  <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-orange-400" strokeWidth={3} />
                    {concept.heading}
                  </h3>
                  <ul className="space-y-2">
                    {concept.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                        <p className="text-white font-bold">{bullet}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}

          {activeSection === "diagrams" && (
            <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
              <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <Image className="h-6 w-6 text-orange-400" strokeWidth={3} />
                Diagrams & Figures
              </h2>
              
              {diagrams.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-blue-100/70 font-bold mb-4">
                    Diagram extraction from PDFs is still experimental. For now, use this list to
                    quickly jump back into your original document and review each key figure. Open
                    the pages listed below in your study file and use the descriptions to focus on
                    what each diagram is trying to teach you.
                  </p>

                  {/* Diagram list as textual references */}
                  <div className="space-y-4">
                    {diagrams.map((diagram, index) => (
                      <Card
                        key={index}
                        className="p-4 bg-slate-700/50 border-2 border-slate-600/60"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text-lg font-black text-white">
                              {diagram.title || `Figure ${index + 1}`}
                            </h3>
                            {diagram.page && (
                              <p className="text-xs text-blue-100/70 font-bold mt-1">
                                Where to find it:{" "}
                                <span className="text-blue-200">
                                  Page {diagram.page} of your uploaded document
                                </span>
                              </p>
                            )}
                          </div>
                          <Badge
                            className={`font-black ${
                              diagram.source === "file"
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {diagram.source === "file" ? "From Document" : "Web Image"}
                          </Badge>
                        </div>

                        {diagram.caption && (
                          <div className="mt-2">
                            <h4 className="text-xs font-black text-white mb-1 uppercase tracking-wide">
                              What this figure shows
                            </h4>
                            <p className="text-sm text-blue-100/80 font-bold leading-relaxed">
                              {diagram.caption}
                            </p>
                          </div>
                        )}

                        {diagram.keywords && diagram.keywords.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-xs font-black text-white mb-1 uppercase tracking-wide">
                              Useful search keywords (for finding similar diagrams online)
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {diagram.keywords.map((kw, kwIndex) => (
                                <Badge
                                  key={kwIndex}
                                  className="border-2 border-blue-400/40 bg-blue-500/15 text-blue-200 font-bold text-[11px] px-2 py-0.5"
                                >
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Image className="h-16 w-16 text-blue-300/50 mx-auto mb-4" strokeWidth={1} />
                  <p className="text-blue-100/70 font-bold mb-2">
                    No diagrams were extracted automatically from this document.
                  </p>
                  <p className="text-sm text-blue-100/60 font-bold max-w-xl mx-auto">
                    This can happen with scanned PDFs or complex layouts. For now, use the figures
                    directly in your original study files as visual support while reviewing the
                    outline, concepts, and formula sections here.
                  </p>
                </div>
              )}
            </Card>
          )}

          {activeSection === "videos" && (
            <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                <Youtube className="h-6 w-6 text-red-500" strokeWidth={3} />
                Video Lessons
              </h2>
              {notes.resources?.videos && Array.isArray(notes.resources.videos) && notes.resources.videos.length > 0 ? (
                <div className="space-y-6">
                  {notes.resources.videos.map((video: any, index: number) => {
                    const url = typeof video.url === "string" ? video.url : ""
                    let embedId: string | null = null
                    if (url) {
                      const watchMatch = url.match(/[?&]v=([\w-]+)/i)
                      const shortMatch = url.match(/youtu\.be\/([\w-]+)/i)
                      const embedMatch = url.match(/embed\/([\w-]+)/i)
                      const vMatch = url.match(/\/v\/([\w-]+)/i)
                      embedId =
                        (watchMatch && watchMatch[1]) ||
                        (shortMatch && shortMatch[1]) ||
                        (embedMatch && embedMatch[1]) ||
                        (vMatch && vMatch[1]) ||
                        null
                    }
                    const embedUrl = embedId ? `https://www.youtube.com/embed/${embedId}` : null

                    return (
                      <Card key={index} className="p-4 bg-slate-800/70 border-2 border-slate-600/60">
                        {embedUrl ? (
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-black mb-3">
                            <iframe
                              src={embedUrl}
                              title={video.title || `Video ${index + 1}`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 mb-3 flex items-center justify-center">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-300 font-bold underline"
                            >
                              Open video on YouTube
                            </a>
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-black text-white mb-1 line-clamp-2">
                            {video.title || "YouTube video"}
                          </h3>
                          <div className="flex items-center justify-between text-[11px] text-blue-200/80 font-bold mt-1">
                            <span>{video.platform || "YouTube"}</span>
                            {video.duration && <span>{video.duration}</span>}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Youtube className="h-16 w-16 text-red-500/60 mx-auto mb-4" strokeWidth={1} />
                  <p className="text-blue-100/70 font-bold mb-2">
                    No video lessons were found for this document yet.
                  </p>
                  <p className="text-sm text-blue-100/60 font-bold max-w-xl mx-auto">
                    Try generating notes again for a more specific topic, or upload a document with
                    a clearer subject so we can search for the best tutorials to match it.
                  </p>
                </div>
              )}
            </Card>
          )}

          {activeSection === "formulas" && (
            <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-blue-400" strokeWidth={3} />
                Formula Sheet
              </h2>
              {notes.formulas && notes.formulas.length > 0 ? (
                <div className="space-y-6">
                  {notes.formulas.map((formula, index) => {
                    // Debug: Log formula data
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[Formula ${index}] "${formula.name}":`, {
                        name: formula.name,
                        formula: formula.formula,
                        formulaLength: formula.formula?.length || 0,
                        description: formula.description,
                        variables: formula.variables
                      })
                    }
                    
                    return (
                      <Card key={index} className="p-6 bg-slate-700/50 border-4 border-slate-600/50">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-black text-white">{formula.name}</h3>
                          {formula.page && (
                            <Badge className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">
                              Page {formula.page}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Formula Display */}
                        <div className="bg-slate-900/50 p-6 rounded-xl border-4 border-blue-400/30 mb-4 min-h-[80px] flex items-center justify-center">
                          <div className="text-xl md:text-2xl text-blue-300 text-center leading-relaxed flex items-center justify-center">
                            {formula.formula && formula.formula.trim() ? (
                              <FormulaRenderer 
                                formula={formula.formula}
                                className="text-blue-300"
                                displayMode={true}
                              />
                            ) : (
                              <span className="text-blue-300/50 italic">
                                Formula not available{process.env.NODE_ENV === 'development' ? ` (check console for details)` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-white font-bold mb-3">{formula.description}</p>
                        
                        {/* Variables */}
                        {formula.variables && formula.variables.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-sm font-black text-white mb-2">Variables:</h4>
                            <div className="space-y-1">
                              {formula.variables.map((variable, varIndex) => (
                                <div key={varIndex} className="flex items-start gap-2 text-sm">
                                  <span className="font-black text-blue-300 font-mono">{variable.symbol}:</span>
                                  <span className="text-blue-100/70 font-bold">{variable.meaning}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Example */}
                        {formula.example && (
                          <div className="mt-3 p-3 bg-green-500/10 rounded-lg border-2 border-green-500/30">
                            <h4 className="text-sm font-black text-white mb-1">Example:</h4>
                            <p className="text-sm text-green-300 font-bold">{formula.example}</p>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-blue-300/50 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-blue-100/70 font-bold">No formulas found in this document</p>
                </div>
              )}
            </Card>
          )}

          {activeSection === "quiz" && (
            <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Play className="h-6 w-6 text-orange-400" strokeWidth={3} />
                  Quiz Preparation
                </h2>
                <div className="text-sm font-bold text-blue-100/70">
                  {currentCardIndex + 1} / {notes.practice_questions.length}
                </div>
              </div>
              <div className="relative w-full min-h-[500px]">
                {notes.practice_questions.map((qa, index) => {
                  const isFlipped = flippedCards.has(index)
                  const isCurrentCard = index === currentCardIndex
                  
                  if (!isCurrentCard) return null
                  
                  return (
                    <div
                      key={index}
                      className={`relative w-full cursor-pointer transition-all duration-300 ${
                        isFlipped ? '' : 'group'
                      }`}
                      onClick={() => toggleCardFlip(index)}
                    >
                      {/* Simple Card - No 3D flip, just show/hide */}
                      {!isFlipped ? (
                        /* Front of Card (Question) */
                        <div className="w-full p-8 rounded-xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 border-4 border-blue-400/50 shadow-xl min-h-[500px] flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-xl font-black text-blue-400">Q{index + 1}:</span>
                            <div className="flex gap-3">
                              <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
                                qa.difficulty === 'easy' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                                qa.difficulty === 'medium' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                'bg-red-500/20 text-red-300 border-red-500/50'
                              }`}>
                                {qa.difficulty}
                              </span>
                              <span className="px-4 py-2 rounded-full text-sm font-bold border-2 border-slate-600/50 bg-slate-600/50 text-blue-100/70">
                                {qa.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex flex-col">
                            <div className="mb-6">
                              <p className="text-xl text-white font-bold break-words whitespace-normal leading-relaxed">{qa.question}</p>
                              {/* Show page reference if available */}
                              {(qa as any).page && (
                                <div className="mt-3 text-sm text-blue-100/60 font-bold">
                                  Reference: Page {(qa as any).page}
                                </div>
                              )}
                            </div>
                            
                            {/* Show options for multiple choice questions on the front */}
                            {qa.type === 'multiple_choice' && qa.options && qa.options.length > 0 && (
                              <div className="mt-4 space-y-3 flex-1">
                                {qa.options.map((option, optIndex) => (
                                  <div
                                    key={optIndex}
                                    className="p-4 rounded-lg bg-slate-800/50 border-2 border-slate-600/50"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-slate-600/50 text-blue-100/70 flex items-center justify-center font-black text-base border-2 border-slate-500/50 flex-shrink-0">
                                        {String.fromCharCode(65 + optIndex)}
                                      </div>
                                      <span className="text-white font-bold text-base flex-1 break-words whitespace-normal leading-relaxed">{option}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="mt-auto pt-6">
                              <div className="text-base text-blue-100/70 font-bold">
                                Topic: {qa.topic}
                              </div>
                              <div className="text-sm text-blue-100/60 font-bold mt-3 text-center">
                                Click to reveal answer
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Back of Card (Answer) */
                        <div className="w-full p-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-4 border-blue-400/50 shadow-xl min-h-[500px] flex flex-col">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-xl font-black text-blue-400">Q{index + 1}:</span>
                            <div className="flex gap-3">
                              <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
                                qa.difficulty === 'easy' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
                                qa.difficulty === 'medium' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                'bg-red-500/20 text-red-300 border-red-500/50'
                              }`}>
                                {qa.difficulty}
                              </span>
                              <span className="px-4 py-2 rounded-full text-sm font-bold border-2 border-slate-600/50 bg-slate-600/50 text-blue-100/70">
                                {qa.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex flex-col">
                            <div className="mb-6">
                              <p className="text-xl text-white font-bold break-words whitespace-normal leading-relaxed">{qa.question}</p>
                              {/* Show page reference if available */}
                              {(qa as any).page && (
                                <div className="mt-3 text-sm text-blue-100/60 font-bold">
                                  Reference: Page {(qa as any).page}
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-6 flex-1">
                              <span className="text-lg font-black text-green-400 block mb-4">
                                Correct Answer{qa.type === 'open_ended' && (qa as any).expected_answers && (qa as any).expected_answers.length > 1 ? 's' : ''}:
                              </span>
                              
                              {/* For multiple choice, show the correct option */}
                              {qa.type === 'multiple_choice' && qa.options && (
                                <div className="space-y-3">
                                  {qa.options.map((option, optIndex) => {
                                    // Check if this is the correct answer
                                    const isCorrect = qa.answer.toLowerCase().trim() === option.toLowerCase().trim() ||
                                                     qa.answer === String(optIndex) ||
                                                     qa.answer === String.fromCharCode(65 + optIndex) ||
                                                     (qa as any).correct === optIndex ||
                                                     (qa as any).correct_answer === optIndex
                                    
                                    return (
                                      <div
                                        key={optIndex}
                                        className={`p-4 rounded-lg border-2 ${
                                          isCorrect
                                            ? 'bg-green-500/20 border-green-400'
                                            : 'bg-slate-700/50 border-slate-600/50'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-base border-2 flex-shrink-0 ${
                                            isCorrect
                                              ? 'bg-green-500 text-white border-green-400'
                                              : 'bg-slate-600/50 text-blue-100/70 border-slate-500/50'
                                          }`}>
                                            {String.fromCharCode(65 + optIndex)}
                                          </div>
                                          <span className={`font-bold text-base flex-1 break-words whitespace-normal leading-relaxed ${
                                            isCorrect ? 'text-green-300' : 'text-white'
                                          }`}>
                                            {option}
                                          </span>
                                          {isCorrect && (
                                            <span className="text-sm font-black text-green-300 bg-green-500/20 px-3 py-1.5 rounded-full border border-green-400/50 flex-shrink-0">
                                              ✓ Correct
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              
                              {/* For open-ended questions, show expected answers if available, otherwise show answer */}
                              {qa.type === 'open_ended' && (
                                <div>
                                  {(qa as any).expected_answers && Array.isArray((qa as any).expected_answers) && (qa as any).expected_answers.length > 0 ? (
                                    <div className="space-y-3">
                                      {(qa as any).expected_answers.map((expectedAns: string, ansIndex: number) => (
                                        <div
                                          key={ansIndex}
                                          className="p-4 rounded-lg bg-green-500/20 border-2 border-green-400"
                                        >
                                          <div className="flex items-start gap-3">
                                            <span className="text-green-300 font-black text-base mt-1 flex-shrink-0">✓</span>
                                            <span className="text-white font-bold text-base flex-1 break-words whitespace-normal leading-relaxed">{expectedAns}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-4 rounded-lg bg-green-500/20 border-2 border-green-400">
                                      <p className="text-white font-bold text-base break-words whitespace-normal leading-relaxed">{qa.answer}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* For other question types (true/false, fill blank), show the answer */}
                              {qa.type !== 'multiple_choice' && qa.type !== 'open_ended' && (
                                <div className="p-4 rounded-lg bg-green-500/20 border-2 border-green-400">
                                  <p className="text-white font-bold text-base break-words whitespace-normal leading-relaxed">{qa.answer}</p>
                                </div>
                              )}
                            </div>
                            
                            {qa.explanation && (
                              <div className="mt-6 p-5 rounded-lg bg-slate-800/50 border-2 border-slate-600/50">
                                <p className="text-base text-blue-100/70 font-bold leading-relaxed break-words whitespace-normal">{qa.explanation}</p>
                              </div>
                            )}
                            
                            <div className="mt-auto pt-6">
                              <div className="text-base text-blue-100/70 font-bold">
                                Topic: {qa.topic}
                              </div>
                              {index < notes.practice_questions.length - 1 ? (
                                <div className="relative mt-3 text-center group/tooltip">
                                  <div className="text-sm text-blue-100/60 font-bold cursor-pointer inline-block px-4 py-2 rounded-lg bg-blue-500/20 border-2 border-blue-400/50 hover:bg-blue-500/30 transition-colors">
                                    Click to go to next card
                                  </div>
                                  {/* Tooltip bubble */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                    <div className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg border-2 border-blue-400 whitespace-nowrap">
                                      Click anywhere on the card to continue
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-blue-100/60 font-bold mt-3 text-center">
                                  Click to flip back
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar - Right side for better visibility */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 order-2">
          {/* Start Battle Button - Prominent Position */}
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-blue-500/50 shadow-lg sticky top-4">
            <h3 className="text-lg font-black text-white mb-4">Ready to Test?</h3>
            <div className="space-y-3">
              <Button
                onClick={onStartBattle}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg h-14 border-2 border-blue-400 shadow-lg"
              >
                <Play className="h-6 w-6 mr-2" strokeWidth={3} />
                Start Singleplayer Battle
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="font-black border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70"
                  onClick={handleDownloadNotes}
                  title="Download as PDF"
                >
                  <Download className="h-4 w-4" strokeWidth={3} />
                </Button>
                <Button
                  variant="outline"
                  className="font-black border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70"
                  onClick={handleDownloadMarkdown}
                  title="Download as Markdown"
                >
                  <FileText className="h-4 w-4" strokeWidth={3} />
                </Button>
                <Button
                  variant="outline"
                  className="font-black border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70"
                  onClick={handleShareNotes}
                  title="Share Notes"
                >
                  <Share2 className="h-4 w-4" strokeWidth={3} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Key Terms - More Visible */}
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-orange-500/50 shadow-lg sticky top-[260px]">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-400" strokeWidth={3} />
              Key Terms
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {notes.key_terms.map((term, index) => (
                <div key={index} className="relative inline-block mr-2 mb-2">
                  <Badge 
                    className="border-2 border-orange-400/50 bg-orange-500/20 text-orange-300 font-black cursor-help hover:bg-orange-500/30 transition-colors px-3 py-1.5"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const cardWidth = 400
                      const cardHeight = 150 // Approximate height
                      const padding = 12
                      
                      // Calculate position - prefer above, but adjust if needed
                      let x = rect.left + rect.width / 2
                      let y = rect.top
                      let transform = 'translate(-50%, calc(-100% - 12px))'
                      
                      // Check if card would go off left edge
                      if (x - cardWidth / 2 < padding) {
                        x = cardWidth / 2 + padding
                      }
                      
                      // Check if card would go off right edge
                      if (x + cardWidth / 2 > window.innerWidth - padding) {
                        x = window.innerWidth - cardWidth / 2 - padding
                      }
                      
                      // Check if card would go off top edge - show below instead
                      if (y - cardHeight - padding < 0) {
                        y = rect.bottom
                        transform = 'translate(-50%, 12px)'
                      }
                      
                      setHoveredTerm(term.term)
                      setHoveredTermPosition({ x, y, transform })
                    }}
                    onMouseLeave={() => {
                      setHoveredTerm(null)
                      setHoveredTermPosition(null)
                    }}
                  >
                    {term.term}
                  </Badge>
                  
                  {/* Hover Card - Positioned dynamically */}
                  {hoveredTerm === term.term && hoveredTermPosition && (
                    <div 
                      className="fixed z-[9999] pointer-events-none"
                      style={{
                        left: `${hoveredTermPosition.x}px`,
                        top: `${hoveredTermPosition.y}px`,
                        transform: hoveredTermPosition.transform || 'translate(-50%, calc(-100% - 12px))',
                      }}
                    >
                      <div 
                        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 shadow-2xl border-4 border-orange-400/50 pointer-events-auto"
                        style={{ 
                          width: '400px', 
                          maxWidth: 'min(90vw, 400px)',
                          minWidth: '250px'
                        }}
                        onMouseEnter={() => setHoveredTerm(term.term)}
                        onMouseLeave={() => {
                          setHoveredTerm(null)
                          setHoveredTermPosition(null)
                        }}
                      >
                        <div className="text-sm font-black text-white mb-2">{term.term}</div>
                        <div className="text-xs text-blue-100/70 font-bold leading-relaxed whitespace-normal">
                          {term.definition}
                        </div>
                        {/* Arrow pointing to the badge */}
                        {hoveredTermPosition.transform?.includes('calc(-100%') ? (
                          // Arrow pointing down (card above badge)
                          <div 
                            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0"
                            style={{ 
                              borderLeft: '8px solid transparent',
                              borderRight: '8px solid transparent',
                              borderTop: '8px solid rgba(251, 146, 60, 0.5)'
                            }}
                          />
                        ) : (
                          // Arrow pointing up (card below badge)
                          <div 
                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0"
                            style={{ 
                              borderLeft: '8px solid transparent',
                              borderRight: '8px solid transparent',
                              borderBottom: '8px solid rgba(251, 146, 60, 0.5)'
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
