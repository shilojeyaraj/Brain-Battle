"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Users, Lock, Globe, LogIn, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const activeLobbies: any[] = [
  // Empty array - no active lobbies yet
  // In the future, this will fetch real lobbies from the database       
]

export function LobbySection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateLobby = () => {
    console.log("Create Lobby button clicked!")
    console.log("Current URL:", window.location.href)
    console.log("Attempting to navigate to /create-room")
    try {
      router.push("/create-room")
      console.log("Navigation command sent successfully")
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  const handleJoinLobby = () => {
    console.log("Join Lobby button clicked!")
    console.log("Attempting to navigate to /join-room")
    try {
      router.push("/join-room")
      console.log("Navigation command sent successfully")
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  const handleStartSingleplayer = () => {
    console.log("Start Singleplayer Battle button clicked!")
    try {
      router.push("/singleplayer")
      console.log("Navigation to singleplayer sent successfully")
    } catch (error) {
      console.error("Navigation error:", error)
    }
  }

  if (!mounted) {
    return (
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="h-10 bg-muted rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 bg-card cartoon-border cartoon-shadow" data-tutorial="lobby-section">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-black text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Battle Lobbies
          </h2>
          <p className="text-base text-muted-foreground font-bold">Join or create a study battle</p>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={handleStartSingleplayer}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
            type="button"
            data-tutorial="singleplayer-button"
          >
            <Zap className="h-6 w-6 mr-3" strokeWidth={3} />
            Singleplayer
          </Button>
          <Button 
            onClick={handleJoinLobby}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
            type="button"
            data-tutorial="join-lobby-button"
          >
            <LogIn className="h-6 w-6 mr-3" strokeWidth={3} />
            Join Lobby
          </Button>
          <Button 
            onClick={handleCreateLobby}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
            type="button"
            data-tutorial="create-lobby-button"
          >
            <Plus className="h-6 w-6 mr-3" strokeWidth={3} />
            Create Lobby
          </Button>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" strokeWidth={3} />
        <Input
          placeholder="Search lobbies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-14 h-14 text-xl font-bold cartoon-border bg-card"
        />
      </div>

      <div className="space-y-6">
        {activeLobbies.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center mx-auto mb-6 cartoon-border">
              <Users className="w-10 h-10 text-muted-foreground" strokeWidth={3} />
            </div>
                <h3 className="text-2xl font-black text-foreground mb-3">No active lobbies!</h3>
                <p className="text-lg text-muted-foreground font-bold mb-8">Be the first to create a study battle and invite your friends.</p>
                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={handleJoinLobby}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
                    type="button"
                  >
                    <LogIn className="h-6 w-6 mr-3" strokeWidth={3} />
                    Join Lobby
                  </Button>
                  <Button 
                    onClick={handleCreateLobby}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl px-8 py-4 cartoon-border cartoon-shadow cartoon-hover cursor-pointer"
                    type="button"
                  >
                    <Plus className="h-6 w-6 mr-3" strokeWidth={3} />
                    Create First Lobby
                  </Button>
                </div>
          </div>
        ) : (
          activeLobbies.map((lobby) => (
          <div
            key={lobby.id}
            className="p-6 rounded-xl bg-card border-4 border-border hover:border-primary transition-all duration-300 cartoon-hover group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-black text-foreground text-xl group-hover:text-primary transition-colors">
                    {lobby.name}
                  </h3>
                  {lobby.isPrivate ? (
                    <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={3} />
                  ) : (
                    <Globe className="h-5 w-5 text-accent" strokeWidth={3} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-bold">
                  Hosted by <span className="text-foreground font-black">{lobby.host}</span>
                </p>
              </div>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black cartoon-border cartoon-shadow cartoon-hover"
              >
                Join Battle
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="cartoon-border bg-secondary text-secondary-foreground font-black">
                {lobby.subject}
              </Badge>
              <Badge
                className={`cartoon-border font-black ${
                  lobby.difficulty === "Hard"
                    ? "bg-destructive text-destructive-foreground"
                    : lobby.difficulty === "Medium"
                    ? "bg-primary text-primary-foreground"
                    : "bg-chart-3 text-foreground"
                }`}
              >
                {lobby.difficulty}
              </Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                <Users className="h-5 w-5" strokeWidth={3} />
                <span className="font-black text-foreground">
                  {lobby.players}/{lobby.maxPlayers}
                </span>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </Card>
  )
}