'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  Users, 
  Shield, 
  Trash2, 
  Ban, 
  CheckCircle, 
  Crown, 
  Search,
  LogOut,
  AlertCircle,
  X
} from 'lucide-react'

interface User {
  id: string
  username: string
  email: string
  created_at: string
  last_login: string | null
  is_active: boolean
  subscription_tier: string
  subscription_status: string
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [grantProEmail, setGrantProEmail] = useState('')
  const [grantProUsername, setGrantProUsername] = useState('')
  const [grantProLoading, setGrantProLoading] = useState(false)
  const [grantProError, setGrantProError] = useState('')
  const [grantProSuccess, setGrantProSuccess] = useState('')

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        // If unauthorized, redirect to login
        if (response.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()

      if (data.users) {
        setUsers(data.users)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      // Don't show Supabase errors to user
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, searchTerm])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  // Delete user
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.status === 401) {
        window.location.href = '/admin/login'
        return
      }

      if (response.ok) {
        fetchUsers() // Refresh list
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user. Please try again.')
    }
  }

  // Ban/Unban user
  const handleToggleBan = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_active: !isActive
        })
      })

      if (response.status === 401) {
        window.location.href = '/admin/login'
        return
      }

      if (response.ok) {
        fetchUsers() // Refresh list
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user. Please try again.')
    }
  }

  // Grant pro
  const handleGrantPro = async (e: React.FormEvent) => {
    e.preventDefault()
    setGrantProError('')
    setGrantProSuccess('')
    setGrantProLoading(true)

    try {
      const response = await fetch('/api/admin/users/grant-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: grantProEmail || undefined,
          username: grantProUsername || undefined
        })
      })

      if (response.status === 401) {
        window.location.href = '/admin/login'
        return
      }

      const data = await response.json()

      if (response.ok) {
        setGrantProSuccess(`Pro subscription granted to ${data.user.email || data.user.username}`)
        setGrantProEmail('')
        setGrantProUsername('')
        fetchUsers() // Refresh list
      } else {
        setGrantProError(data.error || 'Failed to grant pro subscription')
      }
    } catch (error) {
      console.error('Error granting pro:', error)
      setGrantProError('Failed to grant pro subscription. Please try again.')
    } finally {
      setGrantProLoading(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
              <Shield className="h-10 w-10 text-orange-400" strokeWidth={3} />
              Admin Dashboard
            </h1>
            <p className="text-slate-400 font-bold">
              Manage users, subscriptions, and system settings
            </p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-slate-700 hover:bg-slate-600 text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Grant Pro Section */}
        <Card className="bg-slate-800/50 border-4 border-orange-500/50 p-6 mb-8">
          <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
            <Crown className="h-6 w-6 text-orange-400" />
            Grant Pro Subscription
          </h2>
          
          {grantProError && (
            <div className="mb-4 p-3 bg-red-500/20 border-2 border-red-500/50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-300 font-bold text-sm">{grantProError}</p>
              </div>
              <button onClick={() => setGrantProError('')}>
                <X className="h-4 w-4 text-red-400" />
              </button>
            </div>
          )}

          {grantProSuccess && (
            <div className="mb-4 p-3 bg-green-500/20 border-2 border-green-500/50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <p className="text-green-300 font-bold text-sm">{grantProSuccess}</p>
              </div>
              <button onClick={() => setGrantProSuccess('')}>
                <X className="h-4 w-4 text-green-400" />
              </button>
            </div>
          )}

          <form onSubmit={handleGrantPro} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={grantProEmail}
                  onChange={(e) => setGrantProEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="bg-slate-700/50 border-2 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Username
                </label>
                <Input
                  type="text"
                  value={grantProUsername}
                  onChange={(e) => setGrantProUsername(e.target.value)}
                  placeholder="username"
                  className="bg-slate-700/50 border-2 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black"
              loading={grantProLoading}
              loadingText="Granting Pro..."
            >
              <Crown className="h-4 w-4 mr-2" />
              Grant Pro Subscription
            </Button>
          </form>
        </Card>

        {/* User Management */}
        <Card className="bg-slate-800/50 border-4 border-slate-600/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              User Management
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by email or username..."
                className="bg-slate-700/50 border-2 border-slate-600 text-white w-64"
              />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-400 font-bold">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 font-bold">No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-600">
                      <th className="text-left p-3 text-slate-300 font-black">User</th>
                      <th className="text-left p-3 text-slate-300 font-black">Email</th>
                      <th className="text-left p-3 text-slate-300 font-black">Status</th>
                      <th className="text-left p-3 text-slate-300 font-black">Subscription</th>
                      <th className="text-left p-3 text-slate-300 font-black">Created</th>
                      <th className="text-left p-3 text-slate-300 font-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-white font-bold">{user.username}</td>
                        <td className="p-3 text-slate-300 font-bold text-sm">{user.email}</td>
                        <td className="p-3">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded font-bold text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 rounded font-bold text-xs">
                              <Ban className="h-3 w-3" />
                              Banned
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {user.subscription_tier === 'pro' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-300 rounded font-bold text-xs">
                              <Crown className="h-3 w-3" />
                              Pro
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-600/20 text-slate-400 rounded font-bold text-xs">
                              Free
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 font-bold text-xs">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleToggleBan(user.id, user.is_active)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-2 py-1"
                              size="sm"
                            >
                              {user.is_active ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            </Button>
                            <Button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1"
                              size="sm"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-slate-700 hover:bg-slate-600"
                  >
                    Previous
                  </Button>
                  <span className="text-slate-300 font-bold">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-slate-700 hover:bg-slate-600"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

