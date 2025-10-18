"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, FileText, BookOpen, Brain, Zap, X, Plus, CheckCircle, AlertCircle, FileIcon, Loader2 } from "lucide-react"
import Link from "next/link"
import { generateQuizQuestions, extractTextFromFile } from "@/lib/actions/quiz-generation"
import { StudyNotesViewer } from "@/components/study-notes/study-notes-viewer"
import { StudyContextChatbot } from "@/components/study-assistant/study-context-chatbot"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"

export default function SingleplayerPage() {
  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [studyNotes, setStudyNotes] = useState<any>(null)
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUploadSuccess, setShowUploadSuccess] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [studyContext, setStudyContext] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File validation - memoized to prevent unnecessary recalculations
  const validateFiles = useCallback((files: File[]): { validFiles: File[], errors: string[] } => {
    const validFiles: File[] = []
    const errors: string[] = []
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]

    files.forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max 10MB)`)
        return
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`)
        return
      }

      // Check for duplicate names
      if (uploadedFiles.some(existingFile => existingFile.name === file.name)) {
        errors.push(`${file.name}: File already uploaded`)
        return
      }

      validFiles.push(file)
    })

    return { validFiles, errors }
  }, [uploadedFiles])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
  }, [])

  const processFiles = useCallback((files: File[]) => {
    setIsUploading(true)
    setUploadErrors([])

    // Simulate upload delay for better UX
    setTimeout(() => {
      const { validFiles, errors } = validateFiles(files)
      
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles])
        setShowUploadSuccess(true)
        setTimeout(() => setShowUploadSuccess(false), 3000)
      }
      
      if (errors.length > 0) {
        setUploadErrors(errors)
        setTimeout(() => setUploadErrors([]), 5000)
      }
      
      setIsUploading(false)
    }, 500)
  }, [validateFiles])

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragCounter(prev => prev + 1)
    if (dragCounter === 0) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragCounter(prev => prev - 1)
    if (dragCounter <= 1) {
      setIsDragOver(false)
      setDragCounter(0)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
    setDragCounter(0)
    
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return '📄'
    if (file.type.includes('word')) return '📝'
    if (file.type.includes('powerpoint') || file.type.includes('presentation')) return '📊'
    if (file.type === 'text/plain') return '📃'
    return '📁'
  }

  const handleGenerateNotes = async () => {
    setIsGenerating(true)
    
    try {
      const formData = new FormData()
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          formData.append('files', file)
        })
      }
      formData.append('topic', topic)
      formData.append('difficulty', difficulty)
      if (studyContext) {
        formData.append('studyContext', JSON.stringify(studyContext))
      }
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        setStudyNotes(result.notes)
        setProcessedFileNames(result.fileNames || [])
        sessionStorage.setItem('studyNotes', JSON.stringify(result.notes))
        sessionStorage.setItem('processedFileNames', JSON.stringify(result.fileNames || []))
        setStep(4) // Go to study notes step
      } else {
        alert(`Error generating study notes: ${result.error}`)
      }
    } catch (error) {
      console.error("Error generating study notes:", error)
      alert("Failed to generate study notes. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartBattle = async () => {
    setIsGenerating(true)
    
    try {
      const formData = new FormData()
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          formData.append('files', file)
        })
      }
      formData.append('topic', topic)
      formData.append('difficulty', difficulty)
      if (studyContext) {
        formData.append('studyContext', JSON.stringify(studyContext))
      }
      if (studyNotes) {
        formData.append('notes', JSON.stringify(studyNotes))
      }
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Store questions in sessionStorage for the battle page
        sessionStorage.setItem('quizQuestions', JSON.stringify(result.questions))
        sessionStorage.setItem('quizTopic', topic)
        sessionStorage.setItem('quizDifficulty', difficulty)
        
        // Redirect to battle page
        window.location.href = "/singleplayer/battle"
      } else {
        alert(`Error generating questions: ${result.error}`)
      }
    } catch (error) {
      console.error("Error starting battle:", error)
      alert("Failed to generate battle questions. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" className="cartoon-border cartoon-shadow">
              <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Singleplayer Battle
            </h1>
            <p className="text-muted-foreground font-bold">Test your knowledge with AI-generated questions</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full cartoon-border ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-card"
            }`}>
              <Upload className="h-5 w-5" strokeWidth={3} />
              <span className="font-black">1. Upload</span>
            </div>
            <div className="w-8 h-1 bg-border rounded"></div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full cartoon-border ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-card"
            }`}>
              <BookOpen className="h-5 w-5" strokeWidth={3} />
              <span className="font-black">2. Topic</span>
            </div>
            <div className="w-8 h-1 bg-border rounded"></div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full cartoon-border ${
              step >= 3 ? "bg-primary text-primary-foreground" : "bg-card"
            }`}>
              <Brain className="h-5 w-5" strokeWidth={3} />
              <span className="font-black">3. Notes</span>
            </div>
            <div className="w-8 h-1 bg-border rounded"></div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full cartoon-border ${
              step >= 4 ? "bg-primary text-primary-foreground" : "bg-card"
            }`}>
              <Zap className="h-5 w-5" strokeWidth={3} />
              <span className="font-black">4. Battle</span>
            </div>
          </div>
        </div>

        {/* Step 1: Document Upload */}
        {step === 1 && (
          <Card 
            className={`p-8 bg-card cartoon-border cartoon-shadow transition-all duration-200 hover:shadow-lg ${
              isDragOver ? 'border-primary bg-primary/5 scale-[1.02]' : ''
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 cartoon-border cartoon-shadow">
                <Upload className="w-8 h-8 text-primary-foreground" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-foreground mb-2">Upload Your Study Materials</h2>
              <p className="text-muted-foreground font-bold">Drag & drop files anywhere on this card, or click to browse</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Success message */}
              {showUploadSuccess && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-green-600 font-black">✅ Files uploaded successfully!</p>
                </div>
              )}

              {/* Error messages */}
              {uploadErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-red-600 font-black">Upload Errors:</p>
                  </div>
                  <ul className="space-y-1">
                    {uploadErrors.map((error, index) => (
                      <li key={index} className="text-red-600 text-sm font-bold">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upload progress */}
              {isUploading && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <p className="text-blue-600 font-black">Processing files...</p>
                  </div>
                </div>
              )}
              
              {/* Large drag and drop area */}
              <div className={`border-4 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer group ${
                isDragOver 
                  ? 'border-primary bg-primary/10 scale-[1.01]' 
                  : 'border-border hover:border-primary hover:bg-primary/5'
              }`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt,.pptx,.ppt"
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <div 
                  onClick={triggerFileInput}
                  className="cursor-pointer block"
                >
                  <div className="w-20 h-20 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-6 cartoon-border transition-colors">
                    <Plus className="w-10 h-10 text-muted-foreground group-hover:text-primary" strokeWidth={3} />
                  </div>
                  <p className="text-2xl font-black text-foreground mb-3">Drop your files here</p>
                  <p className="text-lg text-muted-foreground font-bold mb-4">
                    Or click to browse your computer
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-sm">
                    <Badge className="cartoon-border bg-secondary text-secondary-foreground font-bold">PDF</Badge>
                    <Badge className="cartoon-border bg-secondary text-secondary-foreground font-bold">DOC</Badge>
                    <Badge className="cartoon-border bg-secondary text-secondary-foreground font-bold">DOCX</Badge>
                    <Badge className="cartoon-border bg-secondary text-secondary-foreground font-bold">TXT</Badge>
                    <Badge className="cartoon-border bg-secondary text-secondary-foreground font-bold">PPT</Badge>
                    <Badge className="cartoon-border bg-secondary text-secondary-foreground font-bold">PPTX</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-bold mt-4">
                    Multiple files supported • Max 10MB per file
                  </p>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-foreground text-xl">Uploaded Documents ({uploadedFiles.length})</h3>
                    <Button
                      onClick={() => setUploadedFiles([])}
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-4 w-4 mr-1" strokeWidth={3} />
                      Clear All
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="p-4 rounded-xl bg-secondary/50 cartoon-border hover:bg-secondary/70 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center cartoon-border">
                            <span className="text-2xl">{getFileIcon(file)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-foreground truncate">{file.name}</p>
                            <p className="text-sm text-muted-foreground font-bold">
                              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                            </p>
                          </div>
                          <Button
                            onClick={() => removeFile(index)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive shrink-0"
                          >
                            <X className="h-4 w-4" strokeWidth={3} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
              >
                Next: Choose Study Focus
              </Button>
            </div>
          </Card>
        )}

        {/* Study Context Chatbot - appears after upload */}
        {step === 1 && uploadedFiles.length > 0 && (
          <StudyContextChatbot 
            onContextUpdate={setStudyContext}
            uploadedFiles={uploadedFiles}
          />
        )}

        {/* Step 2: Topic Selection */}
        {step === 2 && (
          <Card className="p-8 bg-card cartoon-border cartoon-shadow">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4 cartoon-border cartoon-shadow">
                <BookOpen className="w-8 h-8 text-secondary-foreground" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-foreground mb-2">What do you want to study?</h2>
              <p className="text-muted-foreground font-bold">Choose what to focus on from your uploaded materials</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              {uploadedFiles.length > 0 && (
                <div className="p-4 rounded-xl bg-secondary/50 cartoon-border mb-6">
                  <h3 className="font-black text-foreground mb-2">Your Materials:</h3>
                  <div className="space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-secondary" strokeWidth={3} />
                        <span className="text-muted-foreground font-bold">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-foreground mb-2">
                  Study Focus / Topic
                </label>
                <Input
                  placeholder="e.g., Photosynthesis, World War II, Calculus derivatives..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-12 text-lg font-bold cartoon-border"
                />
                <p className="text-xs text-muted-foreground font-bold mt-1">
                  What specific topic or concept do you want to study from your materials?
                </p>
              </div>

              <div>
                <label className="block text-sm font-black text-foreground mb-3">
                  Difficulty Level
                </label>
                <div className="flex gap-3">
                  {(["easy", "medium", "hard"] as const).map((level) => (
                    <Button
                      key={level}
                      variant={difficulty === level ? "default" : "outline"}
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 h-12 font-black cartoon-border ${
                        difficulty === level
                          ? "bg-primary text-primary-foreground"
                          : "bg-card hover:bg-muted"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 h-12 font-black cartoon-border cartoon-shadow"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!topic.trim()}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
                >
                  Next: Generate Notes
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Study Notes Generation */}
        {step === 3 && (
          <Card className="p-8 bg-card cartoon-border cartoon-shadow">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-chart-3 flex items-center justify-center mx-auto mb-4 cartoon-border cartoon-shadow">
                <Brain className="w-8 h-8 text-foreground" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-foreground mb-2">Generate Study Notes!</h2>
              <p className="text-muted-foreground font-bold">AI will create comprehensive study notes with diagrams from your document</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              <div className="p-6 rounded-xl bg-secondary/50 cartoon-border">
                <h3 className="font-black text-foreground mb-3">Study Notes Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Topic:</span>
                    <span className="font-black text-foreground">{topic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Difficulty:</span>
                    <Badge className={`cartoon-border font-black ${
                      difficulty === "hard"
                        ? "bg-destructive text-destructive-foreground"
                        : difficulty === "medium"
                        ? "bg-primary text-primary-foreground"
                        : "bg-chart-3 text-foreground"
                    }`}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Sources:</span>
                    <span className="font-black text-foreground">
                      {uploadedFiles.length > 0 
                        ? `${uploadedFiles.length} document${uploadedFiles.length > 1 ? 's' : ''}`
                        : 'No documents uploaded'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 h-12 font-black cartoon-border cartoon-shadow"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateNotes}
                  disabled={isGenerating}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                      Generating Notes...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 mr-2" strokeWidth={3} />
                      Generate Notes!
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Study Notes Viewer */}
        {step === 4 && studyNotes && (
          <div>
            <StudyNotesViewer 
              notes={studyNotes}
              fileNames={processedFileNames}
              onStartBattle={async () => {
                try {
                  // Generate proper quiz questions using AI
                  const response = await fetch('/api/generate-quiz', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      topic: topic,
                      difficulty: difficulty,
                      studyNotes: studyNotes,
                      userId: 'temp-user' // In production, get from auth
                    })
                  })
                  
                  const result = await response.json()
                  
                  if (result.success) {
                    // Store quiz data in sessionStorage
                    sessionStorage.setItem('quizQuestions', JSON.stringify(result.questions))
                    sessionStorage.setItem('quizTopic', topic)
                    sessionStorage.setItem('quizDifficulty', difficulty)
                    
                    // Redirect to battle page
                    window.location.href = '/singleplayer/battle'
                  } else {
                    console.error('Failed to generate quiz:', result.error)
                    alert('Failed to generate quiz questions. Please try again.')
                  }
                } catch (error) {
                  console.error('Error generating quiz:', error)
                  alert('Error generating quiz questions. Please try again.')
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
