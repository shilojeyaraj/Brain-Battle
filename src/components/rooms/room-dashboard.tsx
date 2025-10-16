"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Copy, Share2, Settings, Users, Play, MessageSquare } from 'lucide-react'
import MemberList from '@/components/realtime/member-list'

interface Room {
  id: string
  name: string
  code: string
  host_id: string
  max_players: number
  is_active: boolean
  created_at: string
}

interface RoomDashboardProps {
  roomId: string
  currentUserId: string
}

export default function RoomDashboard({ roomId, currentUserId }: RoomDashboardProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [memberCount, setMemberCount] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadRoom()
  }, [roomId])

  const loadRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (error) {
        console.error('Error loading room:', error)
        return
      }

      setRoom(data)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading room:', error)
      setIsLoading(false)
    }
  }

  const copyRoomCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code)
      // You could add a toast notification here
    }
  }

  const shareRoom = () => {
    if (room?.code) {
      const shareUrl = `${window.location.origin}/join?code=${room.code}`
      navigator.clipboard.writeText(shareUrl)
      setShowShareModal(true)
      setTimeout(() => setShowShareModal(false), 2000)
    }
  }

  const startGame = async () => {
    // Implement game start logic
    console.log('Starting game...')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </Card>
      </div>
    )
  }

  if (!room) {
    return (
      <Card className="p-6 bg-card cartoon-border cartoon-shadow text-center">
        <h2 className="text-xl font-black text-foreground mb-2">Room Not Found</h2>
        <p className="text-muted-foreground font-bold">This room doesn't exist or you don't have access to it.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Room Header */}
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-2">{room.name}</h1>
            <div className="flex items-center gap-4">
              <Badge className="cartoon-border bg-primary text-primary-foreground font-black">
                Code: {room.code}
              </Badge>
              <Badge className={`cartoon-border font-black ${
                room.is_active 
                  ? 'bg-chart-3 text-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {room.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={copyRoomCode}
              variant="outline"
              size="sm"
              className="cartoon-border"
            >
              <Copy className="h-4 w-4 mr-1" strokeWidth={3} />
              Copy Code
            </Button>
            <Button
              onClick={shareRoom}
              variant="outline"
              size="sm"
              className="cartoon-border"
            >
              <Share2 className="h-4 w-4 mr-1" strokeWidth={3} />
              Share
            </Button>
            {room.host_id === currentUserId && (
              <Button
                variant="outline"
                size="sm"
                className="cartoon-border"
              >
                <Settings className="h-4 w-4 mr-1" strokeWidth={3} />
                Settings
              </Button>
            )}
          </div>
        </div>

        {/* Room Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-secondary/50 cartoon-border">
            <Users className="h-6 w-6 text-primary mx-auto mb-2" strokeWidth={3} />
            <div className="text-lg font-black text-foreground">{memberCount}</div>
            <div className="text-sm text-muted-foreground font-bold">Members</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50 cartoon-border">
            <div className="text-lg font-black text-foreground">{room.max_players}</div>
            <div className="text-sm text-muted-foreground font-bold">Max Players</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50 cartoon-border">
            <div className="text-lg font-black text-foreground">
              {room.is_active ? 'Ready' : 'Waiting'}
            </div>
            <div className="text-sm text-muted-foreground font-bold">Status</div>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member List */}
        <div className="lg:col-span-1">
          <MemberList
            roomId={roomId}
            currentUserId={currentUserId}
            onMemberCountChange={setMemberCount}
          />
        </div>

        {/* Game Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game Status */}
          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Play className="h-6 w-6 text-primary" strokeWidth={3} />
              <h3 className="text-xl font-black text-foreground">Game Status</h3>
            </div>
            
            {memberCount < 2 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
                <h4 className="font-black text-foreground mb-2">Waiting for Players</h4>
                <p className="text-muted-foreground font-bold mb-4">
                  Need at least 2 players to start the game
                </p>
                <p className="text-sm text-muted-foreground">
                  Share the room code with friends to invite them!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-chart-3/10 cartoon-border">
                  <h4 className="font-black text-chart-3 mb-2">Ready to Start!</h4>
                  <p className="text-muted-foreground font-bold">
                    All players are ready. The host can start the game.
                  </p>
                </div>
                
                {room.host_id === currentUserId && (
                  <Button
                    onClick={startGame}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
                  >
                    <Play className="h-5 w-5 mr-2" strokeWidth={3} />
                    Start Game
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Chat (Optional) */}
          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-6 w-6 text-secondary" strokeWidth={3} />
              <h3 className="text-xl font-black text-foreground">Chat</h3>
            </div>
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
              <p className="text-muted-foreground font-bold">Chat feature coming soon!</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-card cartoon-border cartoon-shadow max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-chart-3/10 flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-8 w-8 text-chart-3" strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black text-foreground mb-2">Room Shared!</h3>
              <p className="text-muted-foreground font-bold mb-4">
                The room link has been copied to your clipboard.
              </p>
              <Button
                onClick={() => setShowShareModal(false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black cartoon-border cartoon-shadow"
              >
                Got it!
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
