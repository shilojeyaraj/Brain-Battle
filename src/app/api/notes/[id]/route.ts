import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { sanitizeError, createSafeErrorResponse } from "@/lib/utils/error-sanitizer"

/**
 * GET /api/notes/[id]
 * Retrieve a saved study note by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get userId from session cookie
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(req)
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      )
    }

    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS (we handle auth in API layer)
    const supabase = createAdminClient()
    
    const { data: note, error } = await supabase
      .from('user_study_notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only access their own notes
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Note not found" },
          { status: 404 }
        )
      }
      console.error('❌ [NOTES API] Error fetching note:', error)
      const sanitized = sanitizeError(error, 'Failed to fetch note')
      return NextResponse.json(
        createSafeErrorResponse(error, 'Failed to fetch note'),
        { status: sanitized.statusCode }
      )
    }

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      note: {
        id: note.id,
        title: note.title,
        subject: note.subject,
        notes: note.notes_json,
        fileNames: note.file_names,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }
    })

  } catch (error) {
    console.error('❌ [NOTES API] Error:', error)
    const sanitized = sanitizeError(error, 'Failed to fetch note')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to fetch note'),
      { status: sanitized.statusCode }
    )
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a saved study note by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get userId from session cookie
    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(req)
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      )
    }

    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS (we handle auth in API layer)
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('user_study_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only delete their own notes

    if (error) {
      console.error('❌ [NOTES API] Error deleting note:', error)
      const sanitized = sanitizeError(error, 'Failed to delete note')
      return NextResponse.json(
        createSafeErrorResponse(error, 'Failed to delete note'),
        { status: sanitized.statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully"
    })

  } catch (error) {
    console.error('❌ [NOTES API] Error:', error)
    const sanitized = sanitizeError(error, 'Failed to delete note')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Failed to delete note'),
      { status: sanitized.statusCode }
    )
  }
}

