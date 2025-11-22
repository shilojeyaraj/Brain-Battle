"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, FileText, BookOpen, Brain, Zap, X, Plus, CheckCircle, AlertCircle, FileIcon, Loader2, Crown } from "lucide-react"
import Link from "next/link"
import { generateQuizQuestions, extractTextFromFile } from "@/lib/actions/quiz-generation"
import { StudyNotesViewer } from "@/components/study-notes/study-notes-viewer"
import { StudyContextChatbot } from "@/components/study-assistant/study-context-chatbot"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { motion } from "framer-motion"
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt"
import { getCurrentUserId } from "@/lib/auth/session"
import { QuizConfigModal, QuizConfig } from "@/components/quiz/quiz-config-modal"

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
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null)
  const [showQuizConfig, setShowQuizConfig] = useState(false)
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch subscription limits
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await fetch('/api/subscription/limits')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSubscriptionLimits(data)
          }
        }
      } catch (error) {
        console.error('Error fetching subscription limits:', error)
      }
    }
    fetchLimits()
  }, [])

  // Check for quiz config from dashboard
  useEffect(() => {
    const storedConfig = sessionStorage.getItem('quizConfig')
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig)
        setQuizConfig(config)
        sessionStorage.removeItem('quizConfig') // Clear after reading
      } catch (error) {
        console.error('Error parsing stored quiz config:', error)
      }
    }
  }, [])

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

      // Check for duplicate names AND sizes (more robust duplicate detection)
      const isDuplicate = uploadedFiles.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      )
      
      if (isDuplicate) {
        errors.push(`${file.name}: File already uploaded (same name and size)`)
        return
      }
      
      // Also check for duplicates within the current batch
      const isDuplicateInBatch = validFiles.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      )
      
      if (isDuplicateInBatch) {
        errors.push(`${file.name}: Duplicate file in this upload`)
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

  const handleStartBattleClick = () => {
    // Show configuration modal
    setShowQuizConfig(true)
  }

  const handleStartBattle = async (config?: QuizConfig) => {
    // Use provided config, stored config, or default
    const activeConfig = config || quizConfig || {
      totalQuestions: defaultQuestions,
      questionTypes: {
        multiple_choice: true,
        open_ended: true,
        true_false: true
      }
    }
    setShowQuizConfig(false)
    setQuizConfig(config)
    setIsGenerating(true)
    
    try {
      // Get current user ID
      const userId = await getCurrentUserId()
      
      const formData = new FormData()
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          formData.append('files', file)
        })
      }
      formData.append('topic', topic)
      formData.append('difficulty', difficulty)
      formData.append('totalQuestions', activeConfig.totalQuestions.toString())
      formData.append('questionTypes', JSON.stringify(activeConfig.questionTypes))
      if (userId) {
        formData.append('userId', userId)
      }
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
        // Generate unique session ID
        const sessionId = crypto.randomUUID()
        
        // Store questions and session ID in sessionStorage for the battle page
        sessionStorage.setItem('quizQuestions', JSON.stringify(result.questions))
        sessionStorage.setItem('quizTopic', topic)
        sessionStorage.setItem('quizDifficulty', difficulty)
        sessionStorage.setItem('quizSessionId', sessionId)
        
        // Redirect to battle page with session ID in URL
        window.location.href = `/singleplayer/battle/${sessionId}`
      } else {
        // Check if it's a subscription limit error
        if (response.status === 403 && result.requiresPro) {
          // Show upgrade prompt for subscription limits
          const upgrade = confirm(`${result.error}\n\nWould you like to upgrade to Pro?`)
          if (upgrade) {
            window.location.href = '/pricing'
          }
        } else {
          alert(`Error generating questions: ${result.error || 'Unknown error occurred'}`)
        }
      }
    } catch (error) {
      console.error("Error starting battle:", error)
      alert("Failed to generate battle questions. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const maxQuestions = subscriptionLimits?.limits?.maxQuestionsPerQuiz || 8
  const defaultQuestions = Math.min(maxQuestions, 5)

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      {/* Quiz Configuration Modal */}
      <QuizConfigModal
        isOpen={showQuizConfig}
        onClose={() => setShowQuizConfig(false)}
        onStart={handleStartBattle}
        maxQuestions={maxQuestions}
        defaultQuestions={defaultQuestions}
      />
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          className="relative mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Back button in top left corner */}
          <div className="absolute left-0 top-0">
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400 shadow-lg hover:shadow-xl hover:shadow-orange-500/50">
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          {/* Title and description centered */}
          <div className="text-center">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent">
              Singleplayer Battle
            </h1>
            <p className="text-blue-100/70 font-bold">Test your knowledge with AI-generated questions</p>
          </div>
        </motion.div>

        {/* Progress Steps - Hide once notes are generated */}
        {!studyNotes && (
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                step >= 1 
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400" 
                  : "bg-gradient-to-br from-slate-800 to-slate-900 text-blue-100/70 border-slate-600/50"
              }`}>
                <Upload className="h-5 w-5" strokeWidth={3} />
                <span className="font-black">1. Upload</span>
              </div>
              <div className="w-8 h-1 bg-slate-700/50 rounded"></div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                step >= 2 
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400" 
                  : "bg-gradient-to-br from-slate-800 to-slate-900 text-blue-100/70 border-slate-600/50"
              }`}>
                <BookOpen className="h-5 w-5" strokeWidth={3} />
                <span className="font-black">2. Topic</span>
              </div>
              <div className="w-8 h-1 bg-slate-700/50 rounded"></div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                step >= 3 
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400" 
                  : "bg-gradient-to-br from-slate-800 to-slate-900 text-blue-100/70 border-slate-600/50"
              }`}>
                <Brain className="h-5 w-5" strokeWidth={3} />
                <span className="font-black">3. Notes</span>
              </div>
              <div className="w-8 h-1 bg-slate-700/50 rounded"></div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                step >= 4 
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400" 
                  : "bg-gradient-to-br from-slate-800 to-slate-900 text-blue-100/70 border-slate-600/50"
              }`}>
                <Zap className="h-5 w-5" strokeWidth={3} />
                <span className="font-black">4. Battle</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Document Upload */}
        {step === 1 && (
          <Card 
            className={`p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg transition-all duration-200 hover:shadow-xl ${
              isDragOver ? 'border-blue-400 bg-blue-500/10 scale-[1.02]' : ''
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 border-2 border-blue-400">
                <Upload className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Upload Your Study Materials</h2>
              <p className="text-blue-100/70 font-bold">Drag & drop files anywhere on this card, or click to browse</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Success message */}
              {showUploadSuccess && (
                <div className="p-4 rounded-xl bg-green-500/10 border-2 border-green-500/50 text-center">
                  <p className="text-green-400 font-black">✅ Files uploaded successfully!</p>
                </div>
              )}

              {/* Error messages */}
              {uploadErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <p className="text-red-400 font-black">Upload Errors:</p>
                  </div>
                  <ul className="space-y-1">
                    {uploadErrors.map((error, index) => (
                      <li key={index} className="text-red-400 text-sm font-bold">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upload progress */}
              {isUploading && (
                <div className="p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/50 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                    <p className="text-blue-400 font-black">Processing files...</p>
                  </div>
                </div>
              )}
              
              {/* Large drag and drop area */}
              <div className={`border-4 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer group ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' 
                  : 'border-slate-600/50 hover:border-blue-400 hover:bg-blue-500/5'
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
                  <div className="w-20 h-20 rounded-xl bg-slate-700/50 group-hover:bg-blue-500/20 flex items-center justify-center mx-auto mb-6 border-2 border-slate-600/50 group-hover:border-blue-400 transition-colors">
                    <Plus className="w-10 h-10 text-blue-300/70 group-hover:text-blue-300" strokeWidth={3} />
                  </div>
                  <p className="text-2xl font-black text-white mb-3">Drop your files here</p>
                  <p className="text-lg text-blue-100/70 font-bold mb-4">
                    Or click to browse your computer
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-sm">
                    <Badge className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">PDF</Badge>
                    <Badge className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">DOC</Badge>
                    <Badge className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">DOCX</Badge>
                    <Badge className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">TXT</Badge>
                    <Badge className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">PPT</Badge>
                    <Badge className="border-2 border-blue-400/50 bg-blue-500/20 text-blue-300 font-bold">PPTX</Badge>
                  </div>
                  <p className="text-sm text-blue-100/60 font-bold mt-4">
                    Multiple files supported • Max 10MB per file
                  </p>
                  {/* Document Limit Indicator */}
                  {subscriptionLimits && !subscriptionLimits.usage.documents.isUnlimited && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-700/50 border-2 border-slate-600/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-100/70 font-bold">
                          Documents this month:
                        </span>
                        <span className="text-white font-black">
                          {subscriptionLimits.usage.documents.count} / {subscriptionLimits.usage.documents.limit}
                        </span>
                      </div>
                      {subscriptionLimits.usage.documents.remaining === 0 && (
                        <UpgradePrompt
                          feature="documents"
                          limit={subscriptionLimits.usage.documents.limit}
                          current={subscriptionLimits.usage.documents.count}
                          className="mt-3"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-white text-xl">Uploaded Documents ({uploadedFiles.length})</h3>
                    <Button
                      onClick={() => setUploadedFiles([])}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-500/50 hover:bg-red-500/20 hover:text-red-300"
                    >
                      <X className="h-4 w-4 mr-1" strokeWidth={3} />
                      Clear All
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="p-4 rounded-xl bg-slate-700/50 border-2 border-slate-600/50 hover:bg-slate-700/70 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center border-2 border-blue-400/30">
                            <span className="text-2xl">{getFileIcon(file)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white truncate">{file.name}</p>
                            <p className="text-sm text-blue-100/60 font-bold">
                              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                            </p>
                          </div>
                          <Button
                            onClick={() => removeFile(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 shrink-0"
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
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400"
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
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 border-2 border-green-400">
                <BookOpen className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">What do you want to study?</h2>
              <p className="text-blue-100/70 font-bold">Choose what to focus on from your uploaded materials</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              {uploadedFiles.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-700/50 border-2 border-slate-600/50 mb-6">
                  <h3 className="font-black text-white mb-2">Your Materials:</h3>
                  <div className="space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-blue-300" strokeWidth={3} />
                        <span className="text-blue-100/70 font-bold">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-blue-100 mb-2">
                  Study Focus / Topic
                </label>
                <Input
                  placeholder="e.g., Photosynthesis, World War II, Calculus derivatives..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
                />
                <p className="text-xs text-blue-100/60 font-bold mt-1">
                  What specific topic or concept do you want to study from your materials?
                </p>
              </div>

              <div>
                <label className="block text-sm font-black text-blue-100 mb-3">
                  Difficulty Level
                </label>
                <div className="flex gap-3">
                  {(["easy", "medium", "hard"] as const).map((level) => (
                    <Button
                      key={level}
                      variant={difficulty === level ? "default" : "outline"}
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 h-12 font-black border-2 ${
                        difficulty === level
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400"
                          : "bg-slate-700/50 text-blue-100/70 border-slate-600/50 hover:bg-slate-700/70"
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
                  className="flex-1 h-12 font-black border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={uploadedFiles.length === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400 disabled:opacity-50"
                >
                  Next: Generate Notes
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Study Notes Generation */}
        {step === 3 && (
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 border-2 border-orange-400">
                <Brain className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Generate Study Notes!</h2>
              <p className="text-blue-100/70 font-bold">AI will create comprehensive study notes with diagrams from your document</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              <div className="p-6 rounded-xl bg-slate-700/50 border-2 border-slate-600/50">
                <h3 className="font-black text-white mb-3">Study Notes Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-100/70 font-bold">Topic:</span>
                    <span className="font-black text-white">{topic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100/70 font-bold">Difficulty:</span>
                    <Badge className={`border-2 font-black ${
                      difficulty === "hard"
                        ? "bg-red-500/20 text-red-300 border-red-500/50"
                        : difficulty === "medium"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                        : "bg-green-500/20 text-green-300 border-green-500/50"
                    }`}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-100/70 font-bold">Sources:</span>
                    <span className="font-black text-white">
                      {uploadedFiles.length > 0 
                        ? `${uploadedFiles.length} document${uploadedFiles.length > 1 ? 's' : ''}`
                        : 'No documents uploaded'
                      }
                    </span>
                  </div>
                  {/* Quiz Question Limit Indicator */}
                  {subscriptionLimits && subscriptionLimits.limits.maxQuestionsPerQuiz !== Infinity && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-600/50">
                      <span className="text-blue-100/70 font-bold flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Quiz Questions:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white">
                          {subscriptionLimits.limits.maxQuestionsPerQuiz} per quiz
                        </span>
                        <Crown className="w-4 h-4 text-orange-400" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1 h-12 font-black border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateNotes}
                  disabled={isGenerating}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
              onStartBattle={handleStartBattleClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}
