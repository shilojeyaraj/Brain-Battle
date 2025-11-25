"use client"

import Image from "next/image"
import { LoadingAnimation } from "./loading-animation"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

interface BrainBattleLoadingProps {
  message?: string
}

const loadingTips = [
  "💡 Did you know? Regular practice improves retention by up to 40%",
  "🧠 Active recall is 2x more effective than passive reading",
  "⚡ Spaced repetition helps move info from short-term to long-term memory",
  "🎯 Testing yourself strengthens neural pathways more than re-reading",
  "📚 Mixing different topics (interleaving) improves learning transfer",
  "⏱️ The Pomodoro Technique (25-min sessions) boosts focus and retention",
  "🎨 Visual diagrams and mind maps activate multiple brain regions",
  "🤝 Teaching concepts to others helps you understand them better",
  "💪 Consistency beats intensity - 20 minutes daily > 2 hours weekly",
  "🌟 Mistakes are learning opportunities - embrace the struggle!",
]

export function BrainBattleLoading({ message = "Loading your Brain Battle experience..." }: BrainBattleLoadingProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Preload the logo image immediately
  useEffect(() => {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = '/brain-battle-logo.png'
    link.setAttribute('fetchpriority', 'high')
    document.head.appendChild(link)

    // Also preload via Image object for immediate caching
    const img = new window.Image()
    img.src = '/brain-battle-logo.png'
    img.onload = () => setImageLoaded(true)
    
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % loadingTips.length)
    }, 5000) // Change tip every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(135deg, #0a1628 0%, #1e3a5f 30%, #2d4a6f 60%, #0a1628 100%)",
            "linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 30%, #0a1628 60%, #1e3a5f 100%)",
            "linear-gradient(135deg, #2d4a6f 0%, #0a1628 30%, #1e3a5f 60%, #2d4a6f 100%)",
            "linear-gradient(135deg, #0a1628 0%, #1e3a5f 30%, #2d4a6f 60%, #0a1628 100%)",
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center -mt-40">
        {/* Logo - Bigger but responsive with preload */}
        <div className="w-[800px] h-[800px] md:w-[850px] md:h-[850px] flex items-center justify-center">
          <Image
            src="/brain-battle-logo.png"
            alt="Brain Battle"
            width={850}
            height={850}
            className={`w-full h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            priority
            fetchPriority="high"
            quality={100}
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <div className="absolute w-full h-full bg-slate-800/30 rounded-lg animate-pulse" />
          )}
        </div>
        
        {/* Loading Animation - Fixed position in bottom 25% */}
        <div className="absolute bottom-[15%] left-1/2 transform -translate-x-1/2">
          <LoadingAnimation />
        </div>
        
        {/* Loading Text */}
        <div className="absolute bottom-[10%] left-1/2 transform -translate-x-1/2">
          <p className="text-white/60 font-bold">
            {message}
          </p>
        </div>
        
        {/* Rotating Tips - Right under loading text with small gap */}
        <div className="absolute bottom-[1%] left-1/2 transform -translate-x-1/2 max-w-2xl px-4 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="text-center"
            >
              <div className="relative inline-block p-[2px] bg-gradient-to-r from-blue-400/60 to-orange-400/60 rounded-lg">
                <div className="bg-gradient-to-r from-blue-500/10 to-orange-500/10 rounded-lg px-6 py-4 backdrop-blur-sm">
                  <p className="text-white/80 text-sm md:text-base font-medium">
                    {loadingTips[currentTipIndex]}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

