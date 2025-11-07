"use client"

import { AnimatePresence, motion } from "framer-motion"

interface RewardToastProps {
  show: boolean
  message: string
  className?: string
}

export function RewardToast({ show, message, className = "" }: RewardToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 ${className}`}
        >
          <div className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg border-2 border-primary/60 cartoon-border cartoon-shadow">
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


