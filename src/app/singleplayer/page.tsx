"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { QuizConfigModal, QuizConfig } from "@/components/quiz/quiz-config-modal"
import { BrainBattleLoading } from "@/components/ui/brain-battle-loading"
import { useToast } from "@/components/ui/toast"

export default function SingleplayerPage() {
  const router = useRouter()
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast()
  const [step, setStep] = useState(1)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const [authError, setAuthError] = useState<string | null>(null)

  // Check authentication on page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/current', {
          credentials: 'include', // Important: include cookies
          cache: 'no-store', // Don't cache auth checks
        })
        
        const data = await response.json()
        
        if (response.ok && data.success && data.userId) {
          setIsAuthenticated(true)
          setAuthError(null)
          setIsCheckingAuth(false)
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [SINGLEPLAYER] User authenticated:', data.userId)
          }
          return
        }
        
        // Not authenticated - get error message
        const errorMessage = data.error || 'Please log in to continue'
        const errorCode = data.errorCode
        
        // Special handling for "logged in elsewhere" - show message before redirect
        if (errorCode === 'LOGGED_IN_ELSEWHERE') {
          setAuthError('You have been logged out because you logged in on another device. Redirecting to login...')
          setTimeout(() => {
            router.push(`/login?redirect=${encodeURIComponent('/singleplayer')}&error=${encodeURIComponent(errorMessage)}`)
          }, 3000)
          setIsCheckingAuth(false)
          return
        }
        
        // For other errors, redirect immediately with error message
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ [SINGLEPLAYER] Not authenticated, redirecting to login')
          console.log('   Response status:', response.status)
          console.log('   Error code:', errorCode)
          console.log('   Error message:', errorMessage)
        }
        
        const currentUrl = '/singleplayer'
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}&error=${encodeURIComponent(errorMessage)}`)
      } catch (error) {
        console.error('❌ [SINGLEPLAYER] Error checking authentication:', error)
        // On error, redirect to login
        router.push('/login?redirect=' + encodeURIComponent('/singleplayer') + '&error=' + encodeURIComponent('An error occurred. Please log in again.'))
      } finally {
        setIsCheckingAuth(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  // Check for admin mode from URL (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setIsAdminMode(params.get('admin') === 'true')
    }
  }, [])
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [educationLevel, setEducationLevel] = useState<'elementary' | 'high_school' | 'university' | 'graduate'>('university')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [studyNotes, setStudyNotes] = useState<any>(null)
  const [processedFileNames, setProcessedFileNames] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [studyContext, setStudyContext] = useState<any>(null)
  const [subscriptionLimits, setSubscriptionLimits] = useState<any>(null)
  const [showQuizConfig, setShowQuizConfig] = useState(false)
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchLimits = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription/limits', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSubscriptionLimits(data)
        }
      }
    } catch (error) {
      console.error('Error fetching subscription limits:', error)
    }
  }, [])

  // Fetch subscription limits (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated || isCheckingAuth) return
    fetchLimits()
  }, [isAuthenticated, isCheckingAuth, fetchLimits])

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
    const maxSize = 5 * 1024 * 1024 // 5MB - Optimized for cost control
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
        errors.push(`${file.name}: File too large (max 5MB)`)
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

    // Simulate upload delay for better UX
    setTimeout(() => {
      const { validFiles, errors } = validateFiles(files)
      
      if (validFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...validFiles])
        toastSuccess(`${validFiles.length} file${validFiles.length > 1 ? 's' : ''} uploaded successfully!`)
      }
      
      if (errors.length > 0) {
        errors.forEach(error => {
          toastError(error, "Upload Error")
        })
      }
      
      setIsUploading(false)
    }, 500)
  }, [validateFiles, toastSuccess, toastError])

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
      const battleTopic = studyNotes?.title || topic || 'General Knowledge'
      formData.append('topic', battleTopic)
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
        // Refresh limits to reflect newly processed documents
        fetchLimits()
        toastSuccess("Study notes generated successfully!")
        setStep(4) // Go to study notes step
      } else {
        toastError(result.error || "Failed to generate study notes", "Generation Error")
      }
    } catch (error) {
      console.error("Error generating study notes:", error)
      toastError("Failed to generate study notes. Please try again.", "Error")
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
      },
      contentFocus: 'both' as const,
      includeDiagrams: true
    }
    setShowQuizConfig(false)
    setQuizConfig(config || null)
    setIsGenerating(true)
    
    try {
      // Get current user ID from API endpoint
      const userResponse = await fetch('/api/user/current')
      let userId: string | null = null
      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.success && userData.userId) {
          userId = userData.userId
        }
      }
      
      if (!userId) {
        toastError('You must be logged in to generate a quiz', "Authentication Error")
        setIsGenerating(false)
        return
      }
      
      const formData = new FormData()
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach(file => {
          formData.append('files', file)
        })
      }
      formData.append('topic', topic)
      formData.append('difficulty', difficulty)
      formData.append('educationLevel', educationLevel)
      formData.append('totalQuestions', activeConfig.totalQuestions.toString())
      formData.append('questionTypes', JSON.stringify(activeConfig.questionTypes))
      formData.append('contentFocus', activeConfig.contentFocus)
      formData.append('includeDiagrams', activeConfig.includeDiagrams.toString())
      if (userId) {
        formData.append('userId', userId)
      }
      if (studyContext) {
        formData.append('studyContext', JSON.stringify(studyContext))
      }
      if (studyNotes) {
        formData.append('notes', JSON.stringify(studyNotes))
      }
      
      // Add admin mode header if in admin mode
      const headers: HeadersInit = {}
      if (isAdminMode) {
        headers['x-admin-mode'] = 'true'
      }
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers,
        body: formData
      })
      
        const result = await response.json()
      
        if (result.success) {
        // Generate unique session ID
        const sessionId = crypto.randomUUID()
        
        // Determine battle topic (use study notes title if available, otherwise use topic input)
        const battleTopic = studyNotes?.title || topic || 'General Knowledge'
        
        // Store questions and session ID in sessionStorage for the battle page
        sessionStorage.setItem('quizQuestions', JSON.stringify(result.questions))
        sessionStorage.setItem('quizTopic', battleTopic)
        sessionStorage.setItem('quizDifficulty', difficulty)
        sessionStorage.setItem('quizSessionId', sessionId)
        
        // Store documentId and quiz settings if available
        if (result.documentId) {
          sessionStorage.setItem('documentId', result.documentId)
        }
        sessionStorage.setItem('educationLevel', educationLevel)
        sessionStorage.setItem('contentFocus', activeConfig.contentFocus)
        sessionStorage.setItem('includeDiagrams', activeConfig.includeDiagrams.toString())
        
        // Store quiz ready flag to show popup
        sessionStorage.setItem('quizReady', 'true')
        
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
          toastError(result.error || 'Unknown error occurred', "Quiz Generation Error")
        }
      }
    } catch (error) {
      console.error("Error starting battle:", error)
      toastError("Failed to generate battle questions. Please try again.", "Error")
    } finally {
      setIsGenerating(false)
    }
  }

  const maxQuestions = subscriptionLimits?.limits?.maxQuestionsPerQuiz || 10
  const defaultQuestions = Math.min(maxQuestions, 5)

  // Show loading screen when generating notes or quiz
  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BrainBattleLoading />
          {authError && (
            <div className="max-w-md mx-auto mt-4 p-4 rounded-xl bg-orange-500/10 border-2 border-orange-500/50">
              <p className="text-orange-400 font-bold text-sm">{authError}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-200 font-bold">Checking authentication...</p>
        </div>
      </div>
    )
  }
  
  // Don't render page if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  if (isGenerating) {
    return <BrainBattleLoading message="Generating your Brain Battle experience..." />
  }

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
              {/* Upload progress - keep this visible */}
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
                    Multiple files supported • Max 5MB per file
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
                  {/* Education Level Selection */}
                  <div className="p-4 rounded-xl bg-slate-700/50 border-2 border-slate-600/50">
                    <label className="block text-base font-bold text-white mb-3">
                      Education Level
                    </label>
                    <select 
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value as 'elementary' | 'high_school' | 'university' | 'graduate')}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border-2 border-slate-600/50 text-white font-bold focus:border-blue-400 focus:outline-none"
                    >
                      <option value="elementary">Elementary School</option>
                      <option value="high_school">High School</option>
                      <option value="university">University</option>
                      <option value="graduate">Graduate School</option>
                    </select>
                    <p className="text-xs text-white/60 font-bold mt-2">
                      This helps us adjust question difficulty to match your level
                    </p>
                  </div>

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

        {/* Step 2: Topic Selection & Notes Generation */}
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
                  <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
                  Back
                </Button>
                <Button
                  onClick={handleGenerateNotes}
                  disabled={isGenerating || uploadedFiles.length === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-2 border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={3} />
                      Generating Notes...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 mr-2" strokeWidth={3} />
                      Generate Notes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3 removed - notes generation now happens directly from Step 2 */}

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
