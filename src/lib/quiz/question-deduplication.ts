/**
 * Quiz Question Deduplication and Redo Logic
 * 
 * This module handles:
 * - Tracking quiz questions per document/user
 * - Excluding previous questions from new quizzes
 * - Focusing on wrong answers for redo quizzes
 */

import { createAdminClient } from '@/lib/supabase/server-admin'
import crypto from 'crypto'

export interface PreviousQuestion {
  question_text: string
  question_type: string
  options: any
  correct_answer: string
}

export interface WrongAnswer extends PreviousQuestion {
  explanation: string
  source_document: string
  wrong_count: number
}

/**
 * Generate a topic hash for topic-based quizzes (when no document_id)
 */
export function generateTopicHash(
  topic: string,
  difficulty: string,
  educationLevel: string,
  contentFocus: string
): string {
  const hashInput = `${topic}|${difficulty}|${educationLevel}|${contentFocus}`
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 32)
}

/**
 * Get previous questions for a document/user to exclude from new quiz
 */
export async function getPreviousQuestions(
  userId: string,
  documentId: string | null,
  topicHash: string | null
): Promise<PreviousQuestion[]> {
  const adminClient = createAdminClient()

  try {
    let query = adminClient
      .from('quiz_question_history')
      .select('question_text, question_type, options, correct_answer')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (documentId) {
      query = query.eq('document_id', documentId)
    } else if (topicHash) {
      query = query.eq('topic_hash', topicHash)
    } else {
      return []
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [QUIZ DEDUP] Error fetching previous questions:', error)
      return []
    }

    return (data || []) as PreviousQuestion[]
  } catch (error) {
    console.error('❌ [QUIZ DEDUP] Error in getPreviousQuestions:', error)
    return []
  }
}

/**
 * Get wrong answers for a document/user to focus on in redo quiz
 */
export async function getWrongAnswers(
  userId: string,
  documentId: string | null,
  topicHash: string | null
): Promise<WrongAnswer[]> {
  const adminClient = createAdminClient()

  try {
    // First, get question history IDs for the document/topic
    let questionHistoryQuery = adminClient
      .from('quiz_question_history')
      .select('id, question_text, question_type, options, correct_answer, explanation, source_document')
      .eq('user_id', userId)

    if (documentId) {
      questionHistoryQuery = questionHistoryQuery.eq('document_id', documentId)
    } else if (topicHash) {
      questionHistoryQuery = questionHistoryQuery.eq('topic_hash', topicHash)
    } else {
      return []
    }

    const { data: questionHistory, error: historyError } = await questionHistoryQuery

    if (historyError || !questionHistory || questionHistory.length === 0) {
      return []
    }

    const questionIds = questionHistory.map(q => q.id)

    // Get wrong answers for these questions
    const { data: wrongAnswers, error: answersError } = await adminClient
      .from('quiz_answer_history')
      .select('question_history_id, is_correct')
      .in('question_history_id', questionIds)
      .eq('user_id', userId)
      .eq('is_correct', false)

    if (answersError) {
      console.error('❌ [QUIZ DEDUP] Error fetching wrong answers:', answersError)
      return []
    }

    // Count wrong attempts per question
    const wrongCountMap = new Map<string, number>()
    ;(wrongAnswers || []).forEach((answer: any) => {
      const count = wrongCountMap.get(answer.question_history_id) || 0
      wrongCountMap.set(answer.question_history_id, count + 1)
    })

    // Map question history to wrong answers with counts
    const result: WrongAnswer[] = questionHistory
      .filter(q => wrongCountMap.has(q.id))
      .map(q => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        source_document: q.source_document || '',
        wrong_count: wrongCountMap.get(q.id) || 0
      }))
      .sort((a, b) => b.wrong_count - a.wrong_count)

    return result
  } catch (error) {
    console.error('❌ [QUIZ DEDUP] Error in getWrongAnswers:', error)
    return []
  }
}

/**
 * Check if a question is a duplicate (similarity check)
 */
