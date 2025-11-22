'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Users, Upload, Settings, ArrowLeft, Copy, Check, Crown, Lock, RefreshCw, FileText, X, AlertCircle, Loader2, Zap, BookOpen, Lightbulb, MessageSquare, Clock } from 'lucide-react'
import Link from 'next/link'
import { useAntiCheat, CheatEvent } from '@/hooks/use-anti-cheat'
import { CheatAlertContainer, CheatAlertData } from '@/components/multiplayer/cheat-alert'
import { QuizProgressBar } from '@/components/ui/quiz-progress-bar'
import { Button } from '@/components/ui/button'
import { getCurrentUserId } from '@/lib/auth/session'

interface Room {
  id: string
  name: string
  room_code: string
  host_id: string
  subject?: string
  difficulty: 'easy' | 'medium' | 'hard'
  max_players: number
  current_players: number
  status: 'waiting' | 'active' | 'completed' | 'cancelled'
  is_private: boolean
  time_limit: number
  total_questions: number
  created_at: string
  started_at?: string
  ended_at?: string
}

interface Member {
  user_id: string
  joined_at: string
  is_ready: boolean
  users: {
    username: string
    email: string
  }
}

interface QuizSession {
  id: string
  room_id: string
  status: 'pending' | 'generating' | 'active' | 'complete'
  total_questions: number
  started_at: string | null
  ended_at: string | null
}

