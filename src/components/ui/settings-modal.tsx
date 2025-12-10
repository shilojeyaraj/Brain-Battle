"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSoundSettings } from "@/context/sound-settings"
import { X, Music, Volume2 } from "lucide-react"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { 
    soundEnabled, 
    setSoundEnabled, 
    volume, 
    setVolume, 
    musicEnabled, 
    setMusicEnabled, 
    musicVolume, 
    setMusicVolume,
    reducedMotion, 
    setReducedMotion 
  } = useSoundSettings()
  
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
          {/* Music Section */}
          <div className="pb-4 border-b border-slate-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Music className="h-5 w-5 text-orange-400" strokeWidth={3} />
              <span className="font-black text-white">Music</span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="font-bold text-white">Background Music</Label>
                <p className="text-sm text-white/70">Play music in lobby and battles</p>
              </div>
              <Button
                onClick={() => setMusicEnabled(!musicEnabled)}
                className={`rounded-xl border-4 ${musicEnabled ? "bg-orange-500/20 text-orange-300 border-orange-400/50" : "bg-slate-600/50 text-white/70 border-slate-500/50"}`}
              >
                {musicEnabled ? "On" : "Off"}
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-bold text-white">Music Volume</Label>
                <span className="text-sm font-bold text-white/70">{Math.round(musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(musicVolume * 100)}
                onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                disabled={!musicEnabled}
                className="w-full accent-orange-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Sound Effects Section */}
          <div className="pb-4 border-b border-slate-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="h-5 w-5 text-blue-400" strokeWidth={3} />
              <span className="font-black text-white">Sound Effects</span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="font-bold text-white">Sound Effects</Label>
                <p className="text-sm text-white/70">Click, correct, and wrong sounds</p>
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
                <Label className="font-bold text-white">Effects Volume</Label>
                <span className="text-sm font-bold text-white/70">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                disabled={!soundEnabled}
                className="w-full accent-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Accessibility Section */}
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
