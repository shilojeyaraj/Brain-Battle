"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Brain, 
  Settings, 
  FileText, 
  Calculator, 
  BookOpen,
  CheckCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react'

interface QuizConfigurationProps {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  documents: any[]
  onGenerateQuiz: (config: QuizConfig) => void
  isGenerating: boolean
}

interface QuizConfig {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  question_type: 'multiple_choice' | 'fill_blank' | 'both'
  question_count: number
  time_per_question: number
  content_analysis: ContentAnalysis
  contentFocus: 'application' | 'concept' | 'both'
  includeDiagrams: boolean
}

interface ContentAnalysis {
  subject_type: 'math_science' | 'language_arts' | 'social_studies' | 'mixed'
  calculation_heavy: boolean
  concept_heavy: boolean
  recommended_question_type: 'multiple_choice' | 'fill_blank' | 'both'
  confidence: number
  reasoning: string
}

export default function QuizConfiguration({ 
  topic, 
  difficulty, 
  documents, 
  onGenerateQuiz, 
  isGenerating 
}: QuizConfigurationProps) {
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'fill_blank' | 'both'>('both')
  const [questionCount, setQuestionCount] = useState(10)
  const [timePerQuestion, setTimePerQuestion] = useState(60)
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [contentFocus, setContentFocus] = useState<'application' | 'concept' | 'both'>('both')
  const [includeDiagrams, setIncludeDiagrams] = useState(true)

  // Analyze document content when topic or documents change
  useEffect(() => {
    if (topic && documents.length > 0) {
      analyzeContent()
    }
  }, [topic, documents])

  const analyzeContent = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          documents: documents,
          difficulty: difficulty
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setContentAnalysis(result.analysis)
        // Auto-set question type based on analysis
        setQuestionType(result.analysis.recommended_question_type)
      }
    } catch (error) {
      console.error('Error analyzing content:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSubjectIcon = (subjectType: string) => {
    switch (subjectType) {
      case 'math_science': return <Calculator className="h-5 w-5" strokeWidth={3} />
      case 'language_arts': return <BookOpen className="h-5 w-5" strokeWidth={3} />
      case 'social_studies': return <FileText className="h-5 w-5" strokeWidth={3} />
      default: return <Brain className="h-5 w-5" strokeWidth={3} />
    }
  }

  const getSubjectColor = (subjectType: string) => {
    switch (subjectType) {
      case 'math_science': return 'bg-primary text-primary-foreground'
      case 'language_arts': return 'bg-chart-3 text-foreground'
      case 'social_studies': return 'bg-secondary text-secondary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getQuestionTypeDescription = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Best for testing knowledge, definitions, and concept recognition'
      case 'fill_blank':
        return 'Best for calculations, problem-solving, and detailed explanations'
      case 'both':
        return 'Mixed approach - combines knowledge testing with problem-solving'
      default:
        return ''
    }
  }

  const handleGenerateQuiz = () => {
    const config: QuizConfig = {
      topic,
      difficulty,
      question_type: questionType,
      question_count: questionCount,
      time_per_question: timePerQuestion,
      content_analysis: contentAnalysis || {
        subject_type: 'mixed',
        calculation_heavy: false,
        concept_heavy: true,
        recommended_question_type: 'both',
        confidence: 0.5,
        reasoning: 'Default analysis'
      },
      contentFocus,
      includeDiagrams
    }

    onGenerateQuiz(config)
  }

  return (
    <div className="space-y-6">
      {/* Content Analysis */}
      {contentAnalysis && (
        <Card className="p-6 bg-card cartoon-border cartoon-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-6 w-6 text-primary" strokeWidth={3} />
            <h3 className="text-xl font-black text-foreground">Content Analysis</h3>
            <Badge className={`cartoon-border font-black ${getSubjectColor(contentAnalysis.subject_type)}`}>
              {contentAnalysis.subject_type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Analysis Results */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 cartoon-border">
                <div className="flex items-center gap-2 mb-2">
                  {getSubjectIcon(contentAnalysis.subject_type)}
                  <span className="font-black text-foreground">Subject Type</span>
                </div>
                <p className="text-muted-foreground font-bold capitalize">
                  {contentAnalysis.subject_type.replace('_', ' ')}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-secondary/30 cartoon-border">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-chart-3" strokeWidth={3} />
                  <span className="font-black text-foreground">Confidence</span>
                </div>
                <p className="text-muted-foreground font-bold">
                  {(contentAnalysis.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Content Characteristics */}
            <div className="space-y-2">
              <h4 className="font-black text-foreground">Content Characteristics:</h4>
              <div className="flex flex-wrap gap-2">
                {contentAnalysis.calculation_heavy && (
                  <Badge className="cartoon-border bg-primary text-primary-foreground font-bold">
                    <Calculator className="h-3 w-3 mr-1" strokeWidth={3} />
                    Calculation Heavy
                  </Badge>
                )}
                {contentAnalysis.concept_heavy && (
                  <Badge className="cartoon-border bg-chart-3 text-foreground font-bold">
                    <Brain className="h-3 w-3 mr-1" strokeWidth={3} />
                    Concept Heavy
                  </Badge>
                )}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-4 rounded-lg bg-primary/10 cartoon-border">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-primary" strokeWidth={3} />
                <span className="font-black text-primary">AI Recommendation</span>
              </div>
              <p className="text-muted-foreground font-bold">
                {contentAnalysis.reasoning}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Quiz Configuration */}
      <Card className="p-6 bg-card cartoon-border cartoon-shadow">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-primary" strokeWidth={3} />
          <h3 className="text-xl font-black text-foreground">Quiz Configuration</h3>
        </div>

        <div className="space-y-6">
          {/* Question Type Selection */}
          <div>
            <Label className="text-sm font-black text-foreground mb-2 block">
              Question Type
            </Label>
            <Select value={questionType} onValueChange={(value: any) => setQuestionType(value)}>
              <SelectTrigger className="cartoon-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" strokeWidth={3} />
                    Multiple Choice
                  </div>
                </SelectItem>
                <SelectItem value="fill_blank">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" strokeWidth={3} />
                    Fill in the Blank
                  </div>
                </SelectItem>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4" strokeWidth={3} />
                    Both Types
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground font-bold mt-0.5">
              {getQuestionTypeDescription(questionType)}
            </p>
          </div>

          {/* Question Count */}
          <div>
            <Label className="text-sm font-black text-foreground mb-2 block">
              Number of Questions: {questionCount}
            </Label>
            <div className="space-y-2">
              <input
                type="range"
                min="5"
                max="20"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-bold">
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Time Per Question */}
          <div>
            <Label className="text-sm font-black text-foreground mb-2 block">
              Time Per Question: {timePerQuestion} seconds
            </Label>
            <div className="space-y-2">
              <input
                type="range"
                min="30"
                max="120"
                step="15"
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-bold">
                <span>30s</span>
                <span>60s</span>
                <span>90s</span>
                <span>120s</span>
              </div>
            </div>
          </div>

          {/* Content Focus Selection */}
          <div>
            <Label className="text-sm font-black text-foreground mb-2 block">
              Content Focus
            </Label>
            <div className="space-y-2">
              <button
                onClick={() => setContentFocus('application')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  contentFocus === 'application'
                    ? "bg-orange-500/20 text-orange-300 border-orange-400/50"
                    : "bg-muted/50 text-muted-foreground border-muted hover:border-orange-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Application</span>
                    <span className="text-xs opacity-70 font-bold">Use cases, formulas, and problem-solving</span>
                  </div>
                  {contentFocus === 'application' && <CheckCircle className="h-4 w-4 text-orange-400" strokeWidth={3} />}
                </div>
              </button>

              <button
                onClick={() => setContentFocus('concept')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  contentFocus === 'concept'
                    ? "bg-purple-500/20 text-purple-300 border-purple-400/50"
                    : "bg-muted/50 text-muted-foreground border-muted hover:border-purple-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Concept</span>
                    <span className="text-xs opacity-70 font-bold">Definitions, explanations, and understanding</span>
                  </div>
                  {contentFocus === 'concept' && <CheckCircle className="h-4 w-4 text-purple-400" strokeWidth={3} />}
                </div>
              </button>

              <button
                onClick={() => setContentFocus('both')}
                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                  contentFocus === 'both'
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "bg-muted/50 text-muted-foreground border-muted hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold block">Both</span>
                    <span className="text-xs opacity-70 font-bold">Mix of applications and concepts</span>
                  </div>
                  {contentFocus === 'both' && <CheckCircle className="h-4 w-4 text-primary" strokeWidth={3} />}
                </div>
              </button>
            </div>
          </div>

          {/* Include Diagrams Toggle */}
          <div>
            <Label className="text-sm font-black text-foreground mb-2 block">
              Diagram Options
            </Label>
            <div className="p-4 rounded-lg bg-muted/30 cartoon-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDiagrams}
                  onChange={(e) => setIncludeDiagrams(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
                <div>
                  <span className="text-sm text-foreground font-bold block">Include Image-Generated Diagrams</span>
                  <span className="text-xs text-muted-foreground font-bold">Generate diagrams for questions that need visual aids (e.g., physics diagrams, charts, graphs)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Difficulty and Topic Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30 cartoon-border">
              <h4 className="font-black text-foreground mb-1">Topic</h4>
              <p className="text-muted-foreground font-bold">{topic}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 cartoon-border">
              <h4 className="font-black text-foreground mb-1">Difficulty</h4>
              <Badge className={`cartoon-border font-black ${
                difficulty === 'easy' 
                  ? 'bg-chart-3 text-foreground'
                  : difficulty === 'medium'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-destructive text-destructive-foreground'
              }`}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Generate Quiz Button */}
          <Button
            onClick={handleGenerateQuiz}
            disabled={isGenerating || isAnalyzing}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg cartoon-border cartoon-shadow cartoon-hover disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                Generating Quiz...
              </>
            ) : isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground mr-2"></div>
                Analyzing Content...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5 mr-2" strokeWidth={3} />
                Generate Quiz
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
