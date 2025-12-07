import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth/admin-auth'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * GET /api/admin/users - List all users
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 401 }
      )
    }

    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''

    let query = adminClient
      .from('users')
      .select('id, username, email, created_at, last_login, is_active, subscription_tier, subscription_status')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Add search filter if provided
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('❌ [ADMIN USERS] Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = adminClient
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { count } = await countQuery

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('❌ [ADMIN USERS] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

