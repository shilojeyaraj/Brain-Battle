'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Shield, Lock, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid password')
        setLoading(false)
        return
      }

      // Redirect to admin dashboard
      router.push('/admin')
    } catch (error) {
      console.error('Admin login error:', error)
      setError('Failed to authenticate. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-4 border-slate-600/50 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 bg-orange-500/20 rounded-full mb-4">
            <Shield className="h-12 w-12 text-orange-400" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Admin Access</h1>
          <p className="text-slate-400 font-bold text-sm text-center">
            Enter admin password to continue
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border-2 border-red-500/50 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-300 font-bold text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-300 mb-2">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="pl-10 bg-slate-700/50 border-2 border-slate-600 text-white placeholder:text-slate-400"
                required
                autoFocus
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400 shadow-lg"
            loading={loading}
            loadingText="Authenticating..."
          >
            Access Admin Panel
          </Button>
        </form>

        <div className="mt-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 font-bold text-xs text-center">
            ⚠️ This is a restricted area. Unauthorized access is prohibited.
          </p>
        </div>
      </Card>
    </div>
  )
}

