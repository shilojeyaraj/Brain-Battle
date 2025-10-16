"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Users, UserPlus, UserMinus, Crown, Clock } from 'lucide-react'

interface Member {
  id: string
  username: string
  avatar?: string
  is_host: boolean
  joined_at: string
  is_online: boolean
  last_seen?: string
}

interface MemberListProps {
  roomId: string
  currentUserId: string
  onMemberCountChange?: (count: number) => void
}

export default function MemberList({ roomId, currentUserId, onMemberCountChange }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<string[]>([])
  const supabase = createClient()

  // Load initial members
  useEffect(() => {
    loadMembers()
  }, [roomId])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!roomId) return

    // Subscribe to room_members table changes
    const membersChannel = supabase
      .channel(`room_members_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Member change detected:', payload)
          handleMemberChange(payload)
        }
      )
      .subscribe()

    // Subscribe to user presence
    const presenceChannel = supabase
      .channel(`room_presence_${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        updateMemberPresence(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
        addActivity(`${newPresences[0]?.username || 'Someone'} joined the room`)
        updateMemberPresence(presenceChannel.presenceState())
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
        addActivity(`${leftPresences[0]?.username || 'Someone'} left the room`)
        updateMemberPresence(presenceChannel.presenceState())
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          await presenceChannel.track({
            user_id: currentUserId,
            username: 'Current User', // You might want to get this from user data
            joined_at: new Date().toISOString(),
            online: true
          })
        }
      })

    return () => {
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [roomId, currentUserId])

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('room_members')
        .select(`
          id,
          user_id,
          is_host,
          joined_at,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true })

      if (error) {
        console.error('Error loading members:', error)
        return
      }

      const formattedMembers: Member[] = data.map(member => ({
        id: member.id,
        username: member.profiles?.username || 'Unknown User',
        avatar: member.profiles?.avatar_url,
        is_host: member.is_host,
        joined_at: member.joined_at,
        is_online: true // Will be updated by presence
      }))

      setMembers(formattedMembers)
      onMemberCountChange?.(formattedMembers.length)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading members:', error)
      setIsLoading(false)
    }
  }

  const handleMemberChange = async (payload: any) => {
    console.log('Handling member change:', payload.eventType)
    
    if (payload.eventType === 'INSERT') {
      // New member joined
      const newMember = payload.new
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', newMember.user_id)
        .single()

      const member: Member = {
        id: newMember.id,
        username: profile?.username || 'Unknown User',
        avatar: profile?.avatar_url,
        is_host: newMember.is_host,
        joined_at: newMember.joined_at,
        is_online: true
      }

      setMembers(prev => [...prev, member])
      onMemberCountChange?.(members.length + 1)
      addActivity(`${member.username} joined the room`)
    } else if (payload.eventType === 'DELETE') {
      // Member left
      const leftMember = payload.old
      setMembers(prev => {
        const updated = prev.filter(m => m.id !== leftMember.id)
        onMemberCountChange?.(updated.length)
        return updated
      })
      addActivity(`${leftMember.username || 'Someone'} left the room`)
    } else if (payload.eventType === 'UPDATE') {
      // Member updated (e.g., host status changed)
      const updatedMember = payload.new
      setMembers(prev => prev.map(m => 
        m.id === updatedMember.id 
          ? { ...m, is_host: updatedMember.is_host }
          : m
      ))
    }
  }

  const updateMemberPresence = (presenceState: any) => {
    const onlineUserIds = Object.keys(presenceState)
    
    setMembers(prev => prev.map(member => ({
      ...member,
      is_online: onlineUserIds.includes(member.id)
    })))
  }

  const addActivity = (activity: string) => {
    setRecentActivity(prev => [
      `${new Date().toLocaleTimeString()}: ${activity}`,
      ...prev.slice(0, 4) // Keep only last 5 activities
    ])
  }

  const formatJoinTime = (joinedAt: string) => {
    const now = new Date()
    const joined = new Date(joinedAt)
    const diffMs = now.getTime() - joined.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return joined.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Card className="p-4 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary" strokeWidth={3} />
          <h3 className="font-black text-foreground">Members</h3>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
        <p className="text-muted-foreground font-bold">Loading members...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Member List */}
      <Card className="p-4 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" strokeWidth={3} />
            <h3 className="font-black text-foreground">Members</h3>
            <Badge className="cartoon-border bg-primary text-primary-foreground font-black">
              {members.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold">
            <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
            Live
          </div>
        </div>

        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                member.is_online 
                  ? 'bg-secondary/30 border border-chart-3/30' 
                  : 'bg-muted/30 border border-muted'
              }`}
            >
              <div className="relative">
                <Avatar className="w-10 h-10 cartoon-border">
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-black text-primary">
                      {member.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </Avatar>
                {member.is_online && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-chart-3 rounded-full border-2 border-background"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-foreground truncate">
                    {member.username}
                  </span>
                  {member.is_host && (
                    <Crown className="h-4 w-4 text-yellow-500" strokeWidth={3} />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                  <Clock className="h-3 w-3" strokeWidth={3} />
                  {formatJoinTime(member.joined_at)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {member.is_online ? (
                  <Badge className="cartoon-border bg-chart-3 text-foreground font-bold text-xs">
                    Online
                  </Badge>
                ) : (
                  <Badge className="cartoon-border bg-muted text-muted-foreground font-bold text-xs">
                    Offline
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1} />
              <p className="text-muted-foreground font-bold">No members yet</p>
              <p className="text-sm text-muted-foreground">Invite friends to join!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card className="p-4 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-3">
            <UserPlus className="h-5 w-5 text-secondary" strokeWidth={3} />
            <h4 className="font-black text-foreground">Recent Activity</h4>
          </div>
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div key={index} className="text-sm text-muted-foreground font-bold">
                {activity}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
