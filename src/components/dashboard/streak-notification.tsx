"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Flame, X, TrendingUp, AlertCircle } from "lucide-react"
import { useEffect } from "react"

interface StreakNotificationProps {
  type: "increased" | "lost"
  newStreak: number
  previousStreak: number
  onClose: () => void
}

export function StreakNotification({ type, newStreak, previousStreak, onClose }: StreakNotificationProps) {
  useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  const isIncrease = type === "increased"
  const isLost = type === "lost"

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <Card
          className={`
            p-6 border-4 shadow-2xl
            ${
              isIncrease
                ? "bg-gradient-to-br from-orange-500/95 to-orange-600/95 border-orange-400/80"
                : "bg-gradient-to-br from-red-500/95 to-red-600/95 border-red-400/80"
            }
          `}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: isIncrease ? [0, 10, -10, 0] : [0, -10, 10, 0],
                }}
                transition={{ duration: 0.6, repeat: 2 }}
                className={`
                  w-16 h-16 rounded-xl flex items-center justify-center border-4
                  ${
                    isIncrease
                      ? "bg-gradient-to-br from-orange-300 to-orange-400 border-orange-400/80"
                      : "bg-gradient-to-br from-red-300 to-red-400 border-red-400/80"
                  }
                `}
              >
                {isIncrease ? (
                  <TrendingUp className="w-8 h-8 text-white" strokeWidth={3} />
                ) : (
                  <AlertCircle className="w-8 h-8 text-white" strokeWidth={3} />
                )}
              </motion.div>

              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-1">
                  {isIncrease ? "🔥 Streak Increased!" : "💔 Streak Lost!"}
                </h3>
                <p className="text-white/90 font-bold">
                  {isIncrease ? (
                    <>
                      Your streak is now <span className="text-orange-200 text-xl">{newStreak}</span> day
                      {newStreak !== 1 ? "s" : ""}!
                    </>
                  ) : (
                    <>
                      Your streak of <span className="text-red-200 text-xl">{previousStreak}</span> day
                      {previousStreak !== 1 ? "s" : ""} has been lost. Start a new one today!
                    </>
                  )}
                </p>
                {isIncrease && newStreak >= 7 && (
                  <p className="text-sm text-orange-200/80 mt-2 font-bold">
                    🎉 Amazing! You're on fire!
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Close notification"
            >
              <X className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

