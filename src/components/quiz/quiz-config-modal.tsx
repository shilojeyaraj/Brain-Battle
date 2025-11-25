"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"

interface QuizConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (config: QuizConfig) => void
  maxQuestions: number
  defaultQuestions: number
}

export interface QuizConfig {
  totalQuestions: number
  questionTypes: {
    multiple_choice: boolean
    open_ended: boolean
    true_false: boolean
  }
  contentFocus: 'application' | 'concept' | 'both'
  includeDiagrams: boolean
}

export function QuizConfigModal({ 
  isOpen, 
  onClose, 
  onStart, 
  maxQuestions,
  defaultQuestions 
}: QuizConfigModalProps) {
  const [totalQuestions, setTotalQuestions] = useState(defaultQuestions)
  const [questionTypes, setQuestionTypes] = useState({
    multiple_choice: true,
    open_ended: true,
    true_false: true
  })
  const [contentFocus, setContentFocus] = useState<'application' | 'concept' | 'both'>('both')
  const [includeDiagrams, setIncludeDiagrams] = useState(true)

  if (!isOpen) return null

  const handleTypeToggle = (type: keyof typeof questionTypes) => {
    setQuestionTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const handleStart = () => {
    // Ensure at least one question type is selected
    if (!questionTypes.multiple_choice && !questionTypes.open_ended && !questionTypes.true_false) {
      alert("Please select at least one question type!")
      return
    }

    onStart({
      totalQuestions,
      questionTypes,
      contentFocus,
      includeDiagrams
    })
  }

  // Get question type preset value
  const getQuestionTypePreset = () => {
    if (questionTypes.multiple_choice && questionTypes.open_ended && questionTypes.true_false) return 'mix'
    if (questionTypes.multiple_choice && !questionTypes.open_ended && !questionTypes.true_false) return 'multiple_choice'
    if (!questionTypes.multiple_choice && questionTypes.open_ended && !questionTypes.true_false) return 'open_ended'
    if (!questionTypes.multiple_choice && !questionTypes.open_ended && questionTypes.true_false) return 'true_false'
    return 'custom'
  }

  const handleQuestionTypeChange = (value: string) => {
    switch (value) {
      case 'multiple_choice':
        setQuestionTypes({ multiple_choice: true, open_ended: false, true_false: false })
        break
      case 'open_ended':
        setQuestionTypes({ multiple_choice: false, open_ended: true, true_false: false })
        break
      case 'true_false':
        setQuestionTypes({ multiple_choice: false, open_ended: false, true_false: true })
        break
      case 'mix':
        setQuestionTypes({ multiple_choice: true, open_ended: true, true_false: true })
        break
      default:
        // Keep current for custom
        break
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-md bg-slate-700 border-4 border-slate-600/50 shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white">Quiz Configuration</h2>
          <Button 
            onClick={onClose}
            className="bg-slate-600/50 hover:bg-slate-600 rounded-xl border-4 border-slate-500/50 p-2"
          >
            <X className="h-5 w-5 text-white" strokeWidth={3} />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Number of Questions */}
          <div>
            <label className="text-base font-bold text-white mb-3 block">
              Number of Questions
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max={maxQuestions}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <div className="w-16 text-center">
                <span className="text-2xl font-black text-blue-400">{totalQuestions}</span>
              </div>
            </div>
            <p className="text-sm text-white/70 font-bold mt-2">
              Max: {maxQuestions} questions
            </p>
          </div>

          {/* Question Types */}
          <div>
            <label className="text-base font-bold text-white mb-2 block">
              Question Types
            </label>
            <Select value={getQuestionTypePreset()} onValueChange={handleQuestionTypeChange}>
              <SelectTrigger className="w-full bg-slate-800 border-2 border-slate-600/50 text-white font-bold focus:border-blue-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-2 border-slate-600/50">
                <SelectItem value="multiple_choice" className="text-white focus:bg-slate-700">
                  All Multiple Choice
                </SelectItem>
                <SelectItem value="open_ended" className="text-white focus:bg-slate-700">
                  All Open Answer
                </SelectItem>
                <SelectItem value="true_false" className="text-white focus:bg-slate-700">
                  All True/False
                </SelectItem>
                <SelectItem value="mix" className="text-white focus:bg-slate-700">
                  Mix of Everything
                </SelectItem>
                <SelectItem value="custom" className="text-white focus:bg-slate-700">
                  Custom Selection
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Custom Selection Checkboxes - Only show if custom is selected */}
            {getQuestionTypePreset() === 'custom' && (
              <div className="mt-3 p-3 rounded-lg bg-slate-600/30 border-2 border-slate-500/30">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={questionTypes.multiple_choice}
                      onChange={() => handleTypeToggle('multiple_choice')}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-sm text-white font-bold">Multiple Choice</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={questionTypes.open_ended}
                      onChange={() => handleTypeToggle('open_ended')}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-sm text-white font-bold">Open Answer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={questionTypes.true_false}
                      onChange={() => handleTypeToggle('true_false')}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-sm text-white font-bold">True/False</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Content Focus Selection */}
          <div>
            <label className="text-base font-bold text-white mb-2 block">
              Content Focus
            </label>
            <Select value={contentFocus} onValueChange={(value: 'application' | 'concept' | 'both') => setContentFocus(value)}>
              <SelectTrigger className="w-full bg-slate-800 border-2 border-slate-600/50 text-white font-bold focus:border-blue-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-2 border-slate-600/50">
                <SelectItem value="application" className="text-white focus:bg-slate-700">
                  Application
                </SelectItem>
                <SelectItem value="concept" className="text-white focus:bg-slate-700">
                  Concept
                </SelectItem>
                <SelectItem value="both" className="text-white focus:bg-slate-700">
                  Both
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/60 font-bold mt-1">
              {contentFocus === 'application' && 'Use cases, formulas, and problem-solving'}
              {contentFocus === 'concept' && 'Definitions, explanations, and understanding'}
              {contentFocus === 'both' && 'Mix of applications and concepts'}
            </p>
          </div>

          {/* Include Diagrams Toggle */}
          <div>
            <label className="text-base font-bold text-white mb-2 block">
              Diagram Options
            </label>
            <div className="p-3 rounded-lg bg-slate-600/30 border-2 border-slate-500/30">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDiagrams}
                  onChange={(e) => setIncludeDiagrams(e.target.checked)}
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm text-white font-bold block">Include Image-Generated Diagrams</span>
                  <span className="text-xs text-white/60 font-bold">Generate diagrams for questions that need visual aids</span>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={onClose}
              className="flex-1 bg-slate-600/50 hover:bg-slate-600 text-white font-black border-4 border-slate-500/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStart}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black border-2 border-blue-400"
            >
              Start Battle
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

