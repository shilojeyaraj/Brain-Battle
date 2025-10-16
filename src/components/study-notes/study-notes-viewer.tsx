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
  Info
} from "lucide-react"
import { StudyNotes } from "@/lib/schemas/notes-schema"

interface StudyNotesViewerProps {
  notes: StudyNotes
  onStartQuiz: () => void
  fileNames?: string[]
}

export function StudyNotesViewer({ notes, onStartQuiz, fileNames }: StudyNotesViewerProps) {
  const [activeSection, setActiveSection] = useState<"outline" | "concepts" | "diagrams" | "quiz">("outline")
  const [currentDiagram, setCurrentDiagram] = useState(0)
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set())
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null)

  const sections = [
    { id: "outline", label: "Outline", icon: BookOpen },
    { id: "concepts", label: "Concepts", icon: Lightbulb },
    { id: "diagrams", label: "Diagrams", icon: Image },
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

  // Generate detailed content for outline items based on the topic
  const generateOutlineDetails = (outlineItem: string, index: number) => {
    const topic = notes.title.toLowerCase()
    
    // Find related concepts and diagrams
    const relatedConcepts = notes.concepts.filter(concept => 
      concept.heading.toLowerCase().includes(outlineItem.toLowerCase().split(' ')[0]) ||
      outlineItem.toLowerCase().includes(concept.heading.toLowerCase().split(' ')[0])
    )
    
    const relatedDiagrams = notes.diagrams.filter(diagram =>
      diagram.title.toLowerCase().includes(outlineItem.toLowerCase().split(' ')[0]) ||
      outlineItem.toLowerCase().includes(diagram.title.toLowerCase().split(' ')[0])
    )

    return {
      description: `Detailed explanation of ${outlineItem.toLowerCase()}. This section covers the fundamental concepts, practical applications, and key insights related to this topic.`,
      examples: [
        `Example 1: Real-world application of ${outlineItem.toLowerCase()}`,
        `Example 2: Common scenarios involving ${outlineItem.toLowerCase()}`,
        `Example 3: Advanced concepts in ${outlineItem.toLowerCase()}`
      ],
      keyPoints: [
        `Key point 1: Important aspect of ${outlineItem.toLowerCase()}`,
        `Key point 2: Critical understanding for ${outlineItem.toLowerCase()}`,
        `Key point 3: Practical implications of ${outlineItem.toLowerCase()}`
      ],
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
    <div className="max-w-6xl mx-auto p-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
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
              {notes.concepts.map((concept, index) => (
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
              
              {notes.diagrams.length > 0 ? (
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
                        {currentDiagram + 1} of {notes.diagrams.length}
                      </span>
                      <Button
                        onClick={() => setCurrentDiagram(Math.min(notes.diagrams.length - 1, currentDiagram + 1))}
                        disabled={currentDiagram === notes.diagrams.length - 1}
                        variant="outline"
                        size="sm"
                        className="cartoon-border"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={3} />
                      </Button>
                    </div>
                    <Badge className={`cartoon-border font-black ${
                      notes.diagrams[currentDiagram]?.source === "file" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {notes.diagrams[currentDiagram]?.source === "file" ? "From Document" : "Web Image"}
                    </Badge>
                  </div>

                  {/* Current Diagram */}
                  <div className="text-center">
                    <h3 className="text-lg font-black text-foreground mb-2">
                      {notes.diagrams[currentDiagram]?.title}
                    </h3>
                    
                    {notes.diagrams[currentDiagram]?.image_url && (
                      <div className="mb-4">
                        <img
                          src={notes.diagrams[currentDiagram].image_url}
                          alt={notes.diagrams[currentDiagram]?.title}
                          className="max-w-full h-auto rounded-xl cartoon-border cartoon-shadow mx-auto"
                        />
                      </div>
                    )}
                    
                    {notes.diagrams[currentDiagram]?.image_data_b64 && (
                      <div className="mb-4">
                        <img
                          src={`data:image/png;base64,${notes.diagrams[currentDiagram].image_data_b64}`}
                          alt={notes.diagrams[currentDiagram]?.title}
                          className="max-w-full h-auto rounded-xl cartoon-border cartoon-shadow mx-auto"
                        />
                      </div>
                    )}
                    
                    <p className="text-muted-foreground font-bold mb-2">
                      {notes.diagrams[currentDiagram]?.caption}
                    </p>
                    
                    {notes.diagrams[currentDiagram]?.credit && (
                      <p className="text-xs text-muted-foreground">
                        Credit: {notes.diagrams[currentDiagram].credit}
                      </p>
                    )}
                    
                    {notes.diagrams[currentDiagram]?.page && (
                      <p className="text-xs text-muted-foreground">
                        Page {notes.diagrams[currentDiagram].page}
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

          {activeSection === "quiz" && (
            <Card className="p-6 bg-card cartoon-border cartoon-shadow">
              <h2 className="text-2xl font-black text-foreground mb-4 flex items-center gap-2">
                <Play className="h-6 w-6 text-accent" strokeWidth={3} />
                Quiz Preparation
              </h2>
              <div className="space-y-4">
                {notes.quiz.map((qa, index) => (
                  <div key={index} className="p-4 rounded-xl bg-secondary/50 cartoon-border">
                    <div className="mb-2">
                      <span className="text-sm font-black text-primary">Q{index + 1}:</span>
                      <p className="text-foreground font-bold">{qa.q}</p>
                    </div>
                    <div>
                      <span className="text-sm font-black text-secondary">A:</span>
                      <p className="text-foreground font-bold">{qa.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Terms */}
          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <h3 className="text-lg font-black text-foreground mb-4">Key Terms</h3>
            <div className="space-y-2">
              {notes.key_terms.map((term, index) => (
                <div key={index} className="relative inline-block mr-2 mb-2">
                  <Badge 
                    className="cartoon-border bg-accent text-accent-foreground font-black cursor-help hover:bg-accent/80 transition-colors"
                    onMouseEnter={() => setHoveredTerm(term)}
                    onMouseLeave={() => setHoveredTerm(null)}
                  >
                    {term}
                  </Badge>
                  
                  {/* Hover Card */}
                  {hoveredTerm === term && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
                      <div className="bg-card border border-border rounded-xl p-4 shadow-lg max-w-xs cartoon-border">
                        <div className="text-sm font-black text-foreground mb-2">{term}</div>
                        <div className="text-xs text-muted-foreground font-bold leading-relaxed">
                          {generateTermDefinition(term)}
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
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
                onClick={onStartQuiz}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black cartoon-border cartoon-shadow cartoon-hover"
              >
                <Play className="h-5 w-5 mr-2" strokeWidth={3} />
                Start Quiz
              </Button>
              <Button
                variant="outline"
                className="w-full font-black cartoon-border cartoon-shadow"
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
