"use client"

import { useState, useEffect } from "react"
import { StudyNotesViewer } from "@/components/study-notes/study-notes-viewer"
import { StudyNotes } from "@/lib/schemas/notes-schema"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function StudyNotesPage() {
  const [notes, setNotes] = useState<StudyNotes | null>(null)
  const [fileNames, setFileNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load notes from sessionStorage
    const storedNotes = sessionStorage.getItem('studyNotes')
    const storedFileNames = sessionStorage.getItem('processedFileNames')
    
    if (storedNotes) {
      try {
        const parsedNotes = JSON.parse(storedNotes)
        setNotes(parsedNotes)
      } catch (error) {
        console.error("Error parsing stored notes:", error)
      }
    }
    
    if (storedFileNames) {
      try {
        const parsedFileNames = JSON.parse(storedFileNames)
        setFileNames(parsedFileNames)
      } catch (error) {
        console.error("Error parsing stored file names:", error)
      }
    }
    
    setLoading(false)
  }, [])

  const handleStartBattle = () => {
    // Store the battle questions from notes
    if (notes?.practice_questions && notes.practice_questions.length > 0) {
      const battleQuestions = notes.practice_questions.map((qa, index) => ({
        id: index + 1,
        question: qa.question,
        type: qa.type,
        options: qa.options || [qa.answer],
        correct: qa.type === 'multiple_choice' ? 0 : undefined,
        expected_answers: qa.type === 'open_ended' ? [qa.answer] : undefined,
        explanation: qa.explanation,
        difficulty: qa.difficulty,
        topic: qa.topic
      }))
      
      // Generate unique session ID
      const sessionId = crypto.randomUUID()
      
      sessionStorage.setItem('quizQuestions', JSON.stringify(battleQuestions))
      sessionStorage.setItem('quizTopic', notes.title)
      sessionStorage.setItem('quizDifficulty', notes.difficulty_level || 'medium')
      sessionStorage.setItem('quizSessionId', sessionId)
      
      // Redirect to battle page with session ID
      window.location.href = `/singleplayer/battle/${sessionId}`
    } else {
      alert('No practice questions available. Please generate notes first.')
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-100/70 font-bold">Loading study notes...</p>
        </div>
      </div>
    )
  }

  if (!notes) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Link href="/singleplayer">
              <Button variant="outline" className="border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70 mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
                Back to Setup
              </Button>
            </Link>
          </div>
          
          <div className="p-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
            <h1 className="text-2xl font-black text-white mb-4">No Study Notes Found</h1>
            <p className="text-blue-100/70 font-bold mb-6">
              It looks like you haven't generated study notes yet. Please go back and upload a document to create study notes.
            </p>
            <Link href="/singleplayer">
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400">
                Create Study Notes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
      <div className="relative z-10 p-6">
        <div className="mb-6">
          <Link href="/singleplayer">
            <Button variant="outline" className="border-2 border-slate-600/50 bg-slate-700/50 text-blue-100/70 hover:bg-slate-700/70">
              <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
              Back to Setup
            </Button>
          </Link>
        </div>
        
        <StudyNotesViewer notes={notes} fileNames={fileNames} onStartBattle={handleStartBattle} />
      </div>
    </div>
  )
}
