"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpen, 
  Brain, 
  Image, 
  FileText, 
  Users, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Youtube
} from 'lucide-react'

interface SharedStudyNotesProps {
  notes: any
  fileNames: string[]
  roomId: string
  isHost: boolean
  onStartQuiz?: () => void
}

export default function SharedStudyNotes({ 
  notes, 
  fileNames, 
  roomId, 
  isHost, 
  onStartQuiz 
}: SharedStudyNotesProps) {
  const [activeTab, setActiveTab] = useState('outline')
  const [currentDiagram, setCurrentDiagram] = useState(0)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf': return '📄'
      case 'doc':
      case 'docx': return '📝'
      case 'txt': return '📄'
      case 'ppt':
      case 'pptx': return '📊'
      default: return '📁'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-chart-3 flex items-center justify-center cartoon-border cartoon-shadow">
              <Brain className="w-6 h-6 text-foreground" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">{notes.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4 text-muted-foreground" strokeWidth={3} />
                <span className="text-sm text-muted-foreground font-bold">Shared with room</span>
                <Badge className="cartoon-border bg-primary text-primary-foreground font-black text-xs">
                  {roomId.slice(0, 8)}...
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Source Files */}
        <div className="space-y-2">
          <h4 className="font-black text-foreground">Source Materials:</h4>
          <div className="flex flex-wrap gap-2">
            {fileNames.map((fileName, index) => (
              <Badge key={index} className="cartoon-border bg-secondary text-secondary-foreground font-bold">
                {getFileIcon(fileName)} {fileName}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Study Notes Content */}
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 cartoon-border">
            <TabsTrigger value="outline" className="cartoon-border">
              <BookOpen className="h-4 w-4 mr-2" strokeWidth={3} />
              Outline
            </TabsTrigger>
            <TabsTrigger value="concepts" className="cartoon-border">
              <Brain className="h-4 w-4 mr-2" strokeWidth={3} />
              Concepts
            </TabsTrigger>
            <TabsTrigger value="diagrams" className="cartoon-border">
              <Image className="h-4 w-4 mr-2" strokeWidth={3} />
              Diagrams
            </TabsTrigger>
            <TabsTrigger value="videos" className="cartoon-border">
              <Youtube className="h-4 w-4 mr-2" strokeWidth={3} />
              Videos
            </TabsTrigger>
            <TabsTrigger value="quiz" className="cartoon-border">
              <FileText className="h-4 w-4 mr-2" strokeWidth={3} />
              Quiz Prep
            </TabsTrigger>
          </TabsList>

          {/* Outline Tab */}
          <TabsContent value="outline" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-xl font-black text-foreground">Study Outline</h3>
              <div className="space-y-3">
                {notes.outline?.map((item: string, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-secondary/30 cartoon-border">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                      {index + 1}
                    </div>
                    <p className="text-foreground font-bold">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Concepts Tab */}
          <TabsContent value="concepts" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-foreground">Key Concepts</h3>
              
              {/* Key Terms */}
              {notes.key_terms && notes.key_terms.length > 0 && (
                <div>
                  <h4 className="font-black text-foreground mb-3">Key Terms</h4>
                  <div className="flex flex-wrap gap-2">
                    {notes.key_terms.map((term: string, index: number) => (
                      <Badge key={index} className="cartoon-border bg-primary text-primary-foreground font-black">
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Concepts */}
              {notes.concepts && notes.concepts.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-black text-foreground">Detailed Concepts</h4>
                  {notes.concepts.map((concept: any, index: number) => (
                    <div key={index} className="p-4 rounded-lg bg-secondary/30 cartoon-border">
                      <h5 className="font-black text-foreground mb-2">{concept.title || concept.heading}</h5>
                      <ul className="space-y-1">
                        {(concept.bullets || concept.description || []).map((bullet: string, bulletIndex: number) => (
                          <li key={bulletIndex} className="text-muted-foreground font-bold flex items-start gap-2">
                            <span className="text-primary font-black">•</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Diagrams Tab */}
          <TabsContent value="diagrams" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-foreground">Visual Diagrams</h3>
              
              {notes.diagrams && notes.diagrams.length > 0 ? (
                <div className="space-y-4">
                  {/* Diagram Navigation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDiagram(Math.max(0, currentDiagram - 1))}
                        disabled={currentDiagram === 0}
                        className="cartoon-border"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                      </Button>
                      <span className="text-sm text-muted-foreground font-bold">
                        {currentDiagram + 1} of {notes.diagrams.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDiagram(Math.min(notes.diagrams.length - 1, currentDiagram + 1))}
                        disabled={currentDiagram === notes.diagrams.length - 1}
                        className="cartoon-border"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={3} />
                      </Button>
                    </div>
                  </div>

                  {/* Current Diagram */}
                  <div className="space-y-4">
                    <div className="aspect-video bg-muted rounded-lg cartoon-border overflow-hidden">
                      {notes.diagrams[currentDiagram]?.image_url ? (
                        <img
                          src={notes.diagrams[currentDiagram].image_url}
                          alt={notes.diagrams[currentDiagram].title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-2" strokeWidth={1} />
                            <p className="text-muted-foreground font-bold">Diagram placeholder</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-lg bg-secondary/30 cartoon-border">
                      <h4 className="font-black text-foreground mb-2">
                        {notes.diagrams[currentDiagram]?.title || `Diagram ${currentDiagram + 1}`}
                      </h4>
                      <p className="text-muted-foreground font-bold mb-2">
                        {notes.diagrams[currentDiagram]?.caption || notes.diagrams[currentDiagram]?.description || 'No description available'}
                      </p>
                      {notes.diagrams[currentDiagram]?.description && 
                       notes.diagrams[currentDiagram]?.description !== notes.diagrams[currentDiagram]?.caption && (
                        <p className="text-muted-foreground/80 font-bold text-sm mb-2">
                          {notes.diagrams[currentDiagram].description}
                        </p>
                      )}
                      {notes.diagrams[currentDiagram]?.credit && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Credit: {notes.diagrams[currentDiagram].credit}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
                  <p className="text-muted-foreground font-bold">No diagrams available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-foreground">Recommended Videos</h3>
              
              {notes.resources?.videos && Array.isArray(notes.resources.videos) && notes.resources.videos.length > 0 ? (
                <div className="space-y-4">
                  {notes.resources.videos.map((video: any, index: number) => {
                    // Extract YouTube video ID from URL
                    const url = video.url || ''
                    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
                    const videoId = videoIdMatch ? videoIdMatch[1] : null
                    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null

                    return (
                      <div key={index} className="p-4 rounded-lg bg-secondary/30 cartoon-border">
                        <div className="space-y-3">
                          {embedUrl ? (
                            <div className="aspect-video bg-muted rounded-lg overflow-hidden cartoon-border">
                              <iframe
                                src={embedUrl}
                                title={video.title || `Video ${index + 1}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center cartoon-border">
                              <Youtube className="h-12 w-12 text-red-500/60" strokeWidth={1} />
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-black text-foreground mb-2">
                              {video.title || `Video ${index + 1}`}
                            </h4>
                            <p className="text-muted-foreground font-bold text-sm mb-2">
                              {video.description || 'No description available'}
                            </p>
                            {video.url && (
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 font-bold text-sm inline-flex items-center gap-1"
                              >
                                <Youtube className="h-4 w-4" strokeWidth={2} />
                                Open video on YouTube
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
                  <p className="text-muted-foreground font-bold">No video recommendations available</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Quiz Prep Tab */}
          <TabsContent value="quiz" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-foreground">Quiz Preparation</h3>
              
              {notes.quiz && notes.quiz.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-chart-3/10 cartoon-border">
                    <h4 className="font-black text-chart-3 mb-2">Practice Questions</h4>
                    <p className="text-muted-foreground font-bold">
                      Review these questions to prepare for the quiz. The actual quiz will have similar questions.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {notes.quiz.map((qa: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg bg-secondary/30 cartoon-border">
                        <h5 className="font-black text-foreground mb-3">
                          Q{index + 1}: {qa.q || qa.question}
                        </h5>
                        <div className="space-y-2">
                          {(qa.options || [qa.a]).map((option: string, optionIndex: number) => (
                            <div key={optionIndex} className="flex items-center gap-3 p-2 rounded-lg bg-card cartoon-border">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-black text-sm">
                                {String.fromCharCode(65 + optionIndex)}
                              </div>
                              <span className="text-foreground font-bold">{option}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-3 rounded-lg bg-primary/10 cartoon-border">
                          <p className="text-sm text-primary font-bold">
                            Answer: {qa.a || qa.correct_answer || 'See explanation'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
                  <p className="text-muted-foreground font-bold">No practice questions available</p>
                </div>
              )}

              {/* Start Quiz Button */}
              {isHost && (
                <div className="pt-6 border-t border-border">
                  <Button
                    onClick={onStartQuiz}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
                  >
                    <FileText className="h-5 w-5 mr-2" strokeWidth={3} />
                    Start Quiz for All Members
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
