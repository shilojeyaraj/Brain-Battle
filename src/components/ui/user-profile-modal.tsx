"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Trophy, 
  Target, 
  Zap, 
  Users, 
  Clock, 
  Star, 
  Calendar,
  X,
  Crown,
  Award,
  User,
  FileText,
  Brain
} from "lucide-react"
import { UserProfile } from "@/lib/actions/user-stats-client"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfile | null
}

interface LimitsData {
  documents: {
    count: number
    limit: number
    remaining: number
    isUnlimited: boolean
  }
  quizzes: {
    count: number
    limit: number
    remaining: number
    isUnlimited: boolean
  }
}

export function UserProfileModal({ isOpen, onClose, userProfile }: UserProfileModalProps) {
  const [limits, setLimits] = useState<LimitsData | null>(null)
  const [loadingLimits, setLoadingLimits] = useState(false)
  const [limitsError, setLimitsError] = useState<string | null>(null)

  // Fetch limits when modal opens
  useEffect(() => {
    if (isOpen && userProfile) {
      setLoadingLimits(true)
      setLimitsError(null)
      fetch('/api/subscription/limits', {
        credentials: 'include'
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch limits: ${res.status}`)
          }
          return res.json()
        })
        .then(data => {
          if (data.success && data.usage) {
            setLimits({
              documents: data.usage.documents,
              quizzes: data.usage.quizzes
            })
          } else {
            setLimitsError('Failed to load usage limits')
          }
        })
        .catch(err => {
          console.error('Error fetching limits:', err)
          setLimitsError('Unable to load usage limits')
        })
        .finally(() => {
          setLoadingLimits(false)
        })
    } else {
      // Reset when modal closes
      setLimits(null)
      setLimitsError(null)
    }
  }, [isOpen, userProfile])

  if (!isOpen || !userProfile || !userProfile.stats) return null

  const { stats } = userProfile
  const winRate = stats.total_games > 0 ? (stats.total_wins / stats.total_games * 100).toFixed(1) : "0.0"
  const accuracy = stats.accuracy || 0
  const avgResponseTime = stats.average_response_time || 0

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-[9999] p-4 pt-8 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex items-start justify-center w-full min-h-full pt-8" style={{ zIndex: 10000 }}>
        <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-2 border-slate-700/50 shadow-2xl backdrop-blur-sm mt-8" style={{ zIndex: 10001 }}>
          <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 cartoon-border cartoon-shadow">
                <AvatarImage src="/placeholder.svg?height=64&width=64" />
                <AvatarFallback className="bg-primary text-primary-foreground font-black text-2xl">
                  <User className="h-8 w-8" strokeWidth={3} />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-black text-slate-100">{userProfile.username}</h2>
                <p className="text-slate-400 font-bold">Level {stats.level}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary text-primary-foreground font-black text-xs px-2 py-1 cartoon-border cartoon-shadow">
                    {stats.xp} XP
                  </Badge>
                  {stats.best_streak > 5 && (
                    <Badge className="bg-secondary text-secondary-foreground font-black text-xs px-2 py-1 cartoon-border cartoon-shadow">
                      <Crown className="w-3 h-3 mr-1" />
                      Streak Master
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="bg-slate-700/50 hover:bg-slate-700/70 rounded-xl border border-slate-600/50"
            >
              <X className="h-5 w-5 text-slate-300" strokeWidth={3} />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {/* Win/Loss Stats */}
            <Card className="p-4 bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center cartoon-border cartoon-shadow">
                  <Trophy className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                </div>
                <h3 className="font-black text-slate-100">Battle Record</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Wins:</span>
                  <span className="font-black text-green-600">{stats.total_wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Losses:</span>
                  <span className="font-black text-red-600">{stats.total_losses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Win Rate:</span>
                  <span className="font-black text-slate-100">{winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Total Games:</span>
                  <span className="font-black text-slate-100">{stats.total_games}</span>
                </div>
              </div>
            </Card>

            {/* Performance Stats */}
            <Card className="p-4 bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center cartoon-border cartoon-shadow">
                  <Target className="w-5 h-5 text-secondary-foreground" strokeWidth={3} />
                </div>
                <h3 className="font-black text-slate-100">Performance</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Accuracy:</span>
                  <span className="font-black text-slate-100">{accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Questions:</span>
                  <span className="font-black text-slate-100">{stats.total_questions_answered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Correct:</span>
                  <span className="font-black text-slate-100">{stats.correct_answers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Avg Response:</span>
                  <span className="font-black text-slate-100">{avgResponseTime.toFixed(1)}s</span>
                </div>
              </div>
            </Card>

            {/* Streak Stats */}
            <Card className="p-4 bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-chart-3 flex items-center justify-center cartoon-border cartoon-shadow">
                  <Zap className="w-5 h-5 text-slate-100" strokeWidth={3} />
                </div>
                <h3 className="font-black text-slate-100">Streaks</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Current:</span>
                  <span className="font-black text-slate-100">{stats.win_streak}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Best:</span>
                  <span className="font-black text-slate-100">{stats.best_streak}</span>
                </div>
                {stats.favorite_subject && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Favorite:</span>
                    <span className="font-black text-slate-100">{stats.favorite_subject}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Account Info */}
            <Card className="p-4 bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center cartoon-border cartoon-shadow">
                  <Calendar className="w-5 h-5 text-accent-foreground" strokeWidth={3} />
                </div>
                <h3 className="font-black text-slate-100">Account</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Member Since:</span>
                  <span className="font-black text-slate-100">
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Last Login:</span>
                  <span className="font-black text-slate-100">
                    {userProfile.last_login 
                      ? new Date(userProfile.last_login).toLocaleDateString()
                      : "Never"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Email:</span>
                  <span className="font-black text-slate-100 text-sm">{userProfile.email}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Usage Limits Section - Always show */}
          <Card className="p-4 bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm mb-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center cartoon-border cartoon-shadow">
                <Brain className="w-5 h-5 text-blue-400" strokeWidth={3} />
              </div>
              <h3 className="font-black text-slate-100">Usage Limits</h3>
            </div>
            
            {loadingLimits ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" strokeWidth={3} />
                      <span className="text-slate-400 font-bold">Documents This Month</span>
                    </div>
                    <span className="text-slate-400 font-bold text-sm">Loading...</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-slate-400" strokeWidth={3} />
                      <span className="text-slate-400 font-bold">Quizzes This Month</span>
                    </div>
                    <span className="text-slate-400 font-bold text-sm">Loading...</span>
                  </div>
                </div>
              </div>
            ) : limitsError ? (
              <div className="text-center py-4">
                <p className="text-slate-400 font-bold text-sm">{limitsError}</p>
                <Button
                  onClick={() => {
                    setLoadingLimits(true)
                    setLimitsError(null)
                    fetch('/api/subscription/limits', {
                      credentials: 'include'
                    })
                      .then(res => {
                        if (!res.ok) throw new Error(`Failed: ${res.status}`)
                        return res.json()
                      })
                      .then(data => {
                        if (data.success && data.usage) {
                          setLimits({
                            documents: data.usage.documents,
                            quizzes: data.usage.quizzes
                          })
                        } else {
                          setLimitsError('Failed to load usage limits')
                        }
                      })
                      .catch(err => {
                        console.error('Error fetching limits:', err)
                        setLimitsError('Unable to load usage limits')
                      })
                      .finally(() => {
                        setLoadingLimits(false)
                      })
                  }}
                  className="mt-2 text-xs"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : limits ? (
              <div className="space-y-4">
                {/* Documents Limit */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" strokeWidth={3} />
                      <span className="text-slate-400 font-bold">Documents This Month</span>
                    </div>
                    {limits.documents.isUnlimited ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 font-black text-xs px-2 py-1">
                        Unlimited
                      </Badge>
                    ) : (
                      <span className={`font-black text-sm ${
                        limits.documents.remaining === 0 
                          ? 'text-red-500' 
                          : limits.documents.remaining <= 2 
                          ? 'text-orange-500' 
                          : 'text-slate-100'
                      }`}>
                        {limits.documents.remaining} remaining
                      </span>
                    )}
                  </div>
                  {!limits.documents.isUnlimited && (
                    <>
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            limits.documents.remaining === 0 
                              ? 'bg-red-500' 
                              : limits.documents.remaining <= 2 
                              ? 'bg-orange-500' 
                              : 'bg-blue-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (limits.documents.count / limits.documents.limit) * 100)}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 font-bold">
                        {limits.documents.count} / {limits.documents.limit} documents used
                      </p>
                    </>
                  )}
                </div>

                {/* Quizzes Limit */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-slate-400" strokeWidth={3} />
                      <span className="text-slate-400 font-bold">Quizzes This Month</span>
                    </div>
                    {limits.quizzes.isUnlimited ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 font-black text-xs px-2 py-1">
                        Unlimited
                      </Badge>
                    ) : (
                      <span className={`font-black text-sm ${
                        limits.quizzes.remaining === 0 
                          ? 'text-red-500' 
                          : limits.quizzes.remaining <= 2 
                          ? 'text-orange-500' 
                          : 'text-slate-100'
                      }`}>
                        {limits.quizzes.remaining} remaining
                      </span>
                    )}
                  </div>
                  {!limits.quizzes.isUnlimited && (
                    <>
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            limits.quizzes.remaining === 0 
                              ? 'bg-red-500' 
                              : limits.quizzes.remaining <= 2 
                              ? 'bg-orange-500' 
                              : 'bg-purple-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (limits.quizzes.count / limits.quizzes.limit) * 100)}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 font-bold">
                        {limits.quizzes.count} / {limits.quizzes.limit} quizzes used
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 font-bold text-sm">No usage data available</p>
              </div>
            )}
          </Card>

          {/* Achievements Section */}
          <Card className="p-4 bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm mt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-chart-1 flex items-center justify-center cartoon-border cartoon-shadow">
                <Award className="w-5 h-5 text-slate-100" strokeWidth={3} />
              </div>
              <h3 className="font-black text-slate-100">Achievements</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.total_wins >= 1 && (
                <Badge className="bg-primary text-primary-foreground font-black text-xs px-3 py-1 cartoon-border cartoon-shadow">
                  <Trophy className="w-3 h-3 mr-1" />
                  First Win
                </Badge>
              )}
              {stats.total_wins >= 10 && (
                <Badge className="bg-secondary text-secondary-foreground font-black text-xs px-3 py-1 cartoon-border cartoon-shadow">
                  <Star className="w-3 h-3 mr-1" />
                  Decade Warrior
                </Badge>
              )}
              {stats.best_streak >= 5 && (
                <Badge className="bg-chart-3 text-foreground font-black text-xs px-3 py-1 cartoon-border cartoon-shadow">
                  <Zap className="w-3 h-3 mr-1" />
                  Streak Master
                </Badge>
              )}
              {accuracy >= 80 && (
                <Badge className="bg-chart-1 text-foreground font-black text-xs px-3 py-1 cartoon-border cartoon-shadow">
                  <Target className="w-3 h-3 mr-1" />
                  Sharp Shooter
                </Badge>
              )}
              {stats.total_questions_answered >= 100 && (
                <Badge className="bg-accent text-accent-foreground font-black text-xs px-3 py-1 cartoon-border cartoon-shadow">
                  <Users className="w-3 h-3 mr-1" />
                  Knowledge Seeker
                </Badge>
              )}
              {stats.total_wins === 0 && stats.total_games === 0 && (
                <Badge className="bg-muted text-muted-foreground font-black text-xs px-3 py-1 cartoon-border cartoon-shadow">
                  <Clock className="w-3 h-3 mr-1" />
                  Ready to Battle
                </Badge>
              )}
            </div>
          </Card>
          </div>
        </Card>
      </div>
    </div>
  )

  // Render modal using portal to ensure it's always on top
  if (typeof window === 'undefined') return null
  
  return createPortal(modalContent, document.body)
}
