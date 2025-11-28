/**
 * Study Notes Page
 * 
 * SEO-friendly public page for generating study notes from PDFs.
 * Redirects to singleplayer page with notes generation flow.
 * 
 * SEO Benefits:
 * - Indexable URL: /study-notes
 * - Better discoverability for "study notes generator" searches
 */

"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { Brain, FileText, BookOpen, Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRequireAuth } from "@/hooks/use-require-auth"
import { motion } from "framer-motion"

function StudyNotesContent() {
  const router = useRouter()
  const { userId, loading } = useRequireAuth()

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-200 font-bold">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null // Redirecting to login
  }

  const handleGenerateNotes = () => {
    router.push("/singleplayer")
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="mb-8">
            <Link href="/dashboard">
              <Button
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400 shadow-lg hover:shadow-xl hover:shadow-orange-500/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={3} />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center border-4 border-blue-400/50">
                <BookOpen className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <span className="text-4xl font-black bg-gradient-to-r from-blue-300 to-orange-400 bg-clip-text text-transparent">
                STUDY NOTES
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
              Generate AI-Powered Study Notes
            </h1>
            <p className="text-lg text-blue-100/70 font-bold max-w-xl mx-auto">
              Transform your PDF documents into comprehensive study guides with key concepts, summaries, and practice questions
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Features */}
            <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-400" strokeWidth={3} />
                What You'll Get
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: BookOpen,
                    title: "Comprehensive Summaries",
                    description: "Key concepts and main ideas extracted from your documents",
                  },
                  {
                    icon: Brain,
                    title: "Practice Questions",
                    description: "AI-generated questions to test your understanding",
                  },
                  {
                    icon: FileText,
                    title: "Organized Sections",
                    description: "Well-structured notes with clear headings and topics",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-4 p-4 rounded-xl bg-slate-700/30 border-2 border-slate-600/30"
                    >
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-blue-400/50 flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-blue-100/70 font-bold">{item.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* CTA */}
            <Card className="p-8 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-4 border-blue-400/50 shadow-lg">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white mb-4">
                  Ready to Generate Your Notes?
                </h2>
                <p className="text-blue-100/80 font-bold mb-6">
                  Start by uploading your PDF documents
                </p>
                <Button
                  onClick={handleGenerateNotes}
                  className="h-14 px-8 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg border-4 border-blue-400/50"
                >
                  <BookOpen className="w-5 h-5 mr-2" strokeWidth={3} />
                  Generate Study Notes
                  <ArrowRight className="w-5 h-5 ml-2" strokeWidth={3} />
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function StudyNotesPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      }
    >
      <StudyNotesContent />
    </Suspense>
  )
}

