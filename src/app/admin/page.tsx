"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFeedback } from "@/hooks/useFeedback"
import { Zap, Users, FileText, Settings } from "lucide-react"

export default function AdminPage() {
  const router = useRouter()
  const { playClick, playHover } = useFeedback()
  const [loading, setLoading] = useState<string | null>(null)

  const handleTestSingleplayer = async () => {
    playClick()
    setLoading("singleplayer")
    
    try {
      // Generate a test session ID (using timestamp for uniqueness)
      const testSessionId = `test-${Date.now()}`
      
      // Redirect directly to battle page with test session
      router.push(`/singleplayer/battle/${testSessionId}?admin=true`)
    } catch (error) {
      console.error("Error starting test singleplayer:", error)
      setLoading(null)
    }
  }

  const handleTestMultiplayer = async () => {
    playClick()
    setLoading("multiplayer")
    
    try {
      // Generate a test room ID
      const testRoomId = `test-room-${Date.now()}`
      
      // Redirect to test room
      router.push(`/room/${testRoomId}?admin=true`)
    } catch (error) {
      console.error("Error starting test multiplayer:", error)
      setLoading(null)
    }
  }

  const handleTestNotes = async () => {
    playClick()
    setLoading("notes")
    
    try {
      // Redirect to singleplayer page for notes testing
      router.push("/singleplayer?admin=true")
    } catch (error) {
      console.error("Error opening notes test:", error)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
            <Settings className="h-10 w-10 text-orange-400" strokeWidth={3} />
            Admin Testing Panel
          </h1>
          <p className="text-slate-400 font-bold">
            Quick access to test features without normal delays or ID generation
          </p>
        </div>

        {/* Warning Banner */}
        <Card className="bg-yellow-500/20 border-4 border-yellow-400/50 p-4 mb-8">
          <p className="text-yellow-200 font-black text-sm">
            ⚠️ ADMIN MODE: This page is for testing only. Features may behave differently than in production.
          </p>
        </Card>

        {/* Test Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Singleplayer Battle */}
          <Card className="bg-slate-800/50 border-4 border-slate-600/50 p-6 hover:border-orange-400/50 transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Zap className="h-8 w-8 text-orange-400" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white mb-2">Test Singleplayer Battle</h2>
                <p className="text-slate-300 font-bold text-sm mb-4">
                  Start a singleplayer battle instantly with a test session ID. 
                  Skips normal file upload and generation delays.
                </p>
                <Button
                  onClick={handleTestSingleplayer}
                  onMouseEnter={playHover}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400 shadow-lg hover:shadow-xl hover:shadow-orange-500/50"
                  loading={loading === "singleplayer"}
                  loadingText="Starting Test Battle..."
                >
                  Start Test Singleplayer
                </Button>
              </div>
            </div>
          </Card>

          {/* Multiplayer Battle */}
          <Card className="bg-slate-800/50 border-4 border-slate-600/50 p-6 hover:border-blue-400/50 transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-8 w-8 text-blue-400" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white mb-2">Test Multiplayer Battle</h2>
                <p className="text-slate-300 font-bold text-sm mb-4">
                  Create a test multiplayer room instantly. 
                  Bypasses normal room creation flow.
                </p>
                <Button
                  onClick={handleTestMultiplayer}
                  onMouseEnter={playHover}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400 shadow-lg hover:shadow-xl hover:shadow-blue-500/50"
                  loading={loading === "multiplayer"}
                  loadingText="Creating Test Room..."
                >
                  Start Test Multiplayer
                </Button>
              </div>
            </div>
          </Card>

          {/* Notes Testing */}
          <Card className="bg-slate-800/50 border-4 border-slate-600/50 p-6 hover:border-green-400/50 transition-all md:col-span-2">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <FileText className="h-8 w-8 text-green-400" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-white mb-2">Test Notes & File Upload</h2>
                <p className="text-slate-300 font-bold text-sm mb-4">
                  Test the notes generation and file upload features with admin shortcuts.
                  Includes diagram extraction testing.
                </p>
                <Button
                  onClick={handleTestNotes}
                  onMouseEnter={playHover}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black border-2 border-green-400 shadow-lg hover:shadow-xl hover:shadow-green-500/50"
                  loading={loading === "notes"}
                  loadingText="Opening Notes Test..."
                >
                  Test Notes Generation
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="bg-slate-800/30 border-4 border-slate-600/30 p-6 mt-8">
          <h3 className="text-xl font-black text-white mb-4">Admin Mode Features</h3>
          <ul className="space-y-2 text-slate-300 font-bold">
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-black">•</span>
              <span>Test sessions use <code className="bg-slate-700/50 px-2 py-1 rounded">test-*</code> IDs for easy identification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-black">•</span>
              <span>Bypasses normal validation and rate limiting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-black">•</span>
              <span>Faster processing with reduced delays</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-black">•</span>
              <span>All features accessible for testing diagram extraction, quiz generation, etc.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

