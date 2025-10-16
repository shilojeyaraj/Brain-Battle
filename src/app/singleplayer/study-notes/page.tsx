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

  const handleStartQuiz = () => {
    // Store the quiz questions from notes
    if (notes?.quiz) {
      const quizQuestions = notes.quiz.map((qa, index) => ({
        id: index + 1,
        question: qa.q,
        options: [
          qa.a, // Correct answer
          "Incorrect option 1",
          "Incorrect option 2", 
          "Incorrect option 3"
        ],
        correct: 0,
        explanation: `This is the correct answer based on the study material.`
      }))
      
      sessionStorage.setItem('quizQuestions', JSON.stringify(quizQuestions))
      sessionStorage.setItem('quizTopic', notes.title)
      sessionStorage.setItem('quizDifficulty', 'medium')
      
      // Redirect to quiz
      window.location.href = "/singleplayer/quiz"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-bold">Loading study notes...</p>
        </div>
      </div>
    )
  }

  if (!notes) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Link href="/singleplayer">
              <Button variant="outline" className="cartoon-border cartoon-shadow mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
                Back to Setup
              </Button>
            </Link>
          </div>
          
          <div className="p-8 rounded-xl bg-card cartoon-border cartoon-shadow">
            <h1 className="text-2xl font-black text-foreground mb-4">No Study Notes Found</h1>
            <p className="text-muted-foreground font-bold mb-6">
              It looks like you haven't generated study notes yet. Please go back and upload a document to create study notes.
            </p>
            <Link href="/singleplayer">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black cartoon-border cartoon-shadow cartoon-hover">
                Create Study Notes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="mb-6">
          <Link href="/singleplayer">
            <Button variant="outline" className="cartoon-border cartoon-shadow">
              <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={3} />
              Back to Setup
            </Button>
          </Link>
        </div>
        
        <StudyNotesViewer notes={notes} fileNames={fileNames} onStartQuiz={handleStartQuiz} />
      </div>
    </div>
  )
}
