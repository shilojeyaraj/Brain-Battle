"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AchievementGallery } from "@/components/achievements/achievement-gallery"
import { X, Trophy } from "lucide-react"

interface AchievementsModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string | null
}

export function AchievementsModal({ isOpen, onClose, userId }: AchievementsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[85vh] my-auto overflow-y-auto bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 shadow-lg">
        <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-slate-600/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center border-4 border-orange-400/50 shadow-lg">
              <Trophy className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Achievements</h2>
              <p className="text-xs text-blue-100/70 font-bold">
                Track your progress, milestones, and rare badges.
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600/50 rounded-xl text-white"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </Button>
        </div>

        <div className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <AchievementGallery userId={userId || undefined} />
        </div>
      </Card>
    </div>
  )
}


