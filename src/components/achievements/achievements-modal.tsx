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
      <Card className="w-full max-w-4xl max-h-[85vh] my-auto overflow-y-auto bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center cartoon-border cartoon-shadow">
              <Trophy className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Achievements</h2>
              <p className="text-xs text-muted-foreground font-bold">
                Track your progress, milestones, and rare badges.
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover"
          >
            <X className="h-5 w-5 text-foreground" strokeWidth={3} />
          </Button>
        </div>

        <div className="p-6">
          <AchievementGallery userId={userId || undefined} />
        </div>
      </Card>
    </div>
  )
}


