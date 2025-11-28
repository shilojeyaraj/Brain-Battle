"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, Loader2, AlertCircle, Users } from "lucide-react"
import { useFeedback } from "@/hooks/useFeedback"

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

interface JoinClanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (clan: Clan) => void
}

export function JoinClanModal({ isOpen, onClose, onSuccess }: JoinClanModalProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { playClick } = useFeedback()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    playClick()

    // Normalize code (uppercase, remove spaces)
    const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '')

    if (normalizedCode.length !== 8) {
      setError('Clan code must be 8 characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/clans/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.maxClansReached) {
          setError(
            data.error || `You can only join up to ${data.currentLimit} clans. ${data.isFreeUser ? 'Leave a clan to join this one, or upgrade to Pro to join up to 10 clans!' : 'Leave a clan to join this one.'}`
          )
        } else {
          setError(data.error || 'Failed to join clan')
        }
        setLoading(false)
        return
      }

      if (data.success && data.clan) {
        onSuccess(data.clan)
        // Reset form
        setCode("")
        setError(null)
      }
    } catch (err) {
      console.error('Error joining clan:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
            <LogIn className="h-6 w-6 text-blue-400" strokeWidth={3} />
            Join Clan
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={3} />
              <div className="flex-1">
                <p className="text-sm font-black text-red-400">{error}</p>
                {error.includes('upgrade to Pro') && (
                  <a
                    href="/pricing"
                    className="text-sm text-orange-300 hover:text-orange-200 font-bold underline mt-2 inline-block"
                  >
                    Upgrade to Pro →
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-black text-blue-100">
              Clan Code *
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => {
                // Auto-uppercase and limit to 8 characters
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                setCode(value)
                setError(null)
              }}
              placeholder="ABC123XY"
              className="h-12 text-lg font-black tracking-widest text-center border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
              required
              maxLength={8}
              disabled={loading}
            />
            <p className="text-xs text-slate-400 font-bold text-center">
              Enter the 8-character join code from your teacher or organizer
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-black border-2 border-slate-600"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400"
              disabled={loading || code.length !== 8}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={3} />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="h-5 w-5 mr-2" strokeWidth={3} />
                  Join Clan
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


