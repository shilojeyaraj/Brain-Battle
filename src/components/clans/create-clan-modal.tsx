"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Users, Loader2, AlertCircle, Crown } from "lucide-react"
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

interface CreateClanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (clan: Clan) => void
}

export function CreateClanModal({ isOpen, onClose, onSuccess }: CreateClanModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [maxMembers, setMaxMembers] = useState(50)
  const [isPrivate, setIsPrivate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { playClick } = useFeedback()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    playClick()

    try {
      const response = await fetch('/api/clans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
          max_members: Math.min(Math.max(1, maxMembers), 100),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.requiresPro) {
          setError(
            data.error || 'Creating clans requires a Pro account. Upgrade to Pro to create classrooms and host clan sessions!'
          )
        } else {
          setError(data.error || 'Failed to create clan')
        }
        setLoading(false)
        return
      }

      if (data.success && data.clan) {
        onSuccess(data.clan)
        // Reset form
        setName("")
        setDescription("")
        setMaxMembers(50)
        setIsPrivate(true)
        setError(null)
      }
    } catch (err) {
      console.error('Error creating clan:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
            <Crown className="h-6 w-6 text-orange-400" strokeWidth={3} />
            Create Clan
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={3} />
              <div className="flex-1">
                <p className="text-sm font-black text-red-400">{error}</p>
                {error.includes('Pro account') && (
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
            <Label htmlFor="name" className="text-sm font-black text-blue-100">
              Clan Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., AP Biology 2024"
              className="h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400"
              required
              minLength={3}
              maxLength={100}
              disabled={loading}
            />
            <p className="text-xs text-slate-400 font-bold">3-100 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-black text-blue-100">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this clan for?"
              className="min-h-[80px] text-base font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white placeholder:text-blue-100/50 focus:border-blue-400 resize-none"
              maxLength={500}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxMembers" className="text-sm font-black text-blue-100">
              Max Members
            </Label>
            <Input
              id="maxMembers"
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value) || 50)}
              className="h-12 text-lg font-bold border-2 border-slate-600/50 bg-slate-900/50 text-white focus:border-blue-400"
              min={1}
              max={100}
              disabled={loading}
            />
            <p className="text-xs text-slate-400 font-bold">1-100 members</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-slate-600/50 bg-slate-900/50"
              disabled={loading}
            />
            <Label htmlFor="isPrivate" className="text-sm font-black text-blue-100 cursor-pointer">
              Private Clan (requires join code)
            </Label>
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
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={3} />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="h-5 w-5 mr-2" strokeWidth={3} />
                  Create Clan
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


