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
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 pb-24">
      <Card className="w-full max-w-lg bg-slate-700/50 border-4 border-slate-600/50 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white">Settings</h2>
          <Button onClick={onClose} className="bg-slate-600/50 hover:bg-slate-600 rounded-xl border-4 border-slate-500/50">
            <X className="h-5 w-5 text-white" strokeWidth={3} />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-bold text-white">Sound</Label>
              <p className="text-sm text-white/70">Enable or disable all sound effects</p>
            </div>
            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-xl border-4 ${soundEnabled ? "bg-blue-500/20 text-blue-300 border-blue-400/50" : "bg-slate-600/50 text-white/70 border-slate-500/50"}`}
            >
              {soundEnabled ? "On" : "Off"}
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-bold text-white">Volume</Label>
              <span className="text-sm font-bold text-white/70">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-full accent-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-bold text-white">Reduced Motion</Label>
              <p className="text-sm text-white/70">Limit animations and disable particles</p>
            </div>
            <Button
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`rounded-xl border-4 ${reducedMotion ? "bg-blue-500/20 text-blue-300 border-blue-400/50" : "bg-slate-600/50 text-white/70 border-slate-500/50"}`}
            >
              {reducedMotion ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}


