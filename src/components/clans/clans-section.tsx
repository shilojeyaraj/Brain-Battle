"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, LogIn, Crown, Shield, User, Copy, Check, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useFeedback } from "@/hooks/useFeedback"
import { CreateClanModal } from "./create-clan-modal"
import { JoinClanModal } from "./join-clan-modal"
import Link from "next/link"

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
  joined_at: string
  created_at: string
}

export function ClansSection() {
  const [clans, setClans] = useState<Clan[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const { playClick } = useFeedback()

  useEffect(() => {
    fetchClans()
  }, [])

  const fetchClans = async () => {
    try {
      const response = await fetch('/api/clans/list')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClans(data.clans || [])
        }
      }
    } catch (error) {
      console.error('Error fetching clans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = (code: string) => {
    playClick()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleClanCreated = (newClan: Clan) => {
    setClans([newClan, ...clans])
    setIsCreateModalOpen(false)
  }

  const handleClanJoined = (newClan: Clan) => {
    setClans([...clans, newClan])
    setIsJoinModalOpen(false)
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 border-orange-400/50 font-black">
            Owner
          </Badge>
        )
      case 'admin':
        return (
          <Badge className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-400/50 font-black">
            Admin
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gradient-to-r from-slate-500/20 to-slate-600/20 text-slate-300 border-slate-400/50 font-black">
            Member
          </Badge>
        )
    }
  }

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border-2 border-blue-400/50">
              <Users className="h-6 w-6 text-blue-300" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Clans & Classrooms</h2>
              <p className="text-sm text-blue-100/70 font-bold">
                Create or join groups for collaborative learning
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                playClick()
                setIsJoinModalOpen(true)
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400"
            >
              <LogIn className="h-5 w-5 mr-2" strokeWidth={3} />
              Join Clan
            </Button>
            <Button
              onClick={() => {
                playClick()
                setIsCreateModalOpen(true)
              }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400"
            >
              <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
              Create Clan
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-700/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : clans.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-slate-500/50 mx-auto mb-4" strokeWidth={2} />
            <p className="text-slate-400 font-bold text-lg mb-2">No clans yet</p>
            <p className="text-slate-500 text-sm mb-6">
              Create a clan to start organizing your classroom or study group
            </p>
            <Button
              onClick={() => {
                playClick()
                setIsCreateModalOpen(true)
              }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400"
            >
              <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
              Create Your First Clan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {clans.map((clan) => (
              <motion.div
                key={clan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link href={`/clans/${clan.id}`}>
                  <Card className="p-5 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-2 border-slate-600/50 hover:border-blue-400/50 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-black text-white group-hover:text-blue-300 transition-colors">
                            {clan.name}
                          </h3>
                          {getRoleIcon(clan.role)}
                          {getRoleBadge(clan.role)}
                        </div>
                        {clan.description && (
                          <p className="text-sm text-slate-300/70 font-bold mb-3">
                            {clan.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-blue-300/70">
                            <Users className="h-4 w-4" strokeWidth={3} />
                            <span className="font-bold">
                              {clan.member_count} / {clan.max_members} members
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold">Code:</span>
                            <code className="px-2 py-1 bg-slate-800/50 rounded border border-slate-600/50 text-orange-300 font-black text-sm">
                              {clan.code}
                            </code>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleCopyCode(clan.code)
                              }}
                              className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                            >
                              {copiedCode === clan.code ? (
                                <Check className="h-4 w-4 text-green-400" strokeWidth={3} />
                              ) : (
                                <Copy className="h-4 w-4 text-slate-400" strokeWidth={3} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-blue-300 transition-colors ml-4" strokeWidth={3} />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <CreateClanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleClanCreated}
      />

      <JoinClanModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={handleClanJoined}
      />
    </>
  )
}


