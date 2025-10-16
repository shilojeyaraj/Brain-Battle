"use client"

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Send, 
  User, 
  Crown, 
  Bot,
  Settings,
  BookOpen,
  Brain,
  FileText
} from 'lucide-react'

interface ChatMessage {
  id: string
  user_id: string
  username: string
  is_host: boolean
  message: string
  message_type: 'text' | 'study_request' | 'quiz_request' | 'system'
  created_at: string
  metadata?: {
    topic?: string
    difficulty?: string
    question_type?: string
    documents?: string[]
  }
}

interface RoomChatProps {
  roomId: string
  currentUserId: string
  isHost: boolean
  onStudyRequest?: (request: StudyRequest) => void
  onQuizRequest?: (request: QuizRequest) => void
}

interface StudyRequest {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  documents: string[]
  message: string
}

interface QuizRequest {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  question_type: 'multiple_choice' | 'fill_blank' | 'both'
  documents: string[]
  message: string
}

export default function RoomChat({ 
  roomId, 
  currentUserId, 
  isHost, 
  onStudyRequest, 
  onQuizRequest 
}: RoomChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load chat messages
  useEffect(() => {
    loadMessages()
  }, [roomId])

  // Set up real-time chat subscription
  useEffect(() => {
    if (!roomId) return

    const chatChannel = supabase
      .channel(`room_chat_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(chatChannel)
    }
  }, [roomId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          user_id,
          message,
          message_type,
          created_at,
          metadata,
          profiles:user_id (
            username
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      const formattedMessages: ChatMessage[] = data.map(msg => ({
        id: msg.id,
        user_id: msg.user_id,
        username: msg.profiles?.username || 'Unknown User',
        is_host: false, // You might want to check this from room data
        message: msg.message,
        message_type: msg.message_type,
        created_at: msg.created_at,
        metadata: msg.metadata
      }))

      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: currentUserId,
          message: newMessage.trim(),
          message_type: 'text'
        })

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendStudyRequest = async (topic: string, difficulty: string) => {
    if (!topic.trim()) return

    const studyRequest: StudyRequest = {
      topic: topic.trim(),
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      documents: [], // Will be populated from uploaded files
      message: `I want to study: ${topic} (${difficulty} difficulty)`
    }

    // Send as special message
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: currentUserId,
          message: studyRequest.message,
          message_type: 'study_request',
          metadata: {
            topic: studyRequest.topic,
            difficulty: studyRequest.difficulty
          }
        })

      if (error) {
        console.error('Error sending study request:', error)
        return
      }

      onStudyRequest?.(studyRequest)
    } catch (error) {
      console.error('Error sending study request:', error)
    }
  }

  const sendQuizRequest = async (topic: string, difficulty: string, questionType: string) => {
    if (!topic.trim()) return

    const quizRequest: QuizRequest = {
      topic: topic.trim(),
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      question_type: questionType as 'multiple_choice' | 'fill_blank' | 'both',
      documents: [], // Will be populated from uploaded files
      message: `I want a quiz on: ${topic} (${difficulty} difficulty, ${questionType} questions)`
    }

    // Send as special message
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: currentUserId,
          message: quizRequest.message,
          message_type: 'quiz_request',
          metadata: {
            topic: quizRequest.topic,
            difficulty: quizRequest.difficulty,
            question_type: quizRequest.question_type
          }
        })

      if (error) {
        console.error('Error sending quiz request:', error)
        return
      }

      onQuizRequest?.(quizRequest)
    } catch (error) {
      console.error('Error sending quiz request:', error)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'study_request': return <BookOpen className="h-4 w-4" strokeWidth={3} />
      case 'quiz_request': return <Brain className="h-4 w-4" strokeWidth={3} />
      case 'system': return <Bot className="h-4 w-4" strokeWidth={3} />
      default: return <User className="h-4 w-4" strokeWidth={3} />
    }
  }

  const getMessageColor = (messageType: string) => {
    switch (messageType) {
      case 'study_request': return 'bg-chart-3/10 border-chart-3/30'
      case 'quiz_request': return 'bg-primary/10 border-primary/30'
      case 'system': return 'bg-secondary/10 border-secondary/30'
      default: return 'bg-card border-border'
    }
  }

  return (
    <Card className="p-6 bg-card cartoon-border cartoon-shadow h-[600px] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="h-6 w-6 text-primary" strokeWidth={3} />
        <h3 className="text-xl font-black text-foreground">Room Chat</h3>
        <Badge className="cartoon-border bg-primary text-primary-foreground font-black">
          Live
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg cartoon-border ${getMessageColor(message.message_type)} ${
              message.user_id === currentUserId ? 'ml-8' : 'mr-8'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {getMessageIcon(message.message_type)}
              <span className="font-black text-foreground text-sm">
                {message.username}
              </span>
              {message.is_host && (
                <Crown className="h-4 w-4 text-yellow-500" strokeWidth={3} />
              )}
              <span className="text-xs text-muted-foreground font-bold">
                {formatTime(message.created_at)}
              </span>
            </div>
            
            <p className="text-foreground font-bold">{message.message}</p>
            
            {/* Message metadata */}
            {message.metadata && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.metadata.topic && (
                  <Badge className="cartoon-border bg-secondary text-secondary-foreground font-bold text-xs">
                    Topic: {message.metadata.topic}
                  </Badge>
                )}
                {message.metadata.difficulty && (
                  <Badge className="cartoon-border bg-primary text-primary-foreground font-bold text-xs">
                    {message.metadata.difficulty}
                  </Badge>
                )}
                {message.metadata.question_type && (
                  <Badge className="cartoon-border bg-chart-3 text-foreground font-bold text-xs">
                    {message.metadata.question_type}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
            <p className="text-muted-foreground font-bold">No messages yet</p>
            <p className="text-sm text-muted-foreground">Start the conversation!</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions for Host */}
      {isHost && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 cartoon-border">
          <h4 className="font-black text-foreground mb-2">Quick Actions</h4>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => sendStudyRequest('Photosynthesis', 'medium')}
              variant="outline"
              size="sm"
              className="cartoon-border"
            >
              <BookOpen className="h-4 w-4 mr-1" strokeWidth={3} />
              Study: Photosynthesis
            </Button>
            <Button
              onClick={() => sendQuizRequest('Calculus', 'medium', 'both')}
              variant="outline"
              size="sm"
              className="cartoon-border"
            >
              <Brain className="h-4 w-4 mr-1" strokeWidth={3} />
              Quiz: Calculus
            </Button>
            <Button
              onClick={() => sendStudyRequest('World War II', 'easy')}
              variant="outline"
              size="sm"
              className="cartoon-border"
            >
              <BookOpen className="h-4 w-4 mr-1" strokeWidth={3} />
              Study: WW2
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 cartoon-border"
        />
        <Button
          onClick={sendMessage}
          disabled={isLoading || !newMessage.trim()}
          className="cartoon-border cartoon-shadow"
        >
          <Send className="h-4 w-4" strokeWidth={3} />
        </Button>
      </div>
    </Card>
  )
}
