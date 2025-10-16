"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  Clock, 
  Brain, 
  Upload, 
  Users, 
  Play, 
  Pause, 
  RotateCcw,
  FileText,
  Settings,
  CheckCircle
} from 'lucide-react'

interface StudySessionControlsProps {
  roomId: string
  isHost: boolean
  onSessionStart: (config: StudySessionConfig) => void
  onSessionPause: () => void
  onSessionResume: () => void
  onSessionReset: () => void
}

interface StudySessionConfig {
  duration: number // in minutes
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  documents: File[]
  studyNotes?: any
}

interface StudySession {
  id: string
  room_id: string
  topic: string
  difficulty: string
  duration_minutes: number
  status: 'waiting' | 'studying' | 'paused' | 'completed'
  current_phase: 'upload' | 'notes' | 'quiz' | 'review'
  study_notes?: any
  started_at?: string
  paused_at?: string
  time_remaining?: number
}

export default function StudySessionControls({ 
  roomId, 
  isHost, 
  onSessionStart, 
  onSessionPause, 
  onSessionResume, 
  onSessionReset 
}: StudySessionControlsProps) {
  const [session, setSession] = useState<StudySession | null>(null)
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [duration, setDuration] = useState(30) // minutes
  const [showSettings, setShowSettings] = useState(false)

  // Load session data
  useEffect(() => {
    loadSession()
  }, [roomId])

  const loadSession = async () => {
    // In a real app, this would fetch from the database
    // For now, we'll simulate session state
    setSession({
      id: `session_${roomId}`,
      room_id: roomId,
      topic: '',
      difficulty: 'medium',
      duration_minutes: 30,
      status: 'waiting',
      current_phase: 'upload'
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const generateStudyNotes = async () => {
    if (!topic.trim() || uploadedFiles.length === 0) return

    setIsGeneratingNotes(true)
    try {
      const formData = new FormData()
      uploadedFiles.forEach(file => formData.append('files', file))
      formData.append('topic', topic)
      formData.append('difficulty', difficulty)

      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        // Update session with study notes
        setSession(prev => prev ? {
          ...prev,
          study_notes: result.notes,
          current_phase: 'notes',
          topic: topic,
          difficulty: difficulty
        } : null)
      } else {
        console.error('Failed to generate study notes:', result.error)
      }
    } catch (error) {
      console.error('Error generating study notes:', error)
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  const startStudySession = () => {
    if (!session?.study_notes) return

    const config: StudySessionConfig = {
      duration: duration,
      topic: topic,
      difficulty: difficulty,
      documents: uploadedFiles,
      studyNotes: session.study_notes
    }

    onSessionStart(config)
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'upload': return <Upload className="h-5 w-5" strokeWidth={3} />
      case 'notes': return <Brain className="h-5 w-5" strokeWidth={3} />
      case 'quiz': return <FileText className="h-5 w-5" strokeWidth={3} />
      case 'review': return <CheckCircle className="h-5 w-5" strokeWidth={3} />
      default: return <Clock className="h-5 w-5" strokeWidth={3} />
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'upload': return 'bg-secondary text-secondary-foreground'
      case 'notes': return 'bg-chart-3 text-foreground'
      case 'quiz': return 'bg-primary text-primary-foreground'
      case 'review': return 'bg-destructive text-destructive-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (!session) {
    return (
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Status */}
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getPhaseIcon(session.current_phase)}
            <h3 className="text-xl font-black text-foreground">Study Session</h3>
            <Badge className={`cartoon-border font-black ${getPhaseColor(session.current_phase)}`}>
              {session.current_phase.charAt(0).toUpperCase() + session.current_phase.slice(1)}
            </Badge>
          </div>
          {isHost && (
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              size="sm"
              className="cartoon-border"
            >
              <Settings className="h-4 w-4 mr-1" strokeWidth={3} />
              Settings
            </Button>
          )}
        </div>

        {/* Session Progress */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {['upload', 'notes', 'quiz', 'review'].map((phase, index) => (
              <div
                key={phase}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  session.current_phase === phase
                    ? 'bg-primary/10 border-2 border-primary'
                    : index < ['upload', 'notes', 'quiz', 'review'].indexOf(session.current_phase)
                    ? 'bg-chart-3/10 border border-chart-3'
                    : 'bg-muted/30 border border-muted'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  {getPhaseIcon(phase)}
                </div>
                <div className="text-xs font-black text-foreground capitalize">
                  {phase}
                </div>
              </div>
            ))}
          </div>

          {/* Session Info */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-secondary/50 cartoon-border">
              <div className="text-lg font-black text-foreground">
                {formatTime(session.duration_minutes)}
              </div>
              <div className="text-sm text-muted-foreground font-bold">Duration</div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 cartoon-border">
              <div className="text-lg font-black text-foreground">
                {session.topic || 'Not set'}
              </div>
              <div className="text-sm text-muted-foreground font-bold">Topic</div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 cartoon-border">
              <div className="text-lg font-black text-foreground capitalize">
                {session.difficulty}
              </div>
              <div className="text-sm text-muted-foreground font-bold">Difficulty</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Host Settings */}
      {isHost && showSettings && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <h4 className="text-lg font-black text-foreground mb-4">Session Settings</h4>
          
          <div className="space-y-6">
            {/* Duration Setting */}
            <div>
              <Label className="text-sm font-black text-foreground mb-2 block">
                Study Session Duration: {formatTime(duration)}
              </Label>
              <div className="space-y-2">
                <Slider
                  value={[duration]}
                  onValueChange={(value) => setDuration(value[0])}
                  min={5}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-bold">
                  <span>5m</span>
                  <span>60m</span>
                  <span>120m</span>
                </div>
              </div>
            </div>

            {/* Topic Input */}
            <div>
              <Label className="text-sm font-black text-foreground mb-2 block">
                Study Topic
              </Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, World War II, Calculus..."
                className="cartoon-border"
              />
            </div>

            {/* Difficulty Selection */}
            <div>
              <Label className="text-sm font-black text-foreground mb-2 block">
                Difficulty Level
              </Label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <Button
                    key={level}
                    variant={difficulty === level ? "default" : "outline"}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 cartoon-border ${
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
          </div>
        </Card>
      )}

      {/* Document Upload */}
      {session.current_phase === 'upload' && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="h-6 w-6 text-primary" strokeWidth={3} />
            <h3 className="text-xl font-black text-foreground">Upload Study Materials</h3>
          </div>

          <div className="space-y-4">
            {/* File Upload */}
            <div className="border-4 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.pptx,.ppt"
                onChange={handleFileUpload}
                multiple
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4 cartoon-border">
                  <Upload className="w-8 h-8 text-muted-foreground" strokeWidth={3} />
                </div>
                <p className="text-lg font-black text-foreground mb-2">Click to upload files</p>
                <p className="text-sm text-muted-foreground font-bold">
                  PDF, DOC, TXT, PPT supported • Multiple files allowed
                </p>
              </label>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-foreground">Uploaded Files ({uploadedFiles.length})</h4>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 cartoon-border">
                    <FileText className="h-5 w-5 text-secondary" strokeWidth={3} />
                    <div className="flex-1">
                      <p className="font-black text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground font-bold">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {isHost && (
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Generate Notes Button */}
            {isHost && uploadedFiles.length > 0 && topic.trim() && (
              <Button
                onClick={generateStudyNotes}
                disabled={isGeneratingNotes}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50"
              >
                {isGeneratingNotes ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                    Generating Study Notes...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 mr-2" strokeWidth={3} />
                    Generate Study Notes
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Study Notes Display */}
      {session.current_phase === 'notes' && session.study_notes && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-6 w-6 text-chart-3" strokeWidth={3} />
            <h3 className="text-xl font-black text-foreground">Study Notes</h3>
            <Badge className="cartoon-border bg-chart-3 text-foreground font-black">
              Ready
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-chart-3/10 cartoon-border">
              <h4 className="font-black text-chart-3 mb-2">{session.study_notes.title}</h4>
              <p className="text-muted-foreground font-bold">
                Study notes generated successfully! All members can now review the materials.
              </p>
            </div>

            {isHost && (
              <div className="flex gap-3">
                <Button
                  onClick={startStudySession}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
                >
                  <Play className="h-5 w-5 mr-2" strokeWidth={3} />
                  Start Study Session
                </Button>
                <Button
                  onClick={() => setSession(prev => prev ? { ...prev, current_phase: 'upload' } : null)}
                  variant="outline"
                  className="h-12 cartoon-border cartoon-shadow"
                >
                  <RotateCcw className="h-5 w-5 mr-2" strokeWidth={3} />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Session Controls */}
      {session.current_phase === 'quiz' && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-6 w-6 text-primary" strokeWidth={3} />
            <h3 className="text-xl font-black text-foreground">Study Session Active</h3>
            <Badge className="cartoon-border bg-primary text-primary-foreground font-black">
              {formatTime(Math.floor((session.time_remaining || 0) / 60))}
            </Badge>
          </div>

          <div className="flex gap-3">
            {isHost && (
              <>
                <Button
                  onClick={onSessionPause}
                  variant="outline"
                  className="flex-1 h-12 cartoon-border cartoon-shadow"
                >
                  <Pause className="h-5 w-5 mr-2" strokeWidth={3} />
                  Pause
                </Button>
                <Button
                  onClick={onSessionResume}
                  variant="outline"
                  className="flex-1 h-12 cartoon-border cartoon-shadow"
                >
                  <Play className="h-5 w-5 mr-2" strokeWidth={3} />
                  Resume
                </Button>
                <Button
                  onClick={onSessionReset}
                  variant="outline"
                  className="flex-1 h-12 cartoon-border cartoon-shadow"
                >
                  <RotateCcw className="h-5 w-5 mr-2" strokeWidth={3} />
                  Reset
                </Button>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