export default function RoomPage() {
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null)
  const [cheatAlerts, setCheatAlerts] = useState<CheatAlertData[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loadingButton, setLoadingButton] = useState<string | null>(null)
  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false)
  const [memberNotification, setMemberNotification] = useState<{ type: 'join' | 'leave', username: string } | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [showUploadSuccess, setShowUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [quizSettings, setQuizSettings] = useState({
    difficulty: 'medium',
    totalQuestions: 10,
    timeLimit: 30
  })
  const [isStartingQuiz, setIsStartingQuiz] = useState(false)
  const [isStartingStudySession, setIsStartingStudySession] = useState(false)
  const [playerProgress, setPlayerProgress] = useState<{[key: string]: {currentQuestion: number, score: number, isActive: boolean}}>({})
  
  // Current user's quiz progress
  const [currentUserProgress, setCurrentUserProgress] = useState({
    currentQuestion: 0,
    score: 0,
    timeLeft: 30,
    streak: 0
  })
  const [studySession, setStudySession] = useState<{
    isActive: boolean
    timeRemaining: number
    studyMaterials: any
    resources: {
      notes: string[]
      links: {title: string, url: string}[]
      videos: {title: string, url: string}[]
    }
  }>({
    isActive: false,
    timeRemaining: 0,
    studyMaterials: null,
    resources: { notes: [], links: [], videos: [] }
  })
  
  // Study session time editing
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editingTime, setEditingTime] = useState(5) // Default 5 minutes
  const [studySessionDuration, setStudySessionDuration] = useState(5) // Default 5 minutes
  const [includeStudySession, setIncludeStudySession] = useState(true) // Include study session by default
  
  // Notes functionality
  const [studyInstructions, setStudyInstructions] = useState('')
  const [generatedNotes, setGeneratedNotes] = useState<any>(null)
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const [activeTab, setActiveTab] = useState<'materials' | 'notes'>('materials')
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  const roomId = params.id as string

  // Anti-cheat functionality
  const handleCheatDetected = async (event: CheatEvent) => {
    if (!quizSession) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('🚨 [ROOM] Cheat detected but no active quiz session')
      }
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🚨 [ROOM] Reporting cheat event:', {
        sessionId: quizSession.id,
        violationType: event.type,
        duration: event.duration,
        timestamp: event.timestamp
      })
    }

    try {
      const response = await fetch('/api/cheat-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: quizSession.id,
          violation_type: event.type,
          duration_ms: event.duration
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ [ROOM] Failed to log cheat event:', response.status, errorText)
        }
      } else {
        const result = await response.json()
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [ROOM] Cheat event logged successfully:', result)
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [ROOM] Error logging cheat event:', error)
      }
    }
  }

  // Initialize anti-cheat hook
  const { isAway } = useAntiCheat({
    isGameActive: quizSession?.status === 'active',
    thresholdMs: 2500,
    onCheatDetected: handleCheatDetected
  })

  // Get current user ID and check if they're the host
  useEffect(() => {
    const checkUser = async () => {
      const userId = await getCurrentUserId()
      setCurrentUserId(userId)
      
      if (!userId) {
        console.log('❌ [ROOM] No user session found, redirecting to login')
        router.push('/login')
        return
      }
    }
    checkUser()
  }, [router])

  // Function to fetch room members (can be called from real-time updates)
  const fetchRoomMembers = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsRefreshingMembers(true)
      }
      
      console.log('🔄 [ROOM] Fetching room members...')
      const { data: membersData, error: membersError } = await supabase
        .from('room_members')
        .select(`
          user_id,
          joined_at,
          is_ready,
          users!inner(username, email)
        `)
        .eq('room_id', roomId)

      if (membersError) {
        console.error('❌ [ROOM] Error fetching members:', membersError)
      } else {
        console.log('✅ [ROOM] Members fetched:', membersData?.length || 0)
        // Transform the data to match the Member interface
        const transformedMembers = membersData?.map((member: any) => ({
          ...member,
          users: member.users?.[0] || { username: 'Unknown', email: '' }
        })) || []
        setMembers(transformedMembers)
      }
    } catch (err) {
      console.error('❌ [ROOM] Error in fetchRoomMembers:', err)
    } finally {
      if (showLoading) {
        setIsRefreshingMembers(false)
      }
    }
  }

  const fetchRoomData = async () => {
    try {
      // Fetch room details
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomError || !roomData) {
        setError('Room not found')
        return
      }

      setRoom(roomData)
      
      // Check if current user is the host
      const userIsHost = roomData.host_id === currentUserId
      setIsHost(userIsHost)
      console.log(`👑 [ROOM] User is host: ${userIsHost} (host_id: ${roomData.host_id}, current_user: ${currentUserId})`)

      // Fetch members
      await fetchRoomMembers()

      // Fetch active quiz session
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .single()

      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error('❌ [ROOM] Error fetching quiz session:', sessionError)
      } else if (sessionData) {
        setQuizSession(sessionData)
        console.log('🎯 [ROOM] Active quiz session found:', sessionData.id)
      } else {
        console.log('ℹ️ [ROOM] No active quiz session')
      }
    } catch (err) {
      console.error('❌ [ROOM] Error in fetchRoomData:', err)
      setError('An unexpected error occurred')
    }
  }

  useEffect(() => {
    if (!roomId || !currentUserId) return

    const loadRoomData = async () => {
      try {
        await fetchRoomData()
      } catch (err) {
        console.error('❌ [ROOM] Error loading room data:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadRoomData()
  }, [roomId, currentUserId, supabase])

  // Set up realtime subscription for room members
  useEffect(() => {
    if (!roomId) return

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    console.log('🔄 [ROOM] Setting up real-time subscription for room:', roomId)

    // Create new channel for room updates
    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_members',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        console.log('👥 [ROOM] New member joined:', payload.new)
        
        // Get the username for the notification
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', payload.new.user_id)
            .single()
          
          if (userData) {
            setMemberNotification({ type: 'join', username: userData.username })
            // Auto-hide notification after 3 seconds
            setTimeout(() => setMemberNotification(null), 3000)
          }
        } catch (error) {
          console.error('Error fetching username for notification:', error)
        }
        
        // Refresh both members list and room data to update current_players count
        fetchRoomMembers()
        fetchRoomData()
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'room_members',
        filter: `room_id=eq.${roomId}`
      }, async (payload) => {
        console.log('👋 [ROOM] Member left:', payload.old)
        
        // Get the username for the notification
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', payload.old.user_id)
            .single()
          
          if (userData) {
            setMemberNotification({ type: 'leave', username: userData.username })
            // Auto-hide notification after 3 seconds
            setTimeout(() => setMemberNotification(null), 3000)
          }
        } catch (error) {
          console.error('Error fetching username for notification:', error)
        }
        
        // Refresh both members list and room data to update current_players count
        fetchRoomMembers()
        fetchRoomData()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'room_members',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log('🔄 [ROOM] Member status updated:', payload.new)
        // Refresh members list for status changes (like ready state)
        fetchRoomMembers()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        console.log('🏠 [ROOM] Room updated:', payload.new)
        // Update room data
        setRoom(payload.new as Room)
      })
      .subscribe((status, err) => {
        console.log('📡 [ROOM] Room channel subscription status:', status)
        if (err) {
          console.error('❌ [ROOM] Room channel subscription error:', err)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [roomId, supabase])

  // Set up realtime subscription for cheat events
  useEffect(() => {
    if (!quizSession) return

    console.log('🔄 [ROOM] Setting up cheat events subscription for session:', quizSession.id)

    // Create separate channel for session events
    const sessionChannel = supabase.channel(`session:${quizSession.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `session_id=eq.${quizSession.id}`
      }, (payload) => {
        console.log('📢 [ROOM] Received session event:', payload.new)
        
        if (payload.new.type === 'cheat_detected') {
          try {
            // Parse the payload - it should be a JSON object with the cheat alert data
            let alertData: CheatAlertData
            if (typeof payload.new.payload === 'string') {
              // Check if it's valid JSON before parsing
              const payloadStr = payload.new.payload.trim()
              if (payloadStr.startsWith('{') || payloadStr.startsWith('[')) {
                try {
                  alertData = JSON.parse(payloadStr)
                } catch (jsonError) {
                  console.warn('⚠️ [ROOM] JSON parsing failed for payload:', payloadStr, jsonError)
                  return
                }
              } else {
                console.warn('⚠️ [ROOM] Non-JSON payload received (likely error message):', payloadStr)
                return
              }
            } else if (payload.new.payload && typeof payload.new.payload === 'object') {
              alertData = payload.new.payload
            } else {
              console.warn('⚠️ [ROOM] Invalid payload type:', typeof payload.new.payload, payload.new.payload)
              return
            }
              
            console.log('🚨 [ROOM] Cheat detected for user:', alertData.display_name, 'Duration:', alertData.duration_seconds)
            
            // Only show alerts for other users, not yourself
            if (alertData.user_id !== currentUserId) {
              setCheatAlerts(prev => [...prev, alertData])
            }
          } catch (error) {
            console.error('❌ [ROOM] Error parsing cheat event payload:', error, payload.new)
          }
        }
      })
      .subscribe((status, err) => {
        console.log('📡 [ROOM] Session channel subscription status:', status)
        if (err) {
          console.error('❌ [ROOM] Session channel subscription error:', err)
        }
      })

    return () => {
      console.log('🧹 [ROOM] Cleaning up session channel subscription')
      supabase.removeChannel(sessionChannel)
    }
  }, [quizSession, supabase, currentUserId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase])

  const copyRoomCode = async () => {
    if (room?.room_code) {
      await navigator.clipboard.writeText(room.room_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAlertDismiss = (index: number) => {
    setCheatAlerts(prev => prev.filter((_, i) => i !== index))
  }

  // File upload functions
  const validateFiles = (files: File[]): { validFiles: File[], errors: string[] } => {
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
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max 10MB)`)
        return
      }

      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`)
        return
      }

      if (uploadedFiles.some(existingFile => existingFile.name === file.name)) {
        errors.push(`${file.name}: File already uploaded`)
        return
      }

      validFiles.push(file)
    })

    return { validFiles, errors }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const processFiles = (files: File[]) => {
    setIsUploading(true)
    setUploadErrors([])

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
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
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

  // Generate study notes based on instructions and uploaded files
  const generateStudyNotes = async () => {
    if (!studyInstructions.trim() && uploadedFiles.length === 0) {
      alert('Please provide study instructions or upload study materials first.')
      return
    }

    setIsGeneratingNotes(true)
    try {
      const formData = new FormData()
      
      // Add uploaded files
      uploadedFiles.forEach(file => {
        formData.append('files', file)
      })
      
      // Add study instructions
      formData.append('instructions', studyInstructions)
      formData.append('topic', studyInstructions || 'General Study Topic')

      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setGeneratedNotes(result.notes)
        console.log('✅ [ROOM] Study notes generated successfully')
      } else {
        const error = await response.json()
        console.error('❌ [ROOM] Failed to generate notes:', error)
        alert('Failed to generate study notes. Please try again.')
      }
    } catch (error) {
      console.error('❌ [ROOM] Error generating notes:', error)
      alert('Error generating study notes. Please try again.')
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  // Quiz functionality
  const handleStartQuiz = async () => {
    if (!isHost || !room) return
    
    setIsStartingQuiz(true)
    console.log('🚀 [ROOM] Starting quiz with settings:', quizSettings)
    
    try {
      // Create quiz session
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          room_id: room.id,
          session_name: `${room.name} Quiz`,
          total_questions: quizSettings.totalQuestions,
          current_question: 0,
          time_limit: quizSettings.timeLimit,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (sessionError) {
        console.error('❌ [ROOM] Error creating quiz session:', sessionError)
        alert('Failed to start quiz. Please try again.')
        return
      }

      console.log('✅ [ROOM] Quiz session created:', sessionData.id)
      
      // Set the quiz session state
      setQuizSession(sessionData)

      // Update room status
      const { error: roomError } = await supabase
        .from('game_rooms')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', room.id)

      if (roomError) {
        console.error('❌ [ROOM] Error updating room status:', roomError)
      }

      // Initialize player progress
      const initialProgress: {[key: string]: {currentQuestion: number, score: number, isActive: boolean}} = {}
      members.forEach(member => {
        initialProgress[member.user_id] = {
          currentQuestion: 0,
          score: 0,
          isActive: true
        }
      })
      setPlayerProgress(initialProgress)

      // Generate quiz questions
      try {
        const questionsResponse = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: room.subject || 'General Knowledge',
            difficulty: quizSettings.difficulty,
            totalQuestions: quizSettings.totalQuestions,
            sessionId: sessionData.id
          })
        })

        if (questionsResponse.ok) {
          const questionsResult = await questionsResponse.json()
          console.log('✅ [ROOM] Quiz questions generated successfully')
          
          // Redirect all players to the battle page
          router.push(`/room/${room.id}/battle`)
        } else {
          console.error('❌ [ROOM] Failed to generate quiz questions')
          alert('Failed to generate quiz questions. Please try again.')
        }
      } catch (error) {
        console.error('❌ [ROOM] Error generating quiz questions:', error)
        alert('Failed to generate quiz questions. Please try again.')
      }
      
    } catch (error) {
      console.error('❌ [ROOM] Error starting quiz:', error)
      alert('Failed to start quiz. Please try again.')
    } finally {
      setIsStartingQuiz(false)
    }
  }

  // 🚀 OPTIMIZATION: Memoize callback to prevent re-renders
  const updateQuizSettings = useCallback((field: string, value: any) => {
    setQuizSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // Study session functionality
  const startStudySession = async () => {
    if (!isHost || !room || uploadedFiles.length === 0) return
    
    setIsStartingStudySession(true)
    console.log('📚 [ROOM] Starting study session...')
    
    // If study session is not included, skip directly to quiz
    if (!includeStudySession) {
      console.log('📚 [ROOM] Skipping study session, starting quiz directly...')
      setIsStartingStudySession(false)
      // TODO: Implement direct quiz start
      return
    }
    
    try {
      // Generate study materials from uploaded files
      const formData = new FormData()
      uploadedFiles.forEach(file => {
        formData.append('files', file)
      })
      formData.append('topic', room.subject || 'Study Session')
      formData.append('difficulty', quizSettings.difficulty)
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Generate additional resources
        const resources = await generateStudyResources(room.subject || 'Study Session', result.notes)
        
        setStudySession({
          isActive: true,
          timeRemaining: studySessionDuration * 60, // Convert minutes to seconds
          studyMaterials: result.notes,
          resources: resources
        })
        
        // Start countdown timer
        startStudyTimer()
        
        console.log('✅ [ROOM] Study session started with materials and resources')
        setIsStartingStudySession(false)
      } else {
        console.error('❌ [ROOM] Failed to generate study materials:', result.error)
        alert('Failed to generate study materials. Please try again.')
        setIsStartingStudySession(false)
      }
    } catch (error) {
      console.error('❌ [ROOM] Error starting study session:', error)
      alert('Failed to start study session. Please try again.')
      setIsStartingStudySession(false)
    }
  }

  const generateStudyResources = async (topic: string, notes: any) => {
    // Generate additional study resources (links, videos, etc.)
    const resources = {
      notes: notes.outline || [],
      links: [
        { title: `${topic} - Wikipedia`, url: `https://en.wikipedia.org/wiki/${topic.replace(/\s+/g, '_')}` },
        { title: `${topic} - Khan Academy`, url: `https://www.khanacademy.org/search?referer=%2F&page_search_query=${encodeURIComponent(topic)}` },
        { title: `${topic} - Coursera`, url: `https://www.coursera.org/search?query=${encodeURIComponent(topic)}` }
      ],
      videos: [
        { title: `${topic} - Crash Course`, url: `https://www.youtube.com/results?search_query=crash+course+${encodeURIComponent(topic)}` },
        { title: `${topic} - Educational Video`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}+explained` }
      ]
    }
    
    return resources
  }

  const startStudyTimer = () => {
    const timer = setInterval(() => {
      setStudySession(prev => {
        if (prev.timeRemaining <= 1) {
          clearInterval(timer)
          return { ...prev, isActive: false, timeRemaining: 0 }
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 }
      })
    }, 1000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Study session time editing functions
  const handleEditTime = () => {
    setEditingTime(studySessionDuration)
    setIsEditingTime(true)
  }

  const handleSaveTime = () => {
    if (editingTime >= 1 && editingTime <= 60) { // Allow 1-60 minutes
      setStudySessionDuration(editingTime)
      setIsEditingTime(false)
      
      // If study session is active, update the remaining time
      if (studySession.isActive) {
        setStudySession(prev => ({
          ...prev,
          timeRemaining: editingTime * 60
        }))
      }
    } else {
      alert('Please enter a time between 1 and 60 minutes')
    }
  }

  const handleCancelEditTime = () => {
    setEditingTime(studySessionDuration)
    setIsEditingTime(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cheat Alert Container */}
      <CheatAlertContainer 
        alerts={cheatAlerts}
        onAlertDismiss={handleAlertDismiss}
      />
      
      {/* Member Notification */}
      {memberNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg font-bold flex items-center gap-2 ${
            memberNotification.type === 'join' 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 text-white'
          }`}>
            {memberNotification.type === 'join' ? (
              <>
                <Users className="h-4 w-4" strokeWidth={3} />
                {memberNotification.username} joined the room!
              </>
            ) : (
              <>
                <Users className="h-4 w-4" strokeWidth={3} />
                {memberNotification.username} left the room
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/" className="text-primary hover:text-primary/80 mr-4 cartoon-hover">
              <ArrowLeft className="h-6 w-6" strokeWidth={3} />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  {room.name}
                </h1>
                {isHost && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-chart-3 text-foreground rounded-full cartoon-border">
                    <Crown className="h-4 w-4" strokeWidth={3} />
                    <span className="text-xs font-black">HOST</span>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground font-bold">Room Code: <span className="font-black text-primary">{room.room_code}</span></p>
            </div>
          </div>
          <button
            onClick={copyRoomCode}
            className="flex items-center px-4 py-3 bg-card rounded-xl cartoon-border cartoon-shadow cartoon-hover font-bold"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-chart-3 mr-2" strokeWidth={3} />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-primary mr-2" strokeWidth={3} />
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Quiz Progress Bar - Show when quiz is active */}
        {quizSession?.status === 'active' && (
          <QuizProgressBar
            currentQuestion={currentUserProgress.currentQuestion}
            totalQuestions={room.total_questions}
            score={currentUserProgress.score}
            timeLeft={currentUserProgress.timeLeft}
            topic={room.subject || 'General Knowledge'}
            isAway={isAway}
            streak={currentUserProgress.streak}
          />
        )}

        {/* Player Progress Indicators */}
        {room.status === 'active' && members.length > 0 && (
          <div className="mb-8">
            <div className="bg-card rounded-2xl cartoon-border cartoon-shadow p-6">
              <h3 className="text-2xl font-black text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <Users className="h-6 w-6 text-primary" strokeWidth={3} />
                Live Progress
              </h3>
              <div className="flex flex-wrap gap-4">
                {members.map((member) => {
                  const progress = playerProgress[member.user_id] || { currentQuestion: 0, score: 0, isActive: false }
                  const isMemberHost = member.user_id === room.host_id
                  const progressPercent = room.total_questions > 0 ? (progress.currentQuestion / room.total_questions) * 100 : 0
                  
                  return (
                    <div key={member.user_id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl cartoon-border min-w-[220px] cartoon-hover">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center cartoon-border ${
                        isMemberHost ? 'bg-chart-3 text-foreground' : 'bg-primary text-primary-foreground'
                      }`}>
                        {isMemberHost ? (
                          <Crown className="h-6 w-6" strokeWidth={3} />
                        ) : (
                          <span className="font-black text-lg">
                            {member.users.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-black text-foreground text-sm truncate">{member.users.username}</p>
                          {isMemberHost && (
                            <span className="text-xs font-black text-foreground bg-chart-3 px-2 py-1 rounded-full cartoon-border">
                              HOST
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-muted-foreground">
                            <span>Q: {progress.currentQuestion}/{room.total_questions}</span>
                            <span>Score: {progress.score}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 cartoon-border">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full cartoon-border ${
                        progress.isActive ? 'bg-chart-3 animate-pulse' : 'bg-muted-foreground'
                      }`} title={progress.isActive ? 'Active' : 'Inactive'}></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Study Session */}
        {studySession.isActive && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-chart-3/10 to-primary/10 rounded-2xl cartoon-border cartoon-shadow p-6 border-2 border-chart-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-chart-3 rounded-full flex items-center justify-center cartoon-border cartoon-shadow">
                    <Brain className="h-7 w-7 text-foreground" strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                      Study Session Active
                    </h3>
                    <p className="text-sm text-muted-foreground font-bold">Use this time to review materials and prepare for the quiz</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-chart-3">{formatTime(studySession.timeRemaining)}</div>
                  <div className="text-sm text-muted-foreground font-bold">Time Remaining</div>
                  {isHost && (
                    <button
                      onClick={handleEditTime}
                      className="mt-2 text-xs text-primary hover:text-primary/80 font-bold transition-colors"
                    >
                      Edit Time
                    </button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Study Notes */}
                <div className="bg-card rounded-xl p-4 cartoon-border cartoon-shadow">
                  <h4 className="font-black text-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-secondary" strokeWidth={3} />
                    Study Notes
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {studySession.resources.notes.map((note, index) => (
                      <div key={index} className="text-sm text-foreground bg-secondary/30 p-3 rounded-lg cartoon-border font-bold">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Study Links */}
                <div className="bg-card rounded-xl p-4 cartoon-border cartoon-shadow">
                  <h4 className="font-black text-foreground mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-accent" strokeWidth={3} />
                    Study Links
                  </h4>
                  <div className="space-y-2">
                    {studySession.resources.links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary hover:text-primary/80 bg-primary/10 p-3 rounded-lg cartoon-border cartoon-hover font-bold transition-all"
                      >
                        {link.title}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Video Resources */}
                <div className="bg-card rounded-xl p-4 cartoon-border cartoon-shadow">
                  <h4 className="font-black text-foreground mb-3 flex items-center gap-2">
                    <Upload className="h-5 w-5 text-chart-3" strokeWidth={3} />
                    Video Resources
                  </h4>
                  <div className="space-y-2">
                    {studySession.resources.videos.map((video, index) => (
                      <a
                        key={index}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-chart-3 hover:text-chart-3/80 bg-chart-3/10 p-3 rounded-lg cartoon-border cartoon-hover font-bold transition-all"
                      >
                        {video.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {isHost && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setStudySession(prev => ({ ...prev, isActive: false }))}
                    className="bg-chart-3 text-foreground px-6 py-3 rounded-xl cartoon-border cartoon-shadow cartoon-hover font-black text-lg"
                  >
                    End Study Session & Start Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Time Editing Modal */}
        {isEditingTime && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl p-6 cartoon-border cartoon-shadow max-w-md w-full mx-4">
              <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" strokeWidth={3} />
                Edit Study Session Time
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="editTime" className="text-sm font-bold text-foreground mb-2 block">
                    New Duration (minutes):
                  </label>
                  <input
                    id="editTime"
                    type="number"
                    min="1"
                    value={editingTime}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1
                      setEditingTime(Math.max(1, value))
                    }}
                    className="w-full px-4 py-3 text-center font-bold rounded-lg cartoon-border bg-card text-foreground"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveTime}
                    className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg font-black cartoon-border cartoon-shadow cartoon-hover"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditTime}
                    className="flex-1 bg-muted text-muted-foreground py-2 px-4 rounded-lg font-black cartoon-border cartoon-shadow cartoon-hover"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Members */}
            <div className="bg-card rounded-2xl cartoon-border cartoon-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-primary mr-2" strokeWidth={3} />
                  <h2 className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    Members ({members.length})
                  </h2>
                </div>
                <button
                  onClick={() => fetchRoomMembers(true)}
                  disabled={isRefreshingMembers}
                  className="p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl cartoon-border cartoon-hover transition-all disabled:opacity-50"
                  title="Refresh members list"
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshingMembers ? 'animate-spin' : ''}`} strokeWidth={3} />
                </button>
              </div>
              <div className="space-y-4">
                {members.map((member) => {
                  const isMemberHost = member.user_id === room.host_id
                  return (
                    <div key={member.user_id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl cartoon-border cartoon-hover">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center cartoon-border ${
                          isMemberHost ? 'bg-chart-3 text-foreground' : 'bg-primary text-primary-foreground'
                        }`}>
                          {isMemberHost ? (
                            <Crown className="h-6 w-6" strokeWidth={3} />
                          ) : (
                            <span className="font-black text-lg">
                              {member.users.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-black text-foreground text-lg">{member.users.username}</p>
                            {isMemberHost && (
                              <span className="text-xs font-black text-foreground bg-chart-3 px-3 py-1 rounded-full cartoon-border">
                                HOST
                              </span>
                            )}
                            <div className={`w-3 h-3 rounded-full cartoon-border ${
                              member.is_ready ? 'bg-chart-3 animate-pulse' : 'bg-muted-foreground'
                            }`} title={member.is_ready ? 'Ready' : 'Not Ready'}></div>
                          </div>
                          <p className="text-sm text-muted-foreground font-bold">
                            {member.is_ready ? 'Ready' : 'Not Ready'} • Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Study Materials & Notes Section */}
            <div className="bg-card rounded-2xl cartoon-border cartoon-shadow p-6">
              {/* Tab Navigation */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Upload className="h-6 w-6 text-primary mr-2" strokeWidth={3} />
                  <h2 className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    Study Materials
                  </h2>
                  {!isHost && (
                    <Lock className="h-5 w-5 text-muted-foreground ml-2" strokeWidth={3} />
                  )}
                </div>
                
                {/* Tab Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('materials')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cartoon-border ${
                      activeTab === 'materials'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <Upload className="h-4 w-4 mr-2 inline" strokeWidth={3} />
                    Materials
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all cartoon-border ${
                      activeTab === 'notes'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mr-2 inline" strokeWidth={3} />
                    Notes
                  </button>
                </div>
              </div>
              
              {/* Materials Tab */}
              {activeTab === 'materials' && (
                isHost ? (
                  <div className="space-y-4">
                    {/* Success message */}
                  {showUploadSuccess && (
                    <div className="p-4 rounded-xl bg-chart-3/10 border-2 border-chart-3 text-center cartoon-border">
                      <p className="text-chart-3 font-black text-sm">✅ Files uploaded successfully!</p>
                    </div>
                  )}

                  {/* Error messages */}
                  {uploadErrors.length > 0 && (
                    <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive cartoon-border">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-destructive" strokeWidth={3} />
                        <p className="text-destructive font-black text-sm">Upload Errors:</p>
                      </div>
                      <ul className="space-y-1">
                        {uploadErrors.map((error, index) => (
                          <li key={index} className="text-destructive text-xs font-bold">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Upload progress */}
                  {isUploading && (
                    <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary text-center cartoon-border">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" strokeWidth={3} />
                        <p className="text-primary font-black text-sm">Processing files...</p>
                      </div>
                    </div>
                  )}

                  {/* File input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.pptx,.ppt"
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                  />

                  {/* Upload area */}
                  <div 
                    onClick={triggerFileInput}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-3 font-medium">Upload PDFs, documents, or study materials</p>
                    <button 
                      type="button"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Choose Files
                    </button>
                    <p className="text-xs text-gray-500 mt-2">Max 10MB per file • PDF, DOC, TXT, PPT supported</p>
                  </div>

                  {/* Uploaded files */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 text-sm">Uploaded Files ({uploadedFiles.length})</h4>
                        <button
                          onClick={() => setUploadedFiles([])}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-lg">{getFileIcon(file)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center bg-secondary/30 cartoon-border">
                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" strokeWidth={3} />
                    <p className="text-muted-foreground mb-2 font-bold">Study materials upload</p>
                    <p className="text-sm text-muted-foreground">Only the host can upload study materials</p>
                  </div>
                )
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  {/* Study Instructions Card */}
                  <div className="bg-secondary/30 rounded-xl p-6 cartoon-border">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="h-5 w-5 text-primary" strokeWidth={3} />
                      <h3 className="text-lg font-black text-foreground">Study Instructions</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 font-bold">
                      Tell the AI what you want to study and be quizzed on. Be specific about topics, difficulty, and focus areas.
                    </p>
                    <textarea
                      value={studyInstructions}
                      onChange={(e) => setStudyInstructions(e.target.value)}
                      placeholder="Example: Study Chapter 6 on Photosynthesis, focus on the light-dependent reactions, Calvin cycle, and factors affecting photosynthesis. Create questions about the process, equations, and environmental factors."
                      className="w-full p-4 rounded-xl cartoon-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                      rows={4}
                      disabled={!isHost}
                    />
                    {!isHost && (
                      <p className="text-xs text-muted-foreground mt-2 font-bold">Only the host can set study instructions</p>
                    )}
                  </div>

                  {/* Generate Notes Button */}
                  {isHost && (
                    <div className="flex justify-center">
                      <button
                        onClick={generateStudyNotes}
                        disabled={isGeneratingNotes || (!studyInstructions.trim() && uploadedFiles.length === 0)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg px-8 py-3 rounded-xl cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingNotes ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin inline" strokeWidth={3} />
                            Generating Notes...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="w-5 h-5 mr-2 inline" strokeWidth={3} />
                            Generate Study Notes
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Generated Notes Display */}
                  {generatedNotes && (
                    <div className="bg-card rounded-xl p-6 cartoon-border cartoon-shadow">
                      <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="h-5 w-5 text-chart-3" strokeWidth={3} />
                        <h3 className="text-lg font-black text-foreground">Generated Study Notes</h3>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Title and Complexity Analysis */}
                        <div>
                          <h4 className="text-xl font-black text-foreground mb-2">{generatedNotes.title}</h4>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-bold cartoon-border">
                              {generatedNotes.subject}
                            </span>
                            <span className="px-3 py-1 bg-secondary/20 text-secondary rounded-full text-sm font-bold cartoon-border">
                              {generatedNotes.education_level?.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold cartoon-border ${
                              generatedNotes.difficulty_level === 'beginner' ? 'bg-chart-3/20 text-chart-3' :
                              generatedNotes.difficulty_level === 'intermediate' ? 'bg-primary/20 text-primary' :
                              'bg-destructive/20 text-destructive'
                            }`}>
                              {generatedNotes.difficulty_level?.toUpperCase()}
                            </span>
                          </div>
                          
                          {/* Complexity Analysis */}
                          {generatedNotes.complexity_analysis && (
                            <div className="p-4 bg-muted/30 rounded-xl cartoon-border mb-4">
                              <h5 className="font-black text-foreground mb-3">📊 Content Analysis</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground font-bold">Vocabulary:</span>
                                  <p className="font-black text-foreground">{generatedNotes.complexity_analysis.vocabulary_level}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground font-bold">Concepts:</span>
                                  <p className="font-black text-foreground">{generatedNotes.complexity_analysis.concept_sophistication}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground font-bold">Reasoning:</span>
                                  <p className="font-black text-foreground">{generatedNotes.complexity_analysis.reasoning_level}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground font-bold">Prerequisites:</span>
                                  <p className="font-black text-foreground">{generatedNotes.complexity_analysis.prerequisite_knowledge?.length || 0} topics</p>
                                </div>
                              </div>
                              {generatedNotes.complexity_analysis.prerequisite_knowledge && generatedNotes.complexity_analysis.prerequisite_knowledge.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-muted-foreground font-bold text-sm">Prerequisite Knowledge:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {generatedNotes.complexity_analysis.prerequisite_knowledge.map((prereq: string, index: number) => (
                                      <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                                        {prereq}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Outline */}
                        {generatedNotes.outline && generatedNotes.outline.length > 0 && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">📋 Outline</h5>
                            <ul className="space-y-1">
                              {generatedNotes.outline.map((item: string, index: number) => (
                                <li key={index} className="text-sm text-muted-foreground font-bold flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Terms */}
                        {generatedNotes.key_terms && generatedNotes.key_terms.length > 0 && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">🔑 Key Terms</h5>
                            <div className="space-y-3">
                              {generatedNotes.key_terms.map((term: any, index: number) => (
                                <div key={index} className="p-3 bg-secondary/30 rounded-xl cartoon-border">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-black text-foreground">{term.term}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      term.importance === 'high' ? 'bg-chart-3/20 text-chart-3' :
                                      term.importance === 'medium' ? 'bg-primary/20 text-primary' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {term.importance}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground font-bold">{term.definition}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Concepts */}
                        {generatedNotes.concepts && generatedNotes.concepts.length > 0 && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">💡 Key Concepts</h5>
                            <div className="space-y-4">
                              {generatedNotes.concepts.map((concept: any, index: number) => (
                                <div key={index} className="p-4 bg-secondary/30 rounded-xl cartoon-border">
                                  <h6 className="font-black text-foreground mb-2">{concept.heading}</h6>
                                  <ul className="space-y-1 mb-3">
                                    {concept.bullets.map((bullet: string, bulletIndex: number) => (
                                      <li key={bulletIndex} className="text-sm text-muted-foreground font-bold flex items-start gap-2">
                                        <span className="text-chart-3">•</span>
                                        {bullet}
                                      </li>
                                    ))}
                                  </ul>
                                  
                                  {concept.examples && concept.examples.length > 0 && (
                                    <div className="mb-3">
                                      <h6 className="font-bold text-foreground text-sm mb-1">Examples:</h6>
                                      <ul className="space-y-1">
                                        {concept.examples.map((example: string, exampleIndex: number) => (
                                          <li key={exampleIndex} className="text-sm text-primary font-bold flex items-start gap-2">
                                            <span className="text-primary">→</span>
                                            {example}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {concept.connections && concept.connections.length > 0 && (
                                    <div>
                                      <h6 className="font-bold text-foreground text-sm mb-1">Connections:</h6>
                                      <ul className="space-y-1">
                                        {concept.connections.map((connection: string, connectionIndex: number) => (
                                          <li key={connectionIndex} className="text-sm text-chart-3 font-bold flex items-start gap-2">
                                            <span className="text-chart-3">↔</span>
                                            {connection}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Diagrams */}
                        {generatedNotes.diagrams && generatedNotes.diagrams.length > 0 && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">📊 Diagrams & Visuals</h5>
                            <div className="space-y-3">
                              {generatedNotes.diagrams.map((diagram: any, index: number) => (
                                <div key={index} className="p-4 bg-chart-3/10 rounded-xl cartoon-border">
                                  <h6 className="font-black text-chart-3 mb-2">{diagram.title}</h6>
                                  <p className="text-sm text-muted-foreground font-bold">{diagram.caption}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Practice Questions */}
                        {generatedNotes.practice_questions && generatedNotes.practice_questions.length > 0 && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">❓ Practice Questions</h5>
                            <div className="space-y-3">
                              {generatedNotes.practice_questions.slice(0, 5).map((qa: any, index: number) => (
                                <div key={index} className="p-4 bg-primary/10 rounded-xl cartoon-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-bold text-foreground">Q: {qa.question}</p>
                                    <div className="flex gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        qa.difficulty === 'easy' ? 'bg-chart-3/20 text-chart-3' :
                                        qa.difficulty === 'medium' ? 'bg-primary/20 text-primary' :
                                        'bg-destructive/20 text-destructive'
                                      }`}>
                                        {qa.difficulty}
                                      </span>
                                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                                        {qa.type.replace('_', ' ')}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground font-bold mb-2">A: {qa.answer}</p>
                                  <p className="text-xs text-muted-foreground font-bold">Topic: {qa.topic}</p>
                                </div>
                              ))}
                              {generatedNotes.practice_questions.length > 5 && (
                                <p className="text-sm text-muted-foreground font-bold text-center">
                                  ... and {generatedNotes.practice_questions.length - 5} more questions
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Resources */}
                        {generatedNotes.resources && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">📚 Study Resources</h5>
                            
                            {/* Links */}
                            {generatedNotes.resources.links && generatedNotes.resources.links.length > 0 && (
                              <div className="mb-4">
                                <h6 className="font-bold text-foreground mb-2">Articles & References</h6>
                                <div className="space-y-2">
                                  {generatedNotes.resources.links.map((link: any, index: number) => (
                                    <a
                                      key={index}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block p-3 bg-secondary/30 rounded-xl cartoon-border cartoon-hover transition-all"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-foreground">{link.title}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                          link.relevance === 'high' ? 'bg-chart-3/20 text-chart-3' :
                                          link.relevance === 'medium' ? 'bg-primary/20 text-primary' :
                                          'bg-muted text-muted-foreground'
                                        }`}>
                                          {link.relevance}
                                        </span>
                                      </div>
                                      <p className="text-sm text-muted-foreground font-bold">{link.description}</p>
                                      <p className="text-xs text-primary font-bold">{link.type}</p>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Videos */}
                            {generatedNotes.resources.videos && generatedNotes.resources.videos.length > 0 && (
                              <div className="mb-4">
                                <h6 className="font-bold text-foreground mb-2">Educational Videos</h6>
                                <div className="space-y-2">
                                  {generatedNotes.resources.videos.map((video: any, index: number) => (
                                    <a
                                      key={index}
                                      href={video.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block p-3 bg-chart-3/10 rounded-xl cartoon-border cartoon-hover transition-all"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-foreground">{video.title}</span>
                                        <span className="text-xs text-muted-foreground font-bold">{video.duration}</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground font-bold">{video.description}</p>
                                      <p className="text-xs text-chart-3 font-bold">{video.platform}</p>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Simulations */}
                            {generatedNotes.resources.simulations && generatedNotes.resources.simulations.length > 0 && (
                              <div>
                                <h6 className="font-bold text-foreground mb-2">Interactive Tools</h6>
                                <div className="space-y-2">
                                  {generatedNotes.resources.simulations.map((sim: any, index: number) => (
                                    <a
                                      key={index}
                                      href={sim.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block p-3 bg-primary/10 rounded-xl cartoon-border cartoon-hover transition-all"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-foreground">{sim.title}</span>
                                        <span className="text-xs text-primary font-bold">{sim.type}</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground font-bold">{sim.description}</p>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Study Tips */}
                        {generatedNotes.study_tips && generatedNotes.study_tips.length > 0 && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">💡 Study Tips</h5>
                            <div className="space-y-2">
                              {generatedNotes.study_tips.map((tip: string, index: number) => (
                                <div key={index} className="p-3 bg-chart-3/10 rounded-xl cartoon-border">
                                  <p className="text-sm text-foreground font-bold flex items-start gap-2">
                                    <span className="text-chart-3">💡</span>
                                    {tip}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Common Misconceptions */}
                        {generatedNotes.common_misconceptions && generatedNotes.common_misconceptions.length > 0 && (
                          <div>
                            <h5 className="font-black text-foreground mb-3">⚠️ Common Misconceptions</h5>
                            <div className="space-y-3">
                              {generatedNotes.common_misconceptions.map((misconception: any, index: number) => (
                                <div key={index} className="p-4 bg-destructive/10 rounded-xl cartoon-border">
                                  <div className="mb-2">
                                    <p className="font-bold text-destructive text-sm mb-1">❌ Misconception:</p>
                                    <p className="text-sm text-foreground font-bold">{misconception.misconception}</p>
                                  </div>
                                  <div className="mb-2">
                                    <p className="font-bold text-chart-3 text-sm mb-1">✅ Correction:</p>
                                    <p className="text-sm text-foreground font-bold">{misconception.correction}</p>
                                  </div>
                                  <div>
                                    <p className="font-bold text-muted-foreground text-sm mb-1">Why this is common:</p>
                                    <p className="text-sm text-muted-foreground font-bold">{misconception.why_common}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No Notes Generated Yet */}
                  {!generatedNotes && (
                    <div className="text-center py-12">
                      <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
                      <h3 className="text-lg font-black text-foreground mb-2">No Study Notes Yet</h3>
                      <p className="text-muted-foreground font-bold">
                        {isHost 
                          ? "Provide study instructions and click 'Generate Study Notes' to create AI-powered study materials."
                          : "The host will generate study notes based on the uploaded materials and instructions."
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Settings */}
            <div className="bg-card rounded-2xl cartoon-border cartoon-shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Settings className="h-6 w-6 text-primary mr-2" strokeWidth={3} />
                  <h3 className="text-xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    Room Settings
                  </h3>
                  {!isHost && (
                    <Lock className="h-5 w-5 text-muted-foreground ml-2" strokeWidth={3} />
                  )}
                </div>
                {quizSession?.status === 'active' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-2 border-destructive rounded-full cartoon-border">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                    <span className="text-xs font-black text-destructive">Anti-Cheat Active</span>
                    {isAway && (
                      <span className="text-xs font-black text-destructive">(You are away)</span>
                    )}
                  </div>
                )}
              </div>
              
              {isHost ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Quiz Difficulty
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-2 border-border rounded-xl cartoon-border bg-background text-foreground font-bold focus:border-primary focus:outline-none"
                      value={quizSettings.difficulty}
                      onChange={(e) => updateQuizSettings('difficulty', e.target.value)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Number of Questions
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={quizSettings.totalQuestions}
                      onChange={(e) => updateQuizSettings('totalQuestions', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-border rounded-xl cartoon-border bg-background text-foreground font-bold focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Time per Question (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={quizSettings.timeLimit}
                      onChange={(e) => updateQuizSettings('timeLimit', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-border rounded-xl cartoon-border bg-background text-foreground font-bold focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-4">
                    {/* Study Session Time Configuration */}
                    {isHost && (
                      <div className="bg-card rounded-xl p-6 cartoon-border cartoon-shadow mb-6">
                        <h4 className="font-black text-foreground mb-4 flex items-center gap-2">
                          <Clock className="h-6 w-6 text-primary" strokeWidth={3} />
                          Study Session Configuration
                        </h4>
                        
                        {/* Include Study Session Checkbox */}
                        <div className="flex items-center gap-3 mb-4">
                          <input
                            id="includeStudySession"
                            type="checkbox"
                            checked={includeStudySession}
                            onChange={(e) => setIncludeStudySession(e.target.checked)}
                            className="w-5 h-5 text-primary bg-card border-2 border-primary rounded focus:ring-primary focus:ring-2"
                            disabled={studySession.isActive}
                          />
                          <label htmlFor="includeStudySession" className="text-base font-bold text-foreground cursor-pointer">
                            Include Study Session
                          </label>
                        </div>

                        {/* Duration Input - Only show if study session is included */}
                        {includeStudySession && (
                          <div className="flex items-center gap-4">
                            <label htmlFor="studyTime" className="text-base font-bold text-foreground">
                              Duration (minutes):
                            </label>
                            <input
                              id="studyTime"
                              type="number"
                              min="1"
                              value={studySessionDuration}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1
                                setStudySessionDuration(Math.max(1, value))
                              }}
                              className="w-24 px-4 py-2 text-center font-bold rounded-lg cartoon-border bg-card text-foreground text-lg"
                              disabled={studySession.isActive}
                            />
                            <span className="text-sm text-muted-foreground font-bold">
                              {studySession.isActive ? '(Cannot change during active session)' : '(No maximum limit)'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button 
                      onClick={startStudySession}
                      loading={isStartingStudySession}
                      loadingText={includeStudySession ? `Starting Study Session...` : 'Starting Quiz...'}
                      disabled={uploadedFiles.length === 0 || studySession.isActive}
                      className="w-full bg-chart-3 text-foreground py-3 px-4 rounded-xl cartoon-border cartoon-shadow cartoon-hover font-black text-lg disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <Brain className="h-5 w-5" strokeWidth={3} />
                      {includeStudySession 
                        ? `Start Study Session (${studySessionDuration} min)` 
                        : 'Start Quiz Directly'
                      }
                    </Button>
                    
                    <Button 
                      onClick={handleStartQuiz}
                      loading={isStartingQuiz}
                      loadingText="Starting Quiz..."
                      disabled={uploadedFiles.length === 0}
                      className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-xl cartoon-border cartoon-shadow cartoon-hover font-black text-lg disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <Zap className="h-5 w-5" strokeWidth={3} />
                      Start Quiz Directly
                    </Button>
                  </div>
                  
                  {uploadedFiles.length === 0 && (
                    <p className="text-sm text-destructive text-center font-bold">
                      Please upload study materials before starting
                    </p>
                  )}
                  
                  {studySession.isActive && (
                    <p className="text-sm text-chart-3 text-center font-bold">
                      Study session is active! Use the time to review materials.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-secondary/30 rounded-xl cartoon-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={3} />
                      <span className="text-sm font-bold text-muted-foreground">Host Only</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-bold">
                      Only the room host can change quiz settings and start the game.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">
                        Quiz Difficulty
                      </label>
                      <div className="px-4 py-3 bg-muted rounded-xl cartoon-border text-foreground font-bold capitalize">
                        {room.difficulty}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">
                        Number of Questions
                      </label>
                      <div className="px-4 py-3 bg-muted rounded-xl cartoon-border text-foreground font-bold">
                        {room.total_questions}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">
                        Time per Question
                      </label>
                      <div className="px-4 py-3 bg-muted rounded-xl cartoon-border text-foreground font-bold">
                        {room.time_limit} seconds
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-primary/10 rounded-xl cartoon-border">
                    <p className="text-sm text-primary font-black">
                      Waiting for host to start the quiz...
                    </p>
                  </div>
                  
                  {/* Active Quiz Session */}
                  {quizSession?.status === 'active' && (
                    <div className="p-4 bg-chart-3/10 border-2 border-chart-3 rounded-xl cartoon-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-5 w-5 text-chart-3" strokeWidth={3} />
                        <span className="font-black text-chart-3">Quiz Active!</span>
                      </div>
                      <p className="text-sm text-chart-3 font-bold mb-4">
                        The quiz has started! Join the battle to compete with other players.
                      </p>
                      <Button
                        className="w-full bg-chart-3 hover:bg-chart-3/90 text-foreground font-black cartoon-border cartoon-shadow cartoon-hover"
                        loading={loadingButton === 'battle'}
                        loadingText="Joining Battle..."
                        onClick={() => {
                          setLoadingButton('battle')
                          router.push(`/room/${roomId}/battle`)
                          setTimeout(() => setLoadingButton(null), 1000)
                        }}
                      >
                        <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
                        Join Battle
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900">Invite Friends</p>
                  <p className="text-sm text-gray-500">Share the room code</p>
                </button>
                <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900">View Progress</p>
                  <p className="text-sm text-gray-500">See everyone's stats</p>
                </button>
                <button className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900">Room History</p>
                  <p className="text-sm text-gray-500">Previous sessions</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
