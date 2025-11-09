"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSoundSettings } from "@/context/sound-settings"
import { X } from "lucide-react"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { soundEnabled, setSoundEnabled, volume, setVolume, reducedMotion, setReducedMotion } = useSoundSettings()
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-card cartoon-border cartoon-shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-foreground">Settings</h2>
          <Button onClick={onClose} className="bg-card hover:bg-muted rounded-xl cartoon-border cartoon-shadow cartoon-hover">
            <X className="h-5 w-5 text-foreground" strokeWidth={3} />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-bold text-foreground">Sound</Label>
              <p className="text-sm text-muted-foreground">Enable or disable all sound effects</p>
            </div>
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-xl cartoon-border cartoon-shadow ${soundEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              {soundEnabled ? "On" : "Off"}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-bold text-foreground">Volume</Label>
              <span className="text-sm font-bold text-muted-foreground">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-bold text-foreground">Reduced Motion</Label>
              <p className="text-sm text-muted-foreground">Limit animations and disable particles</p>
            </div>
            <Button
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`rounded-xl cartoon-border cartoon-shadow ${reducedMotion ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              {reducedMotion ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}


