"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bot, Send, MessageCircle, Lightbulb, Target, BookOpen, Zap, X } from "lucide-react"

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface StudyContext {
  studyFocus: string
  quizPreferences: string
  questionTypes: string[]
  difficulty: string
  specialInstructions: string
}

interface StudyContextChatbotProps {
  onContextUpdate: (context: StudyContext) => void
  uploadedFiles: File[]
}

export function StudyContextChatbot({ onContextUpdate, uploadedFiles }: StudyContextChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your study assistant. I can help you get the most out of your uploaded documents by understanding what you want to focus on. What would you like to study and be quizzed on?",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [context, setContext] = useState<StudyContext>({
    studyFocus: "",
    quizPreferences: "",
    questionTypes: [],
    difficulty: "",
    specialInstructions: ""
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateAssistantResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()
    
    // Check for study focus
    if (lowerMessage.includes('study') || lowerMessage.includes('learn') || lowerMessage.includes('focus')) {
      setContext(prev => ({ ...prev, studyFocus: userMessage }))
      return "Great! I understand you want to focus on that topic. What type of questions would you prefer? Multiple choice, fill-in-the-blank, or both? Also, what difficulty level are you aiming for - easy, medium, or hard?"
    }
    
    // Check for question types
    if (lowerMessage.includes('multiple choice') || lowerMessage.includes('fill in') || lowerMessage.includes('both')) {
      const questionTypes: string[] = []
      if (lowerMessage.includes('multiple choice')) questionTypes.push('multiple_choice')
      if (lowerMessage.includes('fill in') || lowerMessage.includes('fill-in')) questionTypes.push('open_ended')
      if (lowerMessage.includes('both')) {
        questionTypes.push('multiple_choice', 'open_ended')
      }
      setContext(prev => ({ ...prev, questionTypes }))
      return "Perfect! I'll make sure to generate those types of questions. Any specific areas within your documents that you want me to emphasize? For example, formulas, key concepts, or practical applications?"
    }
    
    // Check for difficulty
    if (lowerMessage.includes('easy') || lowerMessage.includes('medium') || lowerMessage.includes('hard')) {
      const difficulty = lowerMessage.includes('easy') ? 'easy' : 
                        lowerMessage.includes('hard') ? 'hard' : 'medium'
      setContext(prev => ({ ...prev, difficulty }))
      return "Got it! I'll tailor the questions to that difficulty level. Do you have any special instructions or specific learning objectives you'd like me to keep in mind when generating your study materials?"
    }
    
    // Check for special instructions
    if (lowerMessage.includes('emphasize') || lowerMessage.includes('focus on') || lowerMessage.includes('important')) {
      setContext(prev => ({ ...prev, specialInstructions: userMessage }))
      return "Excellent! I'll make sure to emphasize those areas. Is there anything else you'd like me to know about your learning preferences or the specific content you want to master?"
    }
    
    // Default response
    return "That's helpful information! Can you tell me more about what specific topics or concepts from your documents you'd like to focus on? This will help me create better study notes and quiz questions for you."
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate typing delay
    setTimeout(() => {
      const assistantResponse = generateAssistantResponse(inputValue)
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
      
      // Update parent component with context
      onContextUpdate(context)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getContextSummary = () => {
    const parts = []
    if (context.studyFocus) parts.push(`Focus: ${context.studyFocus}`)
    if (context.questionTypes.length > 0) parts.push(`Questions: ${context.questionTypes.join(', ')}`)
    if (context.difficulty) parts.push(`Difficulty: ${context.difficulty}`)
    if (context.specialInstructions) parts.push(`Special: ${context.specialInstructions}`)
    return parts
  }

  const quickSuggestions = [
    "I want to focus on the main concepts and key formulas",
    "Generate both multiple choice and fill-in-the-blank questions",
    "Make the questions medium difficulty with practical applications",
    "Emphasize the most important topics for exams"
  ]

  return (
    <div className="mt-6">
      {/* Chatbot Toggle Button */}
      <div className="flex items-center justify-center mb-4">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          className="cartoon-border cartoon-shadow hover:bg-primary/10"
        >
          <Bot className="h-4 w-4 mr-2" strokeWidth={3} />
          {isOpen ? "Hide" : "Show"} Study Assistant
          {getContextSummary().length > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground">
              {getContextSummary().length} preferences set
            </Badge>
          )}
        </Button>
      </div>

      {/* Chatbot Interface */}
      {isOpen && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center cartoon-border">
                <Bot className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
              </div>
              <div>
                <h3 className="font-black text-foreground">Study Assistant</h3>
                <p className="text-sm text-muted-foreground font-bold">Tell me about your learning goals</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground font-bold mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  onClick={() => setInputValue(suggestion)}
                  variant="outline"
                  size="sm"
                  className="text-xs cartoon-border"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto border rounded-xl p-4 mb-4 bg-muted/20">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  } cartoon-border`}
                >
                  <p className="text-sm font-bold">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-secondary text-secondary-foreground p-3 rounded-xl cartoon-border">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tell me what you want to study and be quizzed on..."
              className="flex-1 cartoon-border"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="cartoon-border cartoon-shadow"
            >
              <Send className="h-4 w-4" strokeWidth={3} />
            </Button>
          </div>

          {/* Context Summary */}
          {getContextSummary().length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" strokeWidth={3} />
                <p className="text-sm font-black text-primary">Your Study Preferences:</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getContextSummary().map((item, index) => (
                  <Badge key={index} className="bg-primary/20 text-primary border-primary/30">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