export function isQuestionDuplicate(
  newQuestion: string,
  previousQuestions: PreviousQuestion[],
  threshold: number = 0.8
): boolean {
  // Simple similarity check - can be enhanced with more sophisticated NLP
  const normalizedNew = newQuestion.toLowerCase().trim()
  
  for (const prev of previousQuestions) {
    const normalizedPrev = prev.question_text.toLowerCase().trim()
    
    // Exact match
    if (normalizedNew === normalizedPrev) {
      return true
    }
    
    // Check if questions are very similar (simple word overlap)
    const newWords = new Set(normalizedNew.split(/\s+/))
    const prevWords = new Set(normalizedPrev.split(/\s+/))
    
    const intersection = new Set([...newWords].filter(x => prevWords.has(x)))
    const union = new Set([...newWords, ...prevWords])
    
    const similarity = intersection.size / union.size
    
    if (similarity >= threshold) {
      return true
    }
  }
  
  return false
}

/**
 * Store questions in history for deduplication
 */
export async function storeQuestionHistory(
  userId: string,
  documentId: string | null,
  topicHash: string | null,
  questions: Array<{
    question: string
    type: string
    options?: any
    correct_answer: string | number
    explanation: string
    source_document?: string
  }>,
  sessionId?: string
): Promise<void> {
  const adminClient = createAdminClient()

  try {
    // Check if user exists before trying to insert
    const { data: userExists } = await adminClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!userExists) {
      console.error(`❌ [QUIZ DEDUP] User ${userId} does not exist in users table. Cannot store question history.`)
      // Try to ensure user exists
      try {
        const { ensureUserExists } = await import('@/lib/utils/ensure-user-exists')
        const created = await ensureUserExists(userId)
        if (!created) {
          console.error(`❌ [QUIZ DEDUP] Failed to create user ${userId}. Skipping question history storage.`)
          return
        }
        console.log(`✅ [QUIZ DEDUP] User ${userId} created, proceeding with question history storage`)
      } catch (ensureError) {
        console.error(`❌ [QUIZ DEDUP] Error ensuring user exists:`, ensureError)
        return
      }
    }

    const questionsToInsert = questions.map(q => ({
      user_id: userId,
      document_id: documentId,
      topic_hash: topicHash,
      question_text: q.question,
      question_type: q.type,
      options: q.options || null,
      correct_answer: typeof q.correct_answer === 'number' 
        ? (q.options?.[q.correct_answer] || String(q.correct_answer))
        : String(q.correct_answer),
      explanation: q.explanation,
      source_document: q.source_document || null,
      session_id: sessionId || null
    }))

    const { error } = await adminClient
      .from('quiz_question_history')
      .insert(questionsToInsert)

    if (error) {
      // Check if it's a foreign key constraint violation
      if (error.code === '23503' && error.message.includes('user_id')) {
        console.error(`❌ [QUIZ DEDUP] Foreign key violation: User ${userId} does not exist in users table`)
        console.error(`   This should have been caught earlier. User may have been deleted.`)
      } else {
        console.error('❌ [QUIZ DEDUP] Error storing question history:', error)
      }
      // Don't throw - this is not critical for quiz generation
    } else {
      console.log(`✅ [QUIZ DEDUP] Stored ${questionsToInsert.length} questions in history`)
    }
  } catch (error) {
    console.error('❌ [QUIZ DEDUP] Error in storeQuestionHistory:', error)
    // Don't throw - this is not critical for quiz generation
  }
}

/**
 * Store answer history for tracking wrong answers
 */
export async function storeAnswerHistory(
  userId: string,
  questionHistoryId: string,
  userAnswer: string,
  isCorrect: boolean,
  sessionId?: string
): Promise<void> {
  const adminClient = createAdminClient()

  try {
    const { error } = await adminClient
      .from('quiz_answer_history')
      .insert({
        user_id: userId,
        question_history_id: questionHistoryId,
        session_id: sessionId || null,
        user_answer: userAnswer,
        is_correct: isCorrect
      })

    if (error) {
      console.error('❌ [QUIZ DEDUP] Error storing answer history:', error)
      // Don't throw - this is not critical
    }
  } catch (error) {
    console.error('❌ [QUIZ DEDUP] Error in storeAnswerHistory:', error)
    // Don't throw - this is not critical
  }
}

