"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  Crown, 
  Shield, 
  User, 
  Copy, 
  Check, 
  LogOut,
  Loader2,
  AlertCircle,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { useFeedback } from "@/hooks/useFeedback"
import { motion } from "framer-motion"

interface ClanMember {
  user_id: string
  username: string
  avatar_url: string | null
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  stats: {
    xp: number
    level: number
    total_wins: number
    total_games: number
    accuracy: number
  }
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  xp: number
  level: number
  total_wins: number
  total_games: number
  accuracy: number
  correct_answers: number
  total_questions: number
}

interface Clan {
  id: string
  name: string
  description: string | null
  code: string
  is_private: boolean
  max_members: number
  member_count: number
  role: 'owner' | 'admin' | 'member'
  is_owner: boolean
}

function ClanDetailContent() {
  const params = useParams()
  const router = useRouter()
  const clanId = params.id as string
  
  const [clan, setClan] = useState<Clan | null>(null)
  const [members, setMembers] = useState<ClanMember[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'leaderboard'>('members')
  const [copiedCode, setCopiedCode] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const { playClick } = useFeedback()

  useEffect(() => {
    if (clanId) {
      fetchClanData()
    }
  }, [clanId])

  const fetchClanData = async () => {
    try {
      // Fetch clan info from list
      const listResponse = await fetch('/api/clans/list')
      if (listResponse.ok) {
        const listData = await listResponse.json()
        if (listData.success) {
          const foundClan = listData.clans.find((c: Clan) => c.id === clanId)
          if (foundClan) {
            setClan(foundClan)
          }
        }
      }

      // Fetch members
      const membersResponse = await fetch(`/api/clans/members?clan_id=${clanId}`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        if (membersData.success) {
          setMembers(membersData.members || [])
        }
      }

      // Fetch leaderboard
      const statsResponse = await fetch(`/api/clans/stats?clan_id=${clanId}`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setLeaderboard(statsData.leaderboard || [])
        }
      }
    } catch (error) {
      console.error('Error fetching clan data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (!clan) return
    playClick()
    navigator.clipboard.writeText(clan.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleLeaveClan = async () => {
    if (!clan) return
    if (!confirm('Are you sure you want to leave this clan?')) return

    setLeaving(true)
    playClick()

    try {
      const response = await fetch('/api/clans/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clan_id: clanId }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        router.push('/dashboard')
      } else {
        alert(data.error || 'Failed to leave clan')
        setLeaving(false)
      }
    } catch (error) {
      console.error('Error leaving clan:', error)
      alert('An error occurred while leaving the clan')
      setLeaving(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-orange-400" strokeWidth={3} />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-400" strokeWidth={3} />
      default:
        return <User className="h-4 w-4 text-slate-400" strokeWidth={3} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" strokeWidth={3} />
      </div>
    )
  }

  if (!clan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" strokeWidth={3} />
          <h2 className="text-2xl font-black text-white mb-2">Clan Not Found</h2>
          <p className="text-slate-400 mb-6">This clan doesn't exist or you don't have access to it.</p>
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400">
              <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="container mx-auto px-6 py-12">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="mb-6 text-blue-300 hover:text-blue-200 font-bold"
          >
            <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
            Back to Dashboard
          </Button>
        </Link>

        {/* Clan Header */}
        <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-black text-white">{clan.name}</h1>
                {getRoleIcon(clan.role)}
                {clan.role === 'owner' && (
                  <Badge className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 border-orange-400/50 font-black">
                    Owner
                  </Badge>
                )}
                {clan.role === 'admin' && (
                  <Badge className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-400/50 font-black">
                    Admin
                  </Badge>
                )}
              </div>
              {clan.description && (
                <p className="text-slate-300/70 font-bold mb-4">{clan.description}</p>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-blue-300/70">
                  <Users className="h-5 w-5" strokeWidth={3} />
                  <span className="font-bold">
                    {clan.member_count} / {clan.max_members} members
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">Join Code:</span>
                  <code className="px-3 py-1 bg-slate-800/50 rounded border border-slate-600/50 text-orange-300 font-black text-lg tracking-widest">
                    {clan.code}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    {copiedCode ? (
                      <Check className="h-5 w-5 text-green-400" strokeWidth={3} />
                    ) : (
                      <Copy className="h-5 w-5 text-slate-400" strokeWidth={3} />
                    )}
                  </button>
                </div>
              </div>
            </div>
            {clan.role !== 'owner' && (
              <Button
                onClick={handleLeaveClan}
                disabled={leaving}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black border-2 border-red-400"
              >
                {leaving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={3} />
                    Leaving...
                  </>
                ) : (
                  <>
                    <LogOut className="h-5 w-5 mr-2" strokeWidth={3} />
                    Leave Clan
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => {
              playClick()
              setActiveTab('members')
            }}
            className={`flex-1 font-black ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-2 border-blue-400'
                : 'bg-slate-800/50 text-slate-300 border-2 border-slate-600/50'
            }`}
          >
            <Users className="h-5 w-5 mr-2" strokeWidth={3} />
            Members ({members.length})
          </Button>
          <Button
            onClick={() => {
              playClick()
              setActiveTab('leaderboard')
            }}
            className={`flex-1 font-black ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-2 border-orange-400'
                : 'bg-slate-800/50 text-slate-300 border-2 border-slate-600/50'
            }`}
          >
            <Trophy className="h-5 w-5 mr-2" strokeWidth={3} />
            Leaderboard
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'members' ? (
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
            <div className="space-y-3">
              {members.map((member) => (
                <motion.div
                  key={member.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-2 border-slate-600/50 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getRoleIcon(member.role)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-white">{member.username}</h3>
                          {member.role === 'owner' && (
                            <Badge className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 border-orange-400/50 font-black text-xs">
                              Owner
                            </Badge>
                          )}
                          {member.role === 'admin' && (
                            <Badge className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-400/50 font-black text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 font-bold">
                          Level {member.stats.level} • {member.stats.xp.toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-blue-300">
                        {member.stats.accuracy.toFixed(1)}% Accuracy
                      </p>
                      <p className="text-xs text-slate-400 font-bold">
                        {member.stats.total_wins}W / {member.stats.total_games}G
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-slate-500/50 mx-auto mb-4" strokeWidth={2} />
                  <p className="text-slate-400 font-bold">No leaderboard data yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Members need to complete battles to appear on the leaderboard
                  </p>
                </div>
              ) : (
                leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border-2 ${
                      entry.rank === 1
                        ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-400/50'
                        : entry.rank === 2
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/50'
                        : entry.rank === 3
                        ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/50'
                        : 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-slate-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/50 border-2 border-slate-600/50 font-black text-lg">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">{entry.username}</h3>
                          <p className="text-sm text-slate-400 font-bold">
                            Level {entry.level} • {entry.xp.toLocaleString()} XP
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-300">
                          {entry.accuracy.toFixed(1)}% Accuracy
                        </p>
                        <p className="text-xs text-slate-400 font-bold">
                          {entry.total_wins}W / {entry.total_games}G
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function ClanDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" strokeWidth={3} />
      </div>
    }>
      <ClanDetailContent />
    </Suspense>
  )
}


