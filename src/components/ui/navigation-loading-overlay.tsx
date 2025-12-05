"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"

interface NavigationLoadingOverlayProps {
  show: boolean
  message?: string
}

export function NavigationLoadingOverlay({ 
  show, 
  message = "Loading..." 
}: NavigationLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center"
          style={{ 
            minHeight: '100dvh'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-xl p-8 shadow-2xl text-center max-w-md mx-4"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-blue-400">
                <Loader2 className="w-8 h-8 text-white animate-spin" strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white mb-2">{message}</h3>
                <p className="text-sm text-blue-100/70 font-bold">
                  Please wait while we navigate...
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

