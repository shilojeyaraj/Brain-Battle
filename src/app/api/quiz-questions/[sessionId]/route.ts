import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifySessionOwnership } from "@/lib/security/ownership-validation"
import { sanitizeError, createSafeErrorResponse } from "@/lib/utils/error-sanitizer"
import { isValidUUID } from "@/lib/security/input-validation"

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const sessionId = context?.params?.sessionId as string
    if (!sessionId || !isValidUUID(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 }
      )
    }

    const { getUserIdFromRequest } = await import('@/lib/auth/session-cookies')
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const owns = await verifySessionOwnership(userId, sessionId)
    if (!owns) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('idx, type, prompt, options, answer, meta')
      .eq('session_id', sessionId)
      .order('idx', { ascending: true })

    if (error) {
      console.error('❌ [QUIZ QUESTIONS] Error fetching quiz_questions:', error)
      const sanitized = sanitizeError(error, 'Failed to fetch quiz questions')
      return NextResponse.json(
        createSafeErrorResponse(error, 'Failed to fetch quiz questions'),
        { status: sanitized.statusCode }
      )
    }

    console.log(`✅ [QUIZ QUESTIONS] Fetched ${data?.length || 0} questions for session ${sessionId}`)

    return NextResponse.json({
      success: true,
      sessionId,
      questions: data || []
    })
  } catch (error) {
    console.error('❌ [QUIZ QUESTIONS] Unexpected error:', error)
    const sanitized = sanitizeError(error, 'Internal server error')
    return NextResponse.json(
      createSafeErrorResponse(error, 'Internal server error'),
      { status: sanitized.statusCode }
    )
  }
}

