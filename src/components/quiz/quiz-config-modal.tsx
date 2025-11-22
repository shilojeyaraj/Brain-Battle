"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Check } from "lucide-react"

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
      questionTypes
    })
  }

  const isMix = questionTypes.multiple_choice && questionTypes.open_ended && questionTypes.true_false
  const isAllMCQ = questionTypes.multiple_choice && !questionTypes.open_ended && !questionTypes.true_false
  const isAllOpen = !questionTypes.multiple_choice && questionTypes.open_ended && !questionTypes.true_false
  const isAllTrueFalse = !questionTypes.multiple_choice && !questionTypes.open_ended && questionTypes.true_false

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-slate-700/50 border-4 border-slate-600/50 shadow-lg p-6">
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
            <label className="text-base font-bold text-white mb-3 block">
              Question Types
            </label>
            <div className="space-y-3">
              {/* All Multiple Choice */}
              <button
                onClick={() => setQuestionTypes({ multiple_choice: true, open_ended: false, true_false: false })}
                className={`w-full p-4 rounded-xl border-4 transition-all ${
                  isAllMCQ
                    ? "bg-blue-500/20 text-blue-300 border-blue-400/50"
                    : "bg-slate-600/50 text-white/70 border-slate-500/50 hover:border-blue-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">All Multiple Choice</span>
                  {isAllMCQ && <Check className="h-5 w-5 text-blue-400" strokeWidth={3} />}
                </div>
              </button>

              {/* All Open Answer */}
              <button
                onClick={() => setQuestionTypes({ multiple_choice: false, open_ended: true, true_false: false })}
                className={`w-full p-4 rounded-xl border-4 transition-all ${
                  isAllOpen
                    ? "bg-blue-500/20 text-blue-300 border-blue-400/50"
                    : "bg-slate-600/50 text-white/70 border-slate-500/50 hover:border-blue-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">All Open Answer</span>
                  {isAllOpen && <Check className="h-5 w-5 text-blue-400" strokeWidth={3} />}
                </div>
              </button>

              {/* All True/False */}
              <button
                onClick={() => setQuestionTypes({ multiple_choice: false, open_ended: false, true_false: true })}
                className={`w-full p-4 rounded-xl border-4 transition-all ${
                  isAllTrueFalse
                    ? "bg-blue-500/20 text-blue-300 border-blue-400/50"
                    : "bg-slate-600/50 text-white/70 border-slate-500/50 hover:border-blue-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">All True/False</span>
                  {isAllTrueFalse && <Check className="h-5 w-5 text-blue-400" strokeWidth={3} />}
                </div>
              </button>

              {/* Mix of Everything */}
              <button
                onClick={() => setQuestionTypes({ multiple_choice: true, open_ended: true, true_false: true })}
                className={`w-full p-4 rounded-xl border-4 transition-all ${
                  isMix
                    ? "bg-blue-500/20 text-blue-300 border-blue-400/50"
                    : "bg-slate-600/50 text-white/70 border-slate-500/50 hover:border-blue-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Mix of Everything</span>
                  {isMix && <Check className="h-5 w-5 text-blue-400" strokeWidth={3} />}
                </div>
              </button>

              {/* Custom Selection */}
              {!isMix && !isAllMCQ && !isAllOpen && !isAllTrueFalse && (
                <div className="p-4 rounded-xl bg-slate-600/30 border-2 border-slate-500/30">
                  <p className="text-sm font-bold text-white/70 mb-2">Custom Selection:</p>
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

