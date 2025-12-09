'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { requireAuthOrRedirect } from '@/lib/utils/require-auth-redirect'
import { Brain, Users, Upload, Settings, ArrowLeft, Copy, Check, Crown, Lock, RefreshCw, FileText, X, AlertCircle, Loader2, Zap, BookOpen, Lightbulb, MessageSquare, Clock } from 'lucide-react'
import Link from 'next/link'
import { useAntiCheat, CheatEvent } from '@/hooks/use-anti-cheat'
import { CheatAlertContainer, CheatAlertData } from '@/components/multiplayer/cheat-alert'
import { QuizProgressBar } from '@/components/ui/quiz-progress-bar'
import { Button } from '@/components/ui/button'
import { BrainBattleLoading } from '@/components/ui/brain-battle-loading'
import { StudyNotesViewer } from '@/components/study-notes/study-notes-viewer'

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
  study_notes?: any // AI-generated study notes for the room
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
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params?.id as string
  const isAdminMode = searchParams?.get('admin') === 'true'
  
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
  const [memberNotification, setMemberNotification] = useState<{ type: 'join' | 'leave' | 'info', username: string, message?: string } | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [showUploadSuccess, setShowUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [quizSettings, setQuizSettings] = useState({
    difficulty: 'medium',
    totalQuestions: 10,
    timeLimit: 30,
    contentFocus: 'both' as 'application' | 'concept' | 'both',
    includeDiagrams: true,
    educationLevel: 'university' as 'elementary' | 'high_school' | 'university' | 'graduate'
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
  
  // Notes functionality
  const [studyInstructions, setStudyInstructions] = useState('')
  const [studyContext, setStudyContext] = useState<any>(null) // For parity with singleplayer
  const [generatedNotes, setGeneratedNotes] = useState<any>(null)
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const [activeTab, setActiveTab] = useState<'quiz-settings' | 'study-session'>('quiz-settings')
  const supabase = createClient()
  const channelRef = useRef<any>(null)
  const studyTimerRef = useRef<NodeJS.Timeout | null>(null)

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
      // Fetch userId from API endpoint that uses secure session cookies
      const response = await fetch('/api/user/current')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.userId) {
          setCurrentUserId(data.userId)
          return
        }
      }
      // No valid session found - redirect to login with current page as redirect
      console.log('❌ [ROOM] No user session found, redirecting to login')
      const currentPath = `/room/${roomId}`
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
    }
    checkUser()
  }, [router, roomId])

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
          is_ready
        `)
        .eq('room_id', roomId)

      if (membersError) {
        console.error('❌ [ROOM] Error fetching members:', membersError)
      } else {
        console.log('✅ [ROOM] Members fetched:', membersData?.length || 0)
        // Fetch usernames separately for each member
        const transformedMembers = await Promise.all(
          (membersData || []).map(async (member: any) => {
            let userData = { username: 'Unknown', email: '' };
            
            // Fetch user info directly from users table
            try {
              const { data: userInfo, error: userError } = await supabase
                .from('users')
                .select('username, email')
                .eq('id', member.user_id)
                .single();
              
              if (!userError && userInfo) {
                userData = {
                  username: userInfo.username || 'Unknown',
                  email: userInfo.email || ''
                };
              } else {
                console.warn(`⚠️ [ROOM] Could not fetch user info for ${member.user_id}:`, userError);
              }
            } catch (err) {
              console.error('❌ [ROOM] Error fetching user info:', err);
            }
            
            return {
              ...member,
              users: userData
            };
          })
        );
        
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
      
      // Load study notes from database if they exist
      if (roomData.study_notes) {
        setGeneratedNotes(roomData.study_notes)
        console.log('✅ [ROOM] Loaded study notes from database')
      }
      
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

      // PGRST116 is "not found" - this is expected when no active session exists
      if (sessionError) {
        // Only log actual errors, not "not found" cases or empty error objects
        // Check if error has meaningful content before logging
        const errorCode = sessionError.code
        const errorMessage = sessionError.message
        const errorDetails = sessionError.details
        const errorHint = sessionError.hint
        
        // Check if error object has any meaningful properties (not empty, null, or undefined)
        const hasErrorInfo = (
          (errorCode && errorCode !== 'PGRST116' && errorCode.trim && errorCode.trim() !== '') ||
          (errorMessage && errorMessage.trim && errorMessage.trim() !== '') ||
          (errorDetails && typeof errorDetails === 'object' && Object.keys(errorDetails).length > 0) ||
          (errorHint && errorHint.trim && errorHint.trim() !== '')
        )
        
        // Only log if it's not a "not found" error and has meaningful content
        if (errorCode !== 'PGRST116' && hasErrorInfo) {
          console.error('❌ [ROOM] Error fetching quiz session:', {
            code: errorCode,
            message: errorMessage,
            details: errorDetails,
            hint: errorHint,
            fullError: sessionError
          })
        }
        // If it's just "not found" (PGRST116) or empty error object, that's fine - no active session
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
    // Admin mode: Create test room without database
    if (isAdminMode && roomId.startsWith('test-room-')) {
      const testRoom: Room = {
        id: roomId,
        name: "Admin Test Room",
        room_code: "TEST123",
        host_id: "test-host",
        subject: "Test Subject",
        difficulty: "medium",
        max_players: 4,
        current_players: 1,
        status: "waiting",
        is_private: false,
        time_limit: 30,
        total_questions: 5,
        created_at: new Date().toISOString()
      }
      
      setRoom(testRoom)
      setIsHost(true) // Admin is always host in test mode
      setCurrentUserId("test-user")
      setLoading(false)
      console.log('✅ [ROOM] Admin mode: Test room created')
      return
    }
    
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
  }, [roomId, currentUserId, supabase, isAdminMode])

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
        const updatedRoom = payload.new as Room & { study_notes?: any }
        // Update room data
        setRoom(updatedRoom)
        // Update notes if they were changed
        if (updatedRoom.study_notes) {
          setGeneratedNotes(updatedRoom.study_notes)
          console.log('✅ [ROOM] Study notes updated via real-time')
        }
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

  // Auto-start quiz if redirected from login with action=start-quiz
  useEffect(() => {
    const action = searchParams?.get('action')
    if (action === 'start-quiz' && room && isHost && currentUserId && !isStartingQuiz && !loading) {
      // Remove the action parameter from URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('action')
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search)
      
      // Auto-start quiz after a short delay to ensure everything is loaded
      const timer = setTimeout(() => {
        console.log('🚀 [ROOM] Auto-starting quiz after login redirect')
        handleStartQuiz()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, isHost, currentUserId, searchParams, isStartingQuiz, loading])

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
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max 5MB)`)
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
  // Matches singleplayer quality by including all necessary parameters
  const generateStudyNotes = async () => {
    // Check authentication first
    if (!currentUserId) {
      const currentPath = `/room/${roomId}`
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
      return
    }
    
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
      
      // Add study instructions and topic (matching singleplayer format)
      const battleTopic = studyInstructions || 'General Study Topic'
      formData.append('topic', battleTopic)
      formData.append('instructions', studyInstructions)
      
      // Add difficulty and education level for better note quality (matching singleplayer)
      formData.append('difficulty', quizSettings.difficulty)
      formData.append('educationLevel', quizSettings.educationLevel)
      
      // Add content focus if specified
      if (quizSettings.contentFocus) {
        formData.append('contentFocus', quizSettings.contentFocus)
      }

      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setGeneratedNotes(result.notes)
          console.log('✅ [ROOM] Study notes generated successfully')
          
          // Store notes in database so all room members can see them
          if (room) {
            const { error: updateError } = await supabase
              .from('game_rooms')
              .update({ study_notes: result.notes })
              .eq('id', room.id)
            
            if (updateError) {
              console.error('❌ [ROOM] Failed to save notes to database:', updateError)
            } else {
              console.log('✅ [ROOM] Notes saved to database for room sharing')
            }
          }
        } else {
          console.error('❌ [ROOM] Failed to generate notes:', result.error)
          alert(result.error || 'Failed to generate study notes. Please try again.')
        }
      } else {
        const error = await response.json()
        console.error('❌ [ROOM] Failed to generate notes:', error)
        alert(error.error || 'Failed to generate study notes. Please try again.')
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
      // Check current session via API to ensure user is authenticated
      const sessionCheckResponse = await fetch('/api/user/current')
      let verifiedUserId: string | null = null
      
      if (sessionCheckResponse.ok) {
        const sessionData = await sessionCheckResponse.json()
        if (sessionData.success && sessionData.userId) {
          verifiedUserId = sessionData.userId
          console.log('✅ [ROOM] Session verified, user ID:', verifiedUserId)
        }
      }
      
      // If no valid session, redirect to login with redirect parameter
      if (!verifiedUserId) {
        console.warn('⚠️ [ROOM] No valid session found, redirecting to login')
        const currentPath = `/room/${roomId}`
        const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}&action=start-quiz`
        router.push(redirectUrl)
        setIsStartingQuiz(false)
        return
      }
      
      // Update currentUserId if it was missing
      if (!currentUserId && verifiedUserId) {
        setCurrentUserId(verifiedUserId)
      }
      
      // Use verified user ID
      const userIdToUse = verifiedUserId || currentUserId
      
      if (!userIdToUse) {
        console.error('❌ [ROOM] No user ID available after session check')
        alert('You must be logged in to start a quiz.')
        setIsStartingQuiz(false)
        return
      }

      console.log('🔍 [ROOM] Checking room membership for user:', userIdToUse, 'room:', room.id)
      
      // Check if user is in room_members
      const { data: memberCheck, error: memberError } = await supabase
        .from('room_members')
        .select('user_id, room_id')
        .eq('room_id', room.id)
        .eq('user_id', userIdToUse)
        .maybeSingle()

      if (memberError) {
        console.error('❌ [ROOM] Error checking room membership:', {
          code: memberError.code,
          message: memberError.message,
          details: memberError.details
        })
      }

      // If user is not a member, add them (host should always be a member)
      if (!memberCheck) {
        console.log('⚠️ [ROOM] User not in room_members, adding as host...')
        const { data: newMember, error: addMemberError } = await supabase
          .from('room_members')
          .insert({
            room_id: room.id,
            user_id: userIdToUse,
            is_ready: false
          })
          .select()
          .single()

        if (addMemberError) {
          console.error('❌ [ROOM] Failed to add user to room_members:', {
            code: addMemberError.code,
            message: addMemberError.message,
            details: addMemberError.details,
            hint: addMemberError.hint
          })
          alert(`Failed to verify room membership: ${addMemberError.message || 'Unknown error'}. Please try refreshing the page.`)
          setIsStartingQuiz(false)
          return
        }
        console.log('✅ [ROOM] User added to room_members:', newMember)
      } else {
        console.log('✅ [ROOM] User is already in room_members')
      }

      // Create quiz session using the correct schema (is_active, not status)
      console.log('🚀 [ROOM] Creating quiz session with data:', {
        room_id: room.id,
        session_name: room.name ? `${room.name} Quiz` : 'Quiz Session',
        total_questions: quizSettings.totalQuestions,
        current_question: 0,
        time_limit: quizSettings.timeLimit,
        is_active: true
      })

      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          room_id: room.id,
          session_name: room.name ? `${room.name} Quiz` : 'Quiz Session',
          total_questions: quizSettings.totalQuestions,
          current_question: 0,
          time_limit: quizSettings.timeLimit,
          is_active: true,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (sessionError) {
        console.error('❌ [ROOM] Error creating quiz session:', {
          code: sessionError.code,
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint,
          fullError: JSON.stringify(sessionError, null, 2)
        })
        
        // Provide user-friendly error messages based on error code
        let errorMessage = 'Failed to start quiz. '
        if (sessionError.code === '42501') {
          errorMessage += 'Permission denied. You may not have access to create quiz sessions in this room.'
        } else if (sessionError.code === '23503') {
          errorMessage += 'Invalid room reference. The room may not exist.'
        } else if (sessionError.code === '23505') {
          errorMessage += 'A quiz session already exists for this room.'
        } else {
          errorMessage += sessionError.message || 'Unknown error occurred.'
        }
        
        alert(errorMessage)
        setIsStartingQuiz(false)
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
        const quizRequestBody: any = {
          topic: room.subject || 'General Knowledge',
          difficulty: quizSettings.difficulty,
          totalQuestions: quizSettings.totalQuestions,
          sessionId: sessionData.id,
          contentFocus: quizSettings.contentFocus,
          includeDiagrams: quizSettings.includeDiagrams,
          educationLevel: quizSettings.educationLevel
        }
        
        // Include study notes if they exist (for better quiz quality)
        if (generatedNotes) {
          quizRequestBody.studyNotes = generatedNotes
        }
        
        // Include studyContext for parity with singleplayer
        if (studyContext) {
          quizRequestBody.studyContext = studyContext
        }
        
        // Include files if notes aren't available (for parity with singleplayer)
        // Note: In multiplayer, files are usually already processed into notes,
        // but we include this for consistency with singleplayer flow
        if (!generatedNotes && uploadedFiles.length > 0) {
          // Files can't be sent in JSON, so we note that files were uploaded
          // The API will use notes if provided, otherwise it can extract from files
          console.log('📝 [ROOM] Files available but notes not generated - quiz will use topic only')
        }
        
        console.log('📝 [ROOM] Generating quiz with request:', {
          ...quizRequestBody,
          studyNotes: generatedNotes ? 'provided' : 'not provided',
          studyContext: studyContext ? 'provided' : 'not provided'
        })
        
        const questionsResponse = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(quizRequestBody)
        })

        if (questionsResponse.ok) {
          const questionsResult = await questionsResponse.json()
          if (questionsResult.success) {
            console.log('✅ [ROOM] Quiz questions generated successfully')
            
            // Redirect all players to the battle page
            router.push(`/room/${room.id}/battle`)
          } else {
            console.error('❌ [ROOM] Quiz generation failed:', questionsResult.error || 'Unknown error')
            alert(`Failed to generate quiz questions: ${questionsResult.error || 'Unknown error'}. Please try again.`)
            setIsStartingQuiz(false)
          }
        } else {
          // Try to get error message from response
          let errorMessage = 'Failed to generate quiz questions'
          try {
            const errorData = await questionsResponse.json()
            errorMessage = errorData.error || errorMessage
          } catch {
            // If response isn't JSON, use status text
            errorMessage = `${errorMessage} (${questionsResponse.status}: ${questionsResponse.statusText})`
          }
          
          console.error('❌ [ROOM] Failed to generate quiz questions:', {
            status: questionsResponse.status,
            statusText: questionsResponse.statusText,
            error: errorMessage
          })
          alert(`${errorMessage}. Please try again.`)
          setIsStartingQuiz(false)
        }
      } catch (error: any) {
        console.error('❌ [ROOM] Error generating quiz questions:', {
          error: error.message || error,
          stack: error.stack
        })
        alert(`Failed to generate quiz questions: ${error.message || 'Network error'}. Please check your connection and try again.`)
        setIsStartingQuiz(false)
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
    // Check authentication first
    if (!currentUserId) {
      const currentPath = `/room/${roomId}`
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
      return
    }
    
    if (!isHost || !room) return
    
    // If notes are already generated, just start the timer
    if (generatedNotes) {
      console.log('📚 [ROOM] Starting study session with existing notes...')
      
      // Generate additional resources if not already generated
      const resources = studySession.resources.notes.length > 0 
        ? studySession.resources 
        : await generateStudyResources(room.subject || 'Study Session', generatedNotes)
      
      setStudySession({
        isActive: true,
        timeRemaining: studySessionDuration * 60, // Convert minutes to seconds
        studyMaterials: generatedNotes,
        resources: resources
      })
      
      // Start countdown timer
      startStudyTimer()
      return
    }
    
    // Require either uploaded files or study instructions if notes don't exist
    if (uploadedFiles.length === 0 && !studyInstructions.trim()) {
      alert('Please generate study notes first, or upload study materials and provide study instructions.')
      return
    }
    
    setIsStartingStudySession(true)
    console.log('📚 [ROOM] Starting study session and generating notes...')
    
    try {
      // Generate study materials from uploaded files
      const formData = new FormData()
      uploadedFiles.forEach(file => {
        formData.append('files', file)
      })
      formData.append('topic', room.subject || 'Study Session')
      formData.append('instructions', studyInstructions)
      formData.append('difficulty', quizSettings.difficulty)
      formData.append('educationLevel', quizSettings.educationLevel)
      if (quizSettings.contentFocus) {
        formData.append('contentFocus', quizSettings.contentFocus)
      }
      // Add studyContext for parity with singleplayer
      if (studyContext) {
        formData.append('studyContext', JSON.stringify(studyContext))
      }
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Store notes in database so all room members can see them
        if (room) {
          const { error: updateError } = await supabase
            .from('game_rooms')
            .update({ study_notes: result.notes })
            .eq('id', room.id)
          
          if (updateError) {
            console.error('❌ [ROOM] Failed to save notes to database:', updateError)
          } else {
            console.log('✅ [ROOM] Notes saved to database for room sharing')
            if (result.noteId) {
              console.log(`✅ [ROOM] Notes also saved with ID: ${result.noteId} (for host's personal access)`)
            }
            // Also update local state
            setGeneratedNotes(result.notes)
          }
        }
        
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
    // Clear any existing timer
    if (studyTimerRef.current) {
      clearInterval(studyTimerRef.current)
      studyTimerRef.current = null
    }
    
    // Start new timer
    studyTimerRef.current = setInterval(() => {
      setStudySession(prev => {
        if (prev.timeRemaining <= 1) {
          // Clear timer when it reaches 0
          if (studyTimerRef.current) {
            clearInterval(studyTimerRef.current)
            studyTimerRef.current = null
          }
          // Notify all users that study session has ended
          setMemberNotification({
            type: 'info',
            username: 'System',
            message: 'Study session has ended! The host can now start the quiz.'
          })
          // Auto-dismiss notification after 10 seconds
          setTimeout(() => setMemberNotification(null), 10000)
          return { ...prev, isActive: false, timeRemaining: 0 }
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 }
      })
    }, 1000)
  }
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (studyTimerRef.current) {
        clearInterval(studyTimerRef.current)
        studyTimerRef.current = null
      }
    }
  }, [])

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
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative z-10 text-center">
          <Brain className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" strokeWidth={3} />
          <p className="text-blue-200 font-bold">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative z-10 text-center">
          <Brain className="h-12 w-12 text-red-400 mx-auto mb-4" strokeWidth={3} />
          <h1 className="text-2xl font-black text-white mb-2">Room Not Found</h1>
          <p className="text-blue-100/80 mb-6 font-bold">{error}</p>
          <Link href="/dashboard" className="text-blue-300 hover:text-blue-200 font-bold transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Show loading screen when generating notes or starting quiz
  if (isGeneratingNotes) {
    return <BrainBattleLoading message="Generating your study notes..." />
  }
  
  if (isStartingQuiz) {
    return <BrainBattleLoading message="Generating your quiz battle..." />
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
      
      <div className="relative z-10">
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
              : memberNotification.type === 'leave'
              ? 'bg-orange-500 text-white'
              : 'bg-blue-500 text-white'
          }`}>
            {memberNotification.type === 'join' ? (
              <>
                <Users className="h-4 w-4" strokeWidth={3} />
                {memberNotification.username} joined the room!
              </>
            ) : memberNotification.type === 'leave' ? (
              <>
                <Users className="h-4 w-4" strokeWidth={3} />
                {memberNotification.username} left the room
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" strokeWidth={3} />
                {memberNotification.message || memberNotification.username}
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        {/* Study Session Configuration - At Top for Host */}
        {isHost && !studySession.isActive && (
          <div className="mb-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center border-2 border-orange-400">
                  <Clock className="h-7 w-7 text-white" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white mb-1">Study Session Duration</h3>
                  <p className="text-sm text-blue-100/80 font-bold">Set how long players have to study before the quiz</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="studyTimeTop" className="text-base font-bold text-white">
                    Duration (minutes):
                  </label>
                  <input
                    id="studyTimeTop"
                    type="number"
                    min="1"
                    max="60"
                    value={studySessionDuration}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      // Allow empty input for editing
                      if (inputValue === '') {
                        setStudySessionDuration(0)
                        return
                      }
                      const value = parseInt(inputValue)
                      if (!isNaN(value)) {
                        setStudySessionDuration(Math.max(1, Math.min(60, value)))
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure a valid value when user leaves the field
                      if (studySessionDuration < 1 || studySessionDuration > 60) {
                        setStudySessionDuration(5)
                      }
                    }}
                    className="w-24 px-4 py-2 text-center font-black rounded-xl border-4 border-orange-400 bg-slate-900 text-white text-lg focus:border-orange-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Study Session Timer - Visible at Top when Active (All Users) */}
        {studySession.isActive && (
          <div className="mb-6 bg-gradient-to-br from-orange-500/20 to-blue-500/20 border-4 border-orange-400/50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center border-2 border-orange-400">
                  <Clock className="h-7 w-7 text-white" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white mb-1">Study Session Active</h3>
                  <p className="text-sm text-blue-100/80 font-bold">Time remaining to review materials</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-4xl font-black text-orange-400">{formatTime(studySession.timeRemaining)}</div>
                  <div className="text-sm text-blue-100/70 font-bold">Time Remaining</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-blue-300 hover:text-blue-200 mr-4 transition-colors">
              <ArrowLeft className="h-6 w-6" strokeWidth={3} />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {room.name}
                </h1>
                {isHost && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full border-2 border-orange-400">
                    <Crown className="h-4 w-4" strokeWidth={3} />
                    <span className="text-xs font-black">HOST</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-blue-100/80 font-bold">Room Code: <span className="font-black text-blue-300">{room.room_code}</span></p>
                <button
                  onClick={copyRoomCode}
                  className="flex items-center px-3 py-1.5 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600/50 rounded-lg shadow-lg hover:border-blue-400/50 transition-colors font-bold text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-green-400 mr-1.5" strokeWidth={3} />
                      <span className="text-green-400 text-sm">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-blue-300 mr-1.5" strokeWidth={3} />
                      <span className="text-blue-300 text-sm">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          {isHost && (
            <div className="flex items-center gap-3">
              <button
                onClick={startStudySession}
                disabled={(!generatedNotes && uploadedFiles.length === 0 && !studyInstructions.trim()) || studySession.isActive || isStartingStudySession}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl border-4 border-orange-400 shadow-lg hover:border-orange-300 transition-colors font-black text-lg disabled:bg-slate-700/50 disabled:text-blue-100/70 disabled:border-slate-600/50 disabled:cursor-not-allowed"
              >
                {isStartingStudySession ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={3} />
                    Starting...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 mr-2" strokeWidth={3} />
                    Start Study Session
                  </>
                )}
              </button>
              
              <button
                onClick={handleStartQuiz}
                disabled={isStartingQuiz}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl border-4 border-blue-400 shadow-lg hover:border-blue-300 transition-colors font-black text-lg disabled:bg-slate-700/50 disabled:text-blue-100/70 disabled:border-slate-600/50 disabled:cursor-not-allowed"
              >
                {isStartingQuiz ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={3} />
                    Starting...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" strokeWidth={3} />
                    Start Quiz
                  </>
                )}
              </button>
            </div>
          )}
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
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-2xl shadow-lg p-6">
              <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
                <Users className="h-6 w-6 text-blue-400" strokeWidth={3} />
                Live Progress
              </h3>
              <div className="flex flex-wrap gap-4">
                {members.map((member) => {
                  const progress = playerProgress[member.user_id] || { currentQuestion: 0, score: 0, isActive: false }
                  const isMemberHost = member.user_id === room.host_id
                  const progressPercent = room.total_questions > 0 ? (progress.currentQuestion / room.total_questions) * 100 : 0
                  
                  return (
                    <div key={member.user_id} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl border-2 border-slate-600/50 min-w-[220px] cartoon-hover">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-slate-600/50 ${
                        isMemberHost ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-blue-400-foreground'
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
                          <p className="font-black text-white text-sm truncate">{member.users.username}</p>
                          {isMemberHost && (
                            <span className="text-xs font-black text-white bg-gradient-to-r from-orange-500 to-orange-600 px-2 py-1 rounded-full border-2 border-slate-600/50">
                              HOST
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-blue-100/70">
                            <span>Q: {progress.currentQuestion}/{room.total_questions}</span>
                            <span>Score: {progress.score}</span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2 border-2 border-slate-600/50">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full border-2 border-slate-600/50 ${
                        progress.isActive ? 'bg-gradient-to-r from-orange-500 to-orange-600 animate-pulse' : 'bg-slate-700/50-foreground'
                      }`} title={progress.isActive ? 'Active' : 'Inactive'}></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}


        {/* Time Editing Modal */}
        {isEditingTime && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl p-6 border-2 border-slate-600/50 cartoon-shadow max-w-md w-full mx-4">
              <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" strokeWidth={3} />
                Edit Study Session Time
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="editTime" className="text-sm font-bold text-white mb-2 block">
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
                    className="w-full px-4 py-3 text-center font-bold rounded-lg border-2 border-slate-600/50 bg-card text-white"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveTime}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-blue-400-foreground py-2 px-4 rounded-lg font-black border-2 border-slate-600/50 cartoon-shadow cartoon-hover"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditTime}
                    className="flex-1 bg-slate-700/50 text-blue-100/70 py-2 px-4 rounded-lg font-black border-2 border-slate-600/50 cartoon-shadow cartoon-hover"
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
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-blue-400 mr-2" strokeWidth={3} />
                  <h2 className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                    Members ({members.length})
                  </h2>
                </div>
                <button
                  onClick={() => fetchRoomMembers(true)}
                  disabled={isRefreshingMembers}
                  className="p-3 text-blue-100/70 hover:text-blue-300 hover:bg-blue-500/20 rounded-xl border-2 border-slate-600/50 transition-all disabled:opacity-50"
                  title="Refresh members list"
                >
                  <RefreshCw className={`h-5 w-5 ${isRefreshingMembers ? 'animate-spin' : ''}`} strokeWidth={3} />
                </button>
              </div>
              <div className="space-y-4">
                {members.map((member) => {
                  const isMemberHost = member.user_id === room.host_id
                  return (
                    <div key={member.user_id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border-2 border-slate-600/50 hover:border-blue-400/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                          isMemberHost ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400'
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
                            <p className="font-black text-white text-lg">{member.users.username}</p>
                            {isMemberHost && (
                              <span className="text-xs font-black text-white bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 rounded-full border-2 border-orange-400">
                                HOST
                              </span>
                            )}
                            <div className={`w-3 h-3 rounded-full border-2 ${
                              member.is_ready ? 'bg-green-400 border-green-300 animate-pulse' : 'bg-slate-500 border-slate-400'
                            }`} title={member.is_ready ? 'Ready' : 'Not Ready'}></div>
                          </div>
                          <p className="text-sm text-blue-100/70 font-bold">
                            {member.is_ready ? 'Ready' : 'Not Ready'} • Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quiz Settings & Study Session Tabs */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-2xl shadow-lg p-6">
              {/* Tab Navigation */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-blue-400 mr-2" strokeWidth={3} />
                  <h2 className="text-2xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {activeTab === 'quiz-settings' ? 'Quiz Settings' : 'Study Session'}
                  </h2>
                  {activeTab === 'quiz-settings' && !isHost && (
                    <Lock className="h-5 w-5 text-blue-100/70 ml-2" strokeWidth={3} />
                  )}
                </div>
                
                {/* Tab Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('quiz-settings')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
                      activeTab === 'quiz-settings'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400'
                        : 'bg-slate-700/50 text-blue-100/70 border-slate-600/50 hover:border-blue-400/50'
                    }`}
                  >
                    <Settings className="h-4 w-4 mr-2 inline" strokeWidth={3} />
                    Quiz Settings
                  </button>
                  <button
                    onClick={() => {
                      // Non-hosts can only access Study Session tab if notes are generated
                      if (!isHost && !generatedNotes) {
                        alert('Study notes must be generated by the host first.')
                        return
                      }
                      setActiveTab('study-session')
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
                      activeTab === 'study-session'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400'
                        : 'bg-slate-700/50 text-blue-100/70 border-slate-600/50 hover:border-blue-400/50'
                    } ${!isHost && !generatedNotes ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <BookOpen className="h-4 w-4 mr-2 inline" strokeWidth={3} />
                    Study Session
                  </button>
                </div>
              </div>
              
              {/* Study Session Duration Card - Visible in both tabs */}
              {!studySession.isActive && isHost && (
                <div className="mb-6 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-2 border-slate-600/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-400" strokeWidth={3} />
                      <label htmlFor="studyTimeTab" className="text-sm font-bold text-white">
                        Study Session Duration (minutes):
                      </label>
                    </div>
                    <input
                      id="studyTimeTab"
                      type="number"
                      min="1"
                      max="60"
                      value={studySessionDuration}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        if (inputValue === '') {
                          setStudySessionDuration(0)
                          return
                        }
                        const value = parseInt(inputValue)
                        if (!isNaN(value)) {
                          setStudySessionDuration(Math.max(1, Math.min(60, value)))
                        }
                      }}
                      onBlur={(e) => {
                        if (studySessionDuration < 1 || studySessionDuration > 60) {
                          setStudySessionDuration(5)
                        }
                      }}
                      className="w-20 px-3 py-2 text-center font-black rounded-lg border-2 border-orange-400 bg-slate-900 text-white text-base focus:border-orange-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              )}
              
              {/* Study Session Timer - Visible in both tabs when active */}
              {studySession.isActive && (
                <div className="mb-6 bg-gradient-to-br from-orange-500/20 to-blue-500/20 border-2 border-orange-400/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-400" strokeWidth={3} />
                      <span className="text-sm font-bold text-white">Study Session Active</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-orange-400">{formatTime(studySession.timeRemaining)}</div>
                      <div className="text-xs text-blue-100/70 font-bold">Time Remaining</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quiz Settings Tab */}
              {activeTab === 'quiz-settings' && (
                <div className="space-y-6">
                  {isHost ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">
                          Quiz Difficulty
                        </label>
                        <select 
                          className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                          value={quizSettings.difficulty}
                          onChange={(e) => updateQuizSettings('difficulty', e.target.value)}
                        >
                          <option value="easy" className="bg-slate-900 text-white">Easy</option>
                          <option value="medium" className="bg-slate-900 text-white">Medium</option>
                          <option value="hard" className="bg-slate-900 text-white">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">
                          Number of Questions
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="50"
                          value={quizSettings.totalQuestions}
                          onChange={(e) => updateQuizSettings('totalQuestions', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                      
                      {/* Content Focus */}
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">
                          Content Focus
                        </label>
                        <select 
                          className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                          value={quizSettings.contentFocus}
                          onChange={(e) => updateQuizSettings('contentFocus', e.target.value as 'application' | 'concept' | 'both')}
                        >
                          <option value="application" className="bg-slate-900 text-white">Application (Use cases, formulas, problem-solving)</option>
                          <option value="concept" className="bg-slate-900 text-white">Concept (Definitions, explanations, understanding)</option>
                          <option value="both" className="bg-slate-900 text-white">Both (Mix of applications and concepts)</option>
                        </select>
                      </div>

                      {/* Education Level */}
                      <div>
                        <label className="block text-sm font-bold text-white mb-2">
                          Education Level
                        </label>
                        <select 
                          className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                          value={quizSettings.educationLevel}
                          onChange={(e) => updateQuizSettings('educationLevel', e.target.value as 'elementary' | 'high_school' | 'university' | 'graduate')}
                        >
                          <option value="elementary" className="bg-slate-900 text-white">Elementary School</option>
                          <option value="high_school" className="bg-slate-900 text-white">High School</option>
                          <option value="university" className="bg-slate-900 text-white">University</option>
                          <option value="graduate" className="bg-slate-900 text-white">Graduate School</option>
                        </select>
                        <p className="text-xs text-blue-100/70 font-bold mt-1">
                          Adjusts question difficulty to match your level
                        </p>
                      </div>

                      {/* Include Diagrams */}
                      <div className="p-4 rounded-lg bg-slate-700/30 border-2 border-slate-600/50">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={quizSettings.includeDiagrams}
                            onChange={(e) => updateQuizSettings('includeDiagrams', e.target.checked)}
                            className="w-5 h-5 accent-primary cursor-pointer"
                          />
                          <div>
                            <span className="text-sm text-white font-bold block">Include Image-Generated Diagrams</span>
                            <span className="text-xs text-blue-100/70 font-bold">Generate diagrams for questions that need visual aids</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-700/30 rounded-xl border-2 border-slate-600/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="h-5 w-5 text-blue-100/70" strokeWidth={3} />
                          <span className="text-sm font-bold text-blue-100/70">Host Only</span>
                        </div>
                        <p className="text-sm text-blue-100/70 font-bold">
                          Only the room host can change quiz settings.
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-white mb-2">
                            Quiz Difficulty
                          </label>
                          <div className="px-4 py-3 bg-slate-700/50 rounded-xl border-2 border-slate-600/50 text-white font-bold capitalize">
                            {room.difficulty}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-white mb-2">
                            Number of Questions
                          </label>
                          <div className="px-4 py-3 bg-slate-700/50 rounded-xl border-2 border-slate-600/50 text-white font-bold">
                            {room.total_questions}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-white mb-2">
                            Time per Question
                          </label>
                          <div className="px-4 py-3 bg-slate-700/50 rounded-xl border-2 border-slate-600/50 text-white font-bold">
                            {room.time_limit} seconds
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Study Session Tab */}
              {activeTab === 'study-session' && (
                <div className="space-y-6">
                  {!generatedNotes ? (
                    // Step 1-3: Upload, Topic, Generate (Host only)
                    isHost ? (
                      <div className="space-y-6">
                        {/* Step 1: File Upload */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Upload className="h-5 w-5 text-blue-400" strokeWidth={3} />
                            <h3 className="text-lg font-black text-white">1. Upload Study Materials</h3>
                          </div>
                          
                          {/* Success message */}
                          {showUploadSuccess && (
                            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600/10 border-2 border-chart-3 text-center border-2 border-slate-600/50">
                              <p className="text-chart-3 font-black text-sm">✅ Files uploaded successfully!</p>
                            </div>
                          )}

                          {/* Error messages */}
                          {uploadErrors.length > 0 && (
                            <div className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive border-2 border-slate-600/50">
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
                            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600/10 border-2 border-primary text-center border-2 border-slate-600/50">
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" strokeWidth={3} />
                                <p className="text-blue-400 font-black text-sm">Processing files...</p>
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
                            className="border-2 border-dashed border-slate-600/50 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Upload className="h-10 w-10 text-blue-300/70 mx-auto mb-3" strokeWidth={3} />
                            <p className="text-blue-100/80 mb-3 font-bold">Upload PDFs, documents, or study materials</p>
                            <button 
                              type="button"
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors text-sm font-bold border-2 border-blue-400"
                            >
                              Choose Files
                            </button>
                            <p className="text-xs text-blue-100/60 mt-2 font-bold">Max 5MB per file • PDF, DOC, TXT, PPT supported</p>
                          </div>

                          {/* Uploaded files */}
                          {uploadedFiles.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-white text-sm">Uploaded Files ({uploadedFiles.length})</h4>
                                <button
                                  onClick={() => setUploadedFiles([])}
                                  className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
                                >
                                  Clear All
                                </button>
                              </div>
                              <div className="space-y-2">
                                {uploadedFiles.map((file, index) => (
                                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border-2 border-slate-600/50">
                                    <span className="text-lg">{getFileIcon(file)}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-white text-sm truncate">{file.name}</p>
                                      <p className="text-xs text-blue-100/70">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button
                                      onClick={() => removeFile(index)}
                                      className="text-red-400 hover:text-red-300 p-1 transition-colors"
                                    >
                                      <X className="h-4 w-4" strokeWidth={3} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Step 2: Study Instructions */}
                        <div className="bg-slate-700/30 rounded-xl p-6 border-2 border-slate-600/50">
                          <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="h-5 w-5 text-blue-400" strokeWidth={3} />
                            <h3 className="text-lg font-black text-white">2. Study Instructions (Optional)</h3>
                          </div>
                          <p className="text-sm text-blue-100/70 mb-4 font-bold">
                            Tell the AI what you want to study and be quizzed on. Be specific about topics, difficulty, and focus areas.
                          </p>
                          <textarea
                            value={studyInstructions}
                            onChange={(e) => setStudyInstructions(e.target.value)}
                            placeholder="Example: Study Chapter 6 on Photosynthesis, focus on the light-dependent reactions, Calvin cycle, and factors affecting photosynthesis. Create questions about the process, equations, and environmental factors."
                            className="w-full p-4 rounded-xl border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400 focus:outline-none resize-none"
                            rows={4}
                          />
                        </div>

                        {/* Step 3: Generate Notes */}
                        <div className="flex justify-center">
                          <button
                            onClick={generateStudyNotes}
                            disabled={isGeneratingNotes || (!studyInstructions.trim() && uploadedFiles.length === 0)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:bg-gradient-to-r from-blue-500 to-blue-600/90 text-white font-black text-lg px-8 py-3 rounded-xl border-2 border-slate-600/50 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingNotes ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin inline" strokeWidth={3} />
                                Generating Notes...
                              </>
                            ) : (
                              <>
                                <Brain className="w-5 h-5 mr-2 inline" strokeWidth={3} />
                                Generate Study Notes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Non-host: Waiting for notes
                      <div className="border-2 border-dashed border-slate-600/50 rounded-xl p-8 text-center bg-slate-700/30">
                        <BookOpen className="h-12 w-12 text-blue-100/70 mx-auto mb-4" strokeWidth={3} />
                        <h3 className="text-lg font-black text-white mb-2">Waiting for Study Notes</h3>
                        <p className="text-blue-100/70 font-bold">
                          The host will generate study notes based on the uploaded materials and instructions.
                        </p>
                      </div>
                    )
                  ) : (
                    // Step 4: Display Notes (Everyone can see once generated)
                    <div>
                      <StudyNotesViewer 
                        notes={generatedNotes}
                        fileNames={uploadedFiles.map(f => f.name)}
                        onStartBattle={() => {}} // Not used in multiplayer
                        hideActions={true} // Hide "Ready to Test?" section in multiplayer
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Settings */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Settings className="h-6 w-6 text-blue-400 mr-2" strokeWidth={3} />
                  <h3 className="text-xl font-black text-white" style={{ fontFamily: "var(--font-display)" }}>
                    Room Settings
                  </h3>
                  {!isHost && (
                    <Lock className="h-5 w-5 text-blue-100/70 ml-2" strokeWidth={3} />
                  )}
                </div>
                {quizSession?.status === 'active' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-2 border-destructive rounded-full border-2 border-slate-600/50">
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
                    <label className="block text-sm font-bold text-white mb-2">
                      Quiz Difficulty
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                      value={quizSettings.difficulty}
                      onChange={(e) => updateQuizSettings('difficulty', e.target.value)}
                    >
                      <option value="easy" className="bg-slate-900 text-white">Easy</option>
                      <option value="medium" className="bg-slate-900 text-white">Medium</option>
                      <option value="hard" className="bg-slate-900 text-white">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">
                      Number of Questions
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={quizSettings.totalQuestions}
                      onChange={(e) => updateQuizSettings('totalQuestions', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  
                  {/* Content Focus */}
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">
                      Content Focus
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                      value={quizSettings.contentFocus}
                      onChange={(e) => updateQuizSettings('contentFocus', e.target.value as 'application' | 'concept' | 'both')}
                    >
                      <option value="application" className="bg-slate-900 text-white">Application (Use cases, formulas, problem-solving)</option>
                      <option value="concept" className="bg-slate-900 text-white">Concept (Definitions, explanations, understanding)</option>
                      <option value="both" className="bg-slate-900 text-white">Both (Mix of applications and concepts)</option>
                    </select>
                  </div>

                  {/* Education Level */}
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">
                      Education Level
                    </label>
                    <select 
                      className="w-full px-4 py-3 border-4 border-slate-600/50 rounded-xl bg-slate-900 text-white font-bold focus:border-blue-400 focus:outline-none"
                      value={quizSettings.educationLevel}
                      onChange={(e) => updateQuizSettings('educationLevel', e.target.value as 'elementary' | 'high_school' | 'university' | 'graduate')}
                    >
                      <option value="elementary" className="bg-slate-900 text-white">Elementary School</option>
                      <option value="high_school" className="bg-slate-900 text-white">High School</option>
                      <option value="university" className="bg-slate-900 text-white">University</option>
                      <option value="graduate" className="bg-slate-900 text-white">Graduate School</option>
                    </select>
                    <p className="text-xs text-blue-100/70 font-bold mt-1">
                      Adjusts question difficulty to match your level
                    </p>
                  </div>

                  {/* Include Diagrams */}
                  <div className="p-4 rounded-lg bg-slate-700/30 border-2 border-slate-600/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quizSettings.includeDiagrams}
                        onChange={(e) => updateQuizSettings('includeDiagrams', e.target.checked)}
                        className="w-5 h-5 accent-primary cursor-pointer"
                      />
                      <div>
                        <span className="text-sm text-white font-bold block">Include Image-Generated Diagrams</span>
                        <span className="text-xs text-blue-100/70 font-bold">Generate diagrams for questions that need visual aids</span>
                      </div>
                    </label>
                  </div>


                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-700/30 rounded-xl border-2 border-slate-600/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-5 w-5 text-blue-100/70" strokeWidth={3} />
                      <span className="text-sm font-bold text-blue-100/70">Host Only</span>
                    </div>
                    <p className="text-sm text-blue-100/70 font-bold">
                      Only the room host can change quiz settings and start the game.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Quiz Difficulty
                      </label>
                      <div className="px-4 py-3 bg-slate-700/50 rounded-xl border-2 border-slate-600/50 text-white font-bold capitalize">
                        {room.difficulty}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Number of Questions
                      </label>
                      <div className="px-4 py-3 bg-slate-700/50 rounded-xl border-2 border-slate-600/50 text-white font-bold">
                        {room.total_questions}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Time per Question
                      </label>
                      <div className="px-4 py-3 bg-slate-700/50 rounded-xl border-2 border-slate-600/50 text-white font-bold">
                        {room.time_limit} seconds
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600/10 rounded-xl border-2 border-slate-600/50">
                    <p className="text-sm text-blue-400 font-black">
                      Waiting for host to start the quiz...
                    </p>
                  </div>
                  
                  {/* Active Quiz Session */}
                  {quizSession?.status === 'active' && (
                    <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600/10 border-2 border-chart-3 rounded-xl border-2 border-slate-600/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-5 w-5 text-chart-3" strokeWidth={3} />
                        <span className="font-black text-chart-3">Quiz Active!</span>
                      </div>
                      <p className="text-sm text-chart-3 font-bold mb-4">
                        The quiz has started! Join the battle to compete with other players.
                      </p>
                      <Button
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:bg-gradient-to-r from-orange-500 to-orange-600/90 text-white font-black border-2 border-slate-600/50 cartoon-shadow cartoon-hover"
                        loading={loadingButton === 'battle'}
                        loadingText="Joining Battle..."
                        onClick={async () => {
                          setLoadingButton('battle')
                          try {
                            await router.push(`/room/${roomId}/battle`)
                            // Loading state will persist until component unmounts (page navigation completes)
                          } catch (error) {
                            console.error("Navigation error:", error)
                            setLoadingButton(null)
                          }
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

          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
