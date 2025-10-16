"use client"

import React from "react"
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
  Award
} from "lucide-react"
import { UserProfile } from "@/lib/actions/user-stats-client"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userProfile: UserProfile | null
}

export function UserProfileModal({ isOpen, onClose, userProfile }: UserProfileModalProps) {
  if (!isOpen || !userProfile) return null

  const { stats } = userProfile
  const winRate = stats.total_games > 0 ? (stats.total_wins / stats.total_games * 100).toFixed(1) : "0.0"
  const accuracy = stats.accuracy || 0
  const avgResponseTime = stats.average_response_time || 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card cartoon-border cartoon-shadow">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 cartoon-border cartoon-shadow">
                <AvatarImage src="/placeholder.svg?height=64&width=64" />
                <AvatarFallback className="bg-primary text-primary-foreground font-black text-2xl">
                  {userProfile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-black text-foreground">{userProfile.username}</h2>
                <p className="text-muted-foreground font-bold">Level {stats.level}</p>
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
              className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover"
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Win/Loss Stats */}
            <Card className="p-4 bg-card cartoon-border cartoon-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center cartoon-border cartoon-shadow">
                  <Trophy className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
                </div>
                <h3 className="font-black text-foreground">Battle Record</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Wins:</span>
                  <span className="font-black text-green-600">{stats.total_wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Losses:</span>
                  <span className="font-black text-red-600">{stats.total_losses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Win Rate:</span>
                  <span className="font-black text-foreground">{winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Total Games:</span>
                  <span className="font-black text-foreground">{stats.total_games}</span>
                </div>
              </div>
            </Card>

            {/* Performance Stats */}
            <Card className="p-4 bg-card cartoon-border cartoon-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center cartoon-border cartoon-shadow">
                  <Target className="w-5 h-5 text-secondary-foreground" strokeWidth={3} />
                </div>
                <h3 className="font-black text-foreground">Performance</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Accuracy:</span>
                  <span className="font-black text-foreground">{accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Questions:</span>
                  <span className="font-black text-foreground">{stats.total_questions_answered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Correct:</span>
                  <span className="font-black text-foreground">{stats.correct_answers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Avg Response:</span>
                  <span className="font-black text-foreground">{avgResponseTime.toFixed(1)}s</span>
                </div>
              </div>
            </Card>

            {/* Streak Stats */}
            <Card className="p-4 bg-card cartoon-border cartoon-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-chart-3 flex items-center justify-center cartoon-border cartoon-shadow">
                  <Zap className="w-5 h-5 text-foreground" strokeWidth={3} />
                </div>
                <h3 className="font-black text-foreground">Streaks</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Current:</span>
                  <span className="font-black text-foreground">{stats.win_streak}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Best:</span>
                  <span className="font-black text-foreground">{stats.best_streak}</span>
                </div>
                {stats.favorite_subject && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-bold">Favorite:</span>
                    <span className="font-black text-foreground">{stats.favorite_subject}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Account Info */}
            <Card className="p-4 bg-card cartoon-border cartoon-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center cartoon-border cartoon-shadow">
                  <Calendar className="w-5 h-5 text-accent-foreground" strokeWidth={3} />
                </div>
                <h3 className="font-black text-foreground">Account</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Member Since:</span>
                  <span className="font-black text-foreground">
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Last Login:</span>
                  <span className="font-black text-foreground">
                    {userProfile.last_login 
                      ? new Date(userProfile.last_login).toLocaleDateString()
                      : "Never"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">Email:</span>
                  <span className="font-black text-foreground text-sm">{userProfile.email}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Achievements Section */}
          <Card className="p-4 bg-card cartoon-border cartoon-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-chart-1 flex items-center justify-center cartoon-border cartoon-shadow">
                <Award className="w-5 h-5 text-foreground" strokeWidth={3} />
              </div>
              <h3 className="font-black text-foreground">Achievements</h3>
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
  )
}
