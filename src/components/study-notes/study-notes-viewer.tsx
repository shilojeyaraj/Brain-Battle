"use client"

import { useState } from "react"
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
  Share,
  ChevronDown,
  ChevronUp,
  Info,
  Calculator
} from "lucide-react"
import { StudyNotes } from "@/lib/schemas/notes-schema"

interface StudyNotesViewerProps {
  notes: StudyNotes
  onStartBattle: () => void
  fileNames?: string[]
}

export function StudyNotesViewer({ notes, onStartBattle, fileNames }: StudyNotesViewerProps) {
  const [activeSection, setActiveSection] = useState<"outline" | "concepts" | "diagrams" | "formulas" | "quiz">("outline")
  const [currentDiagram, setCurrentDiagram] = useState(0)
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set())
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null)
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())

  // Safety: Ensure diagrams and concepts are arrays
  const diagrams = Array.isArray(notes.diagrams) ? notes.diagrams : []
  const concepts = Array.isArray(notes.concepts) ? notes.concepts : []

  const sections = [
    { id: "outline", label: "Outline", icon: BookOpen },
    { id: "concepts", label: "Concepts", icon: Lightbulb },
    { id: "diagrams", label: "Diagrams", icon: Image },
    { id: "formulas", label: "Formulas", icon: Calculator },
    { id: "quiz", label: "Quiz Prep", icon: Play }
  ] as const

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
      newFlipped.delete(index)
    } else {
      newFlipped.add(index)
    }
    setFlippedCards(newFlipped)
  }

  const handleDownloadNotes = async () => {
    try {
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
        doc.setFontSize(fontSize)
        doc.setTextColor(color[0], color[1], color[2])
        if (isBold) {
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setFont('helvetica', 'normal')
        }
        
        const lines = doc.splitTextToSize(text, maxWidth)
        
        // Check if we need a new page
        if (yPosition + (lines.length * lineHeight) > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        
        doc.text(lines, margin, yPosition)
        yPosition += lines.length * lineHeight
      }
      
      // Title
      addText(notes.title, 20, true, [0, 0, 0])
      yPosition += 5
      
      // Subject and difficulty
      addText(`Subject: ${notes.subject}`, 12, false, [100, 100, 100])
      addText(`Education Level: ${notes.education_level.replace('_', ' ')}`, 12, false, [100, 100, 100])
      addText(`Difficulty: ${notes.difficulty_level}`, 12, false, [100, 100, 100])
      yPosition += sectionSpacing
      
      // Complexity Analysis
      if (notes.complexity_analysis) {
        addText('Complexity Analysis', 16, true)
        addText(`Vocabulary Level: ${notes.complexity_analysis.vocabulary_level}`, 12)
        addText(`Concept Sophistication: ${notes.complexity_analysis.concept_sophistication}`, 12)
        addText(`Reasoning Level: ${notes.complexity_analysis.reasoning_level}`, 12)
        if (notes.complexity_analysis.prerequisite_knowledge?.length > 0) {
          addText(`Prerequisites: ${notes.complexity_analysis.prerequisite_knowledge.join(', ')}`, 12)
        }
        yPosition += sectionSpacing
      }
      
      // Outline
      if (notes.outline && notes.outline.length > 0) {
        addText('Outline', 16, true)
        notes.outline.forEach((item, index) => {
          addText(`${index + 1}. ${item}`, 12)
        })
        yPosition += sectionSpacing
      }
      
      // Key Terms
      if (notes.key_terms && notes.key_terms.length > 0) {
        addText('Key Terms', 16, true)
        notes.key_terms.forEach((term) => {
          addText(term.term, 14, true)
          addText(`Definition: ${term.definition}`, 12)
          addText(`Importance: ${term.importance}`, 12, false, [100, 100, 100])
          yPosition += 3
        })
        yPosition += sectionSpacing
      }
      
      // Concepts
      if (notes.concepts && notes.concepts.length > 0) {
        addText('Concepts', 16, true)
        notes.concepts.forEach((concept) => {
          addText(concept.heading, 14, true)
          if (concept.bullets && concept.bullets.length > 0) {
            concept.bullets.forEach((bullet) => {
              addText(`• ${bullet}`, 12)
            })
          }
          if (concept.examples && concept.examples.length > 0) {
            addText('Examples:', 12, true)
            concept.examples.forEach((example) => {
              addText(`  - ${example}`, 12)
            })
          }
          if (concept.connections && concept.connections.length > 0) {
            addText('Connections:', 12, true)
            concept.connections.forEach((connection) => {
              addText(`  - ${connection}`, 12)
            })
          }
          yPosition += 5
        })
        yPosition += sectionSpacing
      }
      
      // Diagrams
      if (notes.diagrams && notes.diagrams.length > 0) {
        addText('Diagrams', 16, true)
        notes.diagrams.forEach((diagram, index) => {
          addText(`${index + 1}. ${diagram.title}`, 14, true)
          addText(diagram.caption, 12)
          if (diagram.page) {
            addText(`Page ${diagram.page}`, 10, false, [150, 150, 150])
          }
          yPosition += 5
        })
        yPosition += sectionSpacing
      }
      
      // Formulas
      if (notes.formulas && notes.formulas.length > 0) {
        addText('Formula Sheet', 16, true)
        notes.formulas.forEach((formula, index) => {
          addText(`${index + 1}. ${formula.name}`, 14, true)
          if (formula.page) {
            addText(`Page ${formula.page}`, 10, false, [150, 150, 150])
          }
          // Formula in larger, monospace font
          doc.setFont('courier', 'bold')
          doc.setFontSize(14)
          doc.setTextColor(0, 100, 200)
          const formulaLines = doc.splitTextToSize(formula.formula, maxWidth)
          if (yPosition + (formulaLines.length * lineHeight) > pageHeight - margin) {
            doc.addPage()
            yPosition = margin
          }
          doc.text(formulaLines, margin, yPosition)
          yPosition += formulaLines.length * lineHeight
          
          // Reset font
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(12)
          doc.setTextColor(0, 0, 0)
          
          addText(formula.description, 12)
          if (formula.variables && formula.variables.length > 0) {
            addText('Variables:', 12, true)
            formula.variables.forEach((variable) => {
              addText(`  ${variable.symbol}: ${variable.meaning}`, 11)
            })
          }
          if (formula.example) {
            addText(`Example: ${formula.example}`, 11, false, [0, 100, 0])
          }
          yPosition += 5
        })
        yPosition += sectionSpacing
      }
      
      // Practice Questions
      if (notes.practice_questions && notes.practice_questions.length > 0) {
        addText('Practice Questions', 16, true)
        notes.practice_questions.forEach((qa, index) => {
          addText(`Q${index + 1}: ${qa.question}`, 14, true)
          addText(`Type: ${qa.type.replace('_', ' ')} | Difficulty: ${qa.difficulty} | Topic: ${qa.topic}`, 10, false, [100, 100, 100])
          addText(`Answer: ${qa.answer}`, 12, true, [0, 100, 0])
          if (qa.explanation) {
            addText(`Explanation: ${qa.explanation}`, 12)
          }
          if (qa.options && qa.options.length > 0) {
            addText('Options:', 12, true)
            qa.options.forEach((option, optIndex) => {
              addText(`  ${String.fromCharCode(65 + optIndex)}. ${option}`, 12)
            })
          }
          yPosition += 5
        })
        yPosition += sectionSpacing
      }
      
      // Study Tips
      if (notes.study_tips && notes.study_tips.length > 0) {
        addText('Study Tips', 16, true)
        notes.study_tips.forEach((tip) => {
          addText(`• ${tip}`, 12)
        })
        yPosition += sectionSpacing
      }
      
      // Common Misconceptions
      if (notes.common_misconceptions && notes.common_misconceptions.length > 0) {
        addText('Common Misconceptions', 16, true)
        notes.common_misconceptions.forEach((misconception) => {
          addText(misconception.misconception, 14, true)
          addText(`Correction: ${misconception.correction}`, 12)
          addText(`Why Common: ${misconception.why_common}`, 12, false, [100, 100, 100])
          yPosition += 5
        })
        yPosition += sectionSpacing
      }
      
      // Resources
      if (notes.resources) {
        if (notes.resources.links && notes.resources.links.length > 0) {
          addText('Resources - Links', 16, true)
          notes.resources.links.forEach((link) => {
            addText(`${link.title} - ${link.description}`, 12)
            addText(link.url, 10, false, [0, 0, 255])
          })
          yPosition += sectionSpacing
        }
        if (notes.resources.videos && notes.resources.videos.length > 0) {
          addText('Resources - Videos', 16, true)
          notes.resources.videos.forEach((video) => {
            addText(`${video.title} - ${video.description} (${video.duration})`, 12)
            addText(video.url, 10, false, [0, 0, 255])
          })
        }
      }
      
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
        <h1 className="text-4xl font-black text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {notes.title}
        </h1>
        <p className="text-muted-foreground font-bold">
          Study notes generated from {fileNames && fileNames.length > 0 ? `${fileNames.length} document${fileNames.length > 1 ? 's' : ''}` : 'your documents'}
        </p>
        {fileNames && fileNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {fileNames.map((fileName, index) => (
              <Badge key={index} className="cartoon-border bg-muted text-muted-foreground font-bold">
                {fileName}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-2 p-2 rounded-xl bg-card cartoon-border cartoon-shadow">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                variant={activeSection === section.id ? "default" : "ghost"}
                className={`flex items-center gap-2 px-4 py-2 font-black cartoon-border ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
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
        <div className="lg:col-span-7 xl:col-span-8">
          {activeSection === "outline" && (
            <Card className="p-6 bg-card cartoon-border cartoon-shadow">
              <h2 className="text-2xl font-black text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" strokeWidth={3} />
                Study Outline
              </h2>
              <div className="space-y-3">
                {notes.outline.map((point, index) => {
                  const isExpanded = expandedOutlineItems.has(index)
                  const details = generateOutlineDetails(point, index)
                  
                  return (
                    <div key={index} className="rounded-xl bg-secondary/50 cartoon-border overflow-hidden">
                      <div 
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/70 transition-colors"
                        onClick={() => toggleOutlineItem(index)}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-foreground font-bold flex-1">{point}</p>
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
                        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
                          {/* Description */}
                          <div>
                            <h4 className="text-sm font-black text-foreground mb-2 flex items-center gap-2">
                              <Info className="h-4 w-4 text-primary" strokeWidth={3} />
                              Description
                            </h4>
                            <p className="text-sm text-muted-foreground font-bold">{details.description}</p>
                          </div>
                          
                          {/* Key Points */}
                          <div>
                            <h4 className="text-sm font-black text-foreground mb-2">Key Points</h4>
                            <ul className="space-y-1">
                              {details.keyPoints.map((keyPoint, keyIndex) => (
                                <li key={keyIndex} className="flex items-start gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                                  <span className="text-muted-foreground font-bold">{keyPoint}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* Examples */}
                          <div>
                            <h4 className="text-sm font-black text-foreground mb-2">Examples</h4>
                            <ul className="space-y-1">
                              {details.examples.map((example, exampleIndex) => (
                                <li key={exampleIndex} className="flex items-start gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0"></div>
                                  <span className="text-muted-foreground font-bold">{example}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* Related Concepts */}
                          {details.relatedConcepts.length > 0 && (
                            <div>
                              <h4 className="text-sm font-black text-foreground mb-2">Related Concepts</h4>
                              <div className="flex flex-wrap gap-2">
                                {details.relatedConcepts.map((concept, conceptIndex) => (
                                  <Badge key={conceptIndex} className="cartoon-border bg-primary/10 text-primary font-bold">
                                    {concept.heading}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Related Diagrams */}
                          {details.relatedDiagrams.length > 0 && (
                            <div>
                              <h4 className="text-sm font-black text-foreground mb-2">Related Diagrams</h4>
                              <div className="flex flex-wrap gap-2">
                                {details.relatedDiagrams.map((diagram, diagramIndex) => (
                                  <Badge key={diagramIndex} className="cartoon-border bg-chart-3/10 text-chart-3 font-bold">
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
                <Card key={index} className="p-6 bg-card cartoon-border cartoon-shadow">
                  <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-secondary" strokeWidth={3} />
                    {concept.heading}
                  </h3>
                  <ul className="space-y-2">
                    {concept.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-secondary mt-2 flex-shrink-0"></div>
                        <p className="text-foreground font-bold">{bullet}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}

          {activeSection === "diagrams" && (
            <Card className="p-6 bg-card cartoon-border cartoon-shadow">
              <h2 className="text-2xl font-black text-foreground mb-4 flex items-center gap-2">
                <Image className="h-6 w-6 text-chart-3" strokeWidth={3} />
                Diagrams & Figures
              </h2>
              
              {diagrams.length > 0 ? (
                <div className="space-y-6">
                  {/* Diagram Navigation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setCurrentDiagram(Math.max(0, currentDiagram - 1))}
                        disabled={currentDiagram === 0}
                        variant="outline"
                        size="sm"
                        className="cartoon-border"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                      </Button>
                      <span className="font-black text-foreground">
                        {currentDiagram + 1} of {diagrams.length}
                      </span>
                      <Button
                        onClick={() => setCurrentDiagram(Math.min(diagrams.length - 1, currentDiagram + 1))}
                        disabled={currentDiagram === diagrams.length - 1}
                        variant="outline"
                        size="sm"
                        className="cartoon-border"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={3} />
                      </Button>
                    </div>
                    <Badge className={`cartoon-border font-black ${
                      diagrams[currentDiagram]?.source === "file" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {diagrams[currentDiagram]?.source === "file" ? "From Document" : "Web Image"}
                    </Badge>
                  </div>

                  {/* Current Diagram */}
                  <div className="text-center">
                    <h3 className="text-lg font-black text-foreground mb-2">
                      {diagrams[currentDiagram]?.title}
                    </h3>
                    
                    {/* Display image if available */}
                    {diagrams[currentDiagram]?.image_url ? (
                      <div className="mb-4">
                        <img
                          src={diagrams[currentDiagram].image_url}
                          alt={diagrams[currentDiagram]?.title}
                          className="max-w-full h-auto rounded-xl cartoon-border cartoon-shadow mx-auto"
                          onError={(e) => {
                            console.error('Failed to load diagram image from URL:', diagrams[currentDiagram]?.image_url)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ) : diagrams[currentDiagram]?.image_data_b64 ? (
                      <div className="mb-4">
                        <img
                          src={`data:image/png;base64,${diagrams[currentDiagram].image_data_b64}`}
                          alt={diagrams[currentDiagram]?.title}
                          className="max-w-full h-auto rounded-xl cartoon-border cartoon-shadow mx-auto"
                          onError={(e) => {
                            console.error('Failed to load diagram image from base64 data')
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ) : (
                      /* Placeholder when image is missing */
                      <div className="mb-4 p-12 rounded-xl bg-muted/50 cartoon-border cartoon-shadow mx-auto max-w-2xl">
                        <div className="flex flex-col items-center justify-center">
                          <Image className="h-16 w-16 text-muted-foreground mb-4" strokeWidth={2} />
                          <p className="text-muted-foreground font-bold mb-2">
                            Diagram image not available
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {diagrams[currentDiagram]?.source === 'file' 
                              ? 'The image extraction from the PDF may have failed. This could be due to compatibility issues or the PDF format.'
                              : 'Image could not be loaded from the web source.'}
                          </p>
                          {diagrams[currentDiagram]?.page && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Referenced from page {diagrams[currentDiagram].page} of the document
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-muted-foreground font-bold mb-2">
                      {diagrams[currentDiagram]?.caption}
                    </p>
                    
                    {diagrams[currentDiagram]?.credit && (
                      <p className="text-xs text-muted-foreground">
                        Credit: {diagrams[currentDiagram].credit}
                      </p>
                    )}
                    
                    {diagrams[currentDiagram]?.page && (
                      <p className="text-xs text-muted-foreground">
                        Page {diagrams[currentDiagram].page}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
                  <p className="text-muted-foreground font-bold">No diagrams found in the document</p>
                </div>
              )}
            </Card>
          )}

          {activeSection === "formulas" && (
            <Card className="p-6 bg-card cartoon-border cartoon-shadow">
              <h2 className="text-2xl font-black text-foreground mb-6 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" strokeWidth={3} />
                Formula Sheet
              </h2>
              {notes.formulas && notes.formulas.length > 0 ? (
                <div className="space-y-6">
                  {notes.formulas.map((formula, index) => (
                    <Card key={index} className="p-6 bg-secondary/30 cartoon-border">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-black text-foreground">{formula.name}</h3>
                        {formula.page && (
                          <Badge className="cartoon-border bg-muted text-muted-foreground font-bold">
                            Page {formula.page}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Formula Display */}
                      <div className="bg-card p-4 rounded-xl cartoon-border mb-3">
                        <p className="text-2xl font-black text-primary text-center font-mono">
                          {formula.formula}
                        </p>
                      </div>
                      
                      {/* Description */}
                      <p className="text-foreground font-bold mb-3">{formula.description}</p>
                      
                      {/* Variables */}
                      {formula.variables && formula.variables.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-black text-foreground mb-2">Variables:</h4>
                          <div className="space-y-1">
                            {formula.variables.map((variable, varIndex) => (
                              <div key={varIndex} className="flex items-start gap-2 text-sm">
                                <span className="font-black text-primary font-mono">{variable.symbol}:</span>
                                <span className="text-muted-foreground font-bold">{variable.meaning}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Example */}
                      {formula.example && (
                        <div className="mt-3 p-3 bg-primary/10 rounded-lg cartoon-border">
                          <h4 className="text-sm font-black text-foreground mb-1">Example:</h4>
                          <p className="text-sm text-muted-foreground font-bold">{formula.example}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
                  <p className="text-muted-foreground font-bold">No formulas found in this document</p>
                </div>
              )}
            </Card>
          )}

          {activeSection === "quiz" && (
            <Card className="p-6 bg-card cartoon-border cartoon-shadow">
              <h2 className="text-2xl font-black text-foreground mb-4 flex items-center gap-2">
                <Play className="h-6 w-6 text-accent" strokeWidth={3} />
                Quiz Preparation
              </h2>
              <div className="space-y-6">
                {notes.practice_questions.map((qa, index) => {
                  const isFlipped = flippedCards.has(index)
                  return (
                    <div
                      key={index}
                      className={`relative min-h-96 h-auto cursor-pointer perspective-1000 card-shake-container ${
                        isFlipped ? 'flipped' : ''
                      }`}
                      onClick={() => toggleCardFlip(index)}
                      style={{ minHeight: '500px' }}
                    >
                      {/* Card Container with 3D Flip */}
                      <div
                        className={`relative w-full h-full preserve-3d transition-transform duration-500 card-flip-inner ${
                          isFlipped ? 'rotate-y-180' : ''
                        }`}
                        style={{
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {/* Front of Card (Question) */}
                        <div
                          className="absolute inset-0 w-full h-full backface-hidden p-8 rounded-xl bg-secondary/50 cartoon-border card-front-face"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(0deg)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-lg font-black text-primary">Q{index + 1}:</span>
                            <div className="flex gap-3">
                              <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                                qa.difficulty === 'easy' ? 'bg-chart-3/20 text-chart-3' :
                                qa.difficulty === 'medium' ? 'bg-primary/20 text-primary' :
                                'bg-destructive/20 text-destructive'
                              }`}>
                                {qa.difficulty}
                              </span>
                              <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-muted text-muted-foreground">
                                {qa.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <div className="mb-4">
                            <p className="text-lg text-foreground font-bold break-words overflow-hidden leading-relaxed">{qa.question}</p>
                          </div>
                          
                          {/* Show options for multiple choice questions on the front */}
                          {qa.type === 'multiple_choice' && qa.options && qa.options.length > 0 && (
                            <div className="mt-4 space-y-2 mb-6">
                              {qa.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className="p-3 rounded-lg bg-card/50 cartoon-border"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-black text-sm">
                                      {String.fromCharCode(65 + optIndex)}
                                    </div>
                                    <span className="text-foreground font-bold flex-1">{option}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="text-sm text-muted-foreground font-bold mt-6">
                            Topic: {qa.topic}
                          </div>
                          {!isFlipped && (
                            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-sm text-muted-foreground font-bold">
                              Hover to shake • Click to reveal answer
                            </div>
                          )}
                        </div>

                        {/* Back of Card (Answer) */}
                        <div
                          className="absolute inset-0 w-full h-full backface-hidden p-8 rounded-xl bg-primary/10 cartoon-border overflow-y-auto"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                          }}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-lg font-black text-primary">Q{index + 1}:</span>
                            <div className="flex gap-3">
                              <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                                qa.difficulty === 'easy' ? 'bg-chart-3/20 text-chart-3' :
                                qa.difficulty === 'medium' ? 'bg-primary/20 text-primary' :
                                'bg-destructive/20 text-destructive'
                              }`}>
                                {qa.difficulty}
                              </span>
                              <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-muted text-muted-foreground">
                                {qa.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <div className="mb-4">
                            <p className="text-lg text-foreground font-bold break-words overflow-wrap-anywhere leading-relaxed whitespace-normal">{qa.question}</p>
                            {/* Show page reference if available */}
                            {(qa as any).page && (
                              <div className="mt-2 text-xs text-muted-foreground font-bold">
                                Reference: Page {(qa as any).page}
                              </div>
                            )}
                          </div>
                          <div className="mb-4 mt-6 flex-1 overflow-y-auto">
                            <span className="text-base font-black text-secondary">Correct Answer{qa.type === 'open_ended' && (qa as any).expected_answers && (qa as any).expected_answers.length > 1 ? 's' : ''}:</span>
                            
                            {/* For multiple choice, show the correct option */}
                            {qa.type === 'multiple_choice' && qa.options && (
                              <div className="mt-3 space-y-2">
                                {qa.options.map((option, optIndex) => {
                                  // Check if this is the correct answer
                                  // The answer field might contain the option text or index
                                  const isCorrect = qa.answer.toLowerCase().trim() === option.toLowerCase().trim() ||
                                                   qa.answer === String(optIndex) ||
                                                   qa.answer === String.fromCharCode(65 + optIndex) ||
                                                   (qa as any).correct === optIndex ||
                                                   (qa as any).correct_answer === optIndex
                                  
                                  return (
                                    <div
                                      key={optIndex}
                                      className={`p-3 rounded-lg cartoon-border ${
                                        isCorrect
                                          ? 'bg-chart-3/20 border-chart-3 border-2'
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                                          isCorrect
                                            ? 'bg-chart-3 text-chart-3-foreground'
                                            : 'bg-muted text-muted-foreground'
                                        }`}>
                                          {String.fromCharCode(65 + optIndex)}
                                        </div>
                                        <span className={`text-foreground font-bold flex-1 ${
                                          isCorrect ? 'text-chart-3' : ''
                                        }`}>
                                          {option}
                                        </span>
                                        {isCorrect && (
                                          <span className="text-xs font-black text-chart-3 bg-chart-3/20 px-2 py-1 rounded-full">
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
                              <div className="mt-3">
                                {(qa as any).expected_answers && Array.isArray((qa as any).expected_answers) && (qa as any).expected_answers.length > 0 ? (
                                  <div className="space-y-2">
                                    {(qa as any).expected_answers.map((expectedAns: string, ansIndex: number) => (
                                      <div
                                        key={ansIndex}
                                        className="p-3 rounded-lg bg-chart-3/20 border-2 border-chart-3 cartoon-border"
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className="text-chart-3 font-black text-sm mt-1">✓</span>
                                          <span className="text-foreground font-bold flex-1">{expectedAns}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-lg bg-chart-3/20 border-2 border-chart-3 cartoon-border">
                                    <p className="text-foreground font-bold break-words whitespace-normal leading-relaxed">{qa.answer}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* For other question types (true/false, fill blank), show the answer */}
                            {qa.type !== 'multiple_choice' && qa.type !== 'open_ended' && (
                              <div className="mt-3 p-3 rounded-lg bg-chart-3/20 border-2 border-chart-3 cartoon-border">
                                <p className="text-foreground font-bold break-words whitespace-normal leading-relaxed">{qa.answer}</p>
                              </div>
                            )}
                          </div>
                          {qa.explanation && (
                            <div className="mt-4 p-4 rounded-lg bg-card/50">
                              <p className="text-sm text-muted-foreground font-bold leading-relaxed break-words overflow-wrap-anywhere whitespace-normal">{qa.explanation}</p>
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground font-bold mt-6">
                            Topic: {qa.topic}
                          </div>
                          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-sm text-muted-foreground font-bold">
                            Click to flip back
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Key Terms */}
          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <h3 className="text-lg font-black text-foreground mb-4">Key Terms</h3>
            <div className="space-y-2">
              {notes.key_terms.map((term, index) => (
                <div key={index} className="relative inline-block mr-2 mb-2">
                  <Badge 
                    className="cartoon-border bg-accent text-accent-foreground font-black cursor-help hover:bg-accent/80 transition-colors"
                    onMouseEnter={() => setHoveredTerm(term.term)}
                    onMouseLeave={() => setHoveredTerm(null)}
                  >
                    {term.term}
                  </Badge>
                  
                  {/* Hover Card */}
                  {hoveredTerm === term.term && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                      <div className="bg-card rounded-xl p-4 shadow-lg" style={{ border: '6px solid oklch(0.15 0.02 280)', width: '400px', maxWidth: '90vw' }}>
                        <div className="text-sm font-black text-foreground mb-2">{term.term}</div>
                        <div className="text-xs text-muted-foreground font-bold leading-relaxed">
                          {term.definition}
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0" style={{ 
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid oklch(0.15 0.02 280)'
                        }}></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <h3 className="text-lg font-black text-foreground mb-4">Ready to Test?</h3>
            <div className="space-y-3">
              <Button
                onClick={onStartBattle}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black cartoon-border cartoon-shadow cartoon-hover"
              >
                <Play className="h-5 w-5 mr-2" strokeWidth={3} />
                Start Singleplayer
              </Button>
              <Button
                variant="outline"
                className="w-full font-black cartoon-border cartoon-shadow"
                onClick={handleDownloadNotes}
              >
                <Download className="h-5 w-5 mr-2" strokeWidth={3} />
                Download Notes
              </Button>
              <Button
                variant="outline"
                className="w-full font-black cartoon-border cartoon-shadow"
              >
                <Share className="h-5 w-5 mr-2" strokeWidth={3} />
                Share
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
