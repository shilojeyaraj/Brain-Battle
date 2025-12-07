"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSoundSettings } from "@/context/sound-settings"
import { X, AlertTriangle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { soundEnabled, setSoundEnabled, volume, setVolume, reducedMotion, setReducedMotion } = useSoundSettings()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const router = useRouter()
  
  if (!isOpen) return null
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return
    }
    
    setIsDeleting(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
      })
      
      if (response.ok) {
        // Clear local storage
        localStorage.clear()
        // Redirect to home page
        router.push('/')
        // Close modal
        onClose()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete account. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('An error occurred while deleting your account. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
    }
  }

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

          {/* Account Deletion Section */}
          <div className="pt-6 border-t border-slate-600/50">
            <div className="mb-4">
              <Label className="font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" strokeWidth={3} />
                Danger Zone
              </Label>
              <p className="text-sm text-white/70 mt-1">Permanently delete your account and all associated data</p>
            </div>
            
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border-4 border-red-500/50 rounded-xl font-bold"
              >
                <Trash2 className="h-4 w-4 mr-2" strokeWidth={3} />
                Delete Account
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-950/30 border-4 border-red-500/50 rounded-xl p-4">
                  <p className="text-sm text-red-300 font-bold mb-2">
                    ⚠️ This action cannot be undone!
                  </p>
                  <p className="text-xs text-red-300/80 mb-3">
                    This will permanently delete your account, all your stats, progress, achievements, and any data associated with your account.
                  </p>
                  <Label className="text-sm font-bold text-white">
                    Type <span className="text-red-400 font-black">DELETE</span> to confirm:
                  </Label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full mt-2 px-3 py-2 bg-slate-800/50 border-2 border-slate-600/50 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="flex-1 bg-slate-600/50 hover:bg-slate-600 text-white border-4 border-slate-500/50 rounded-xl font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:text-red-400/50 text-white border-4 border-red-500/50 rounded-xl font-bold"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}


