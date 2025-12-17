"use client"

import { useState, useEffect } from "react"

interface DailyStreakFlameProps {
  streak: number
  isAnimating?: boolean
  className?: string
}

export function DailyStreakFlame({ streak, isAnimating = false, className = "" }: DailyStreakFlameProps) {
  // Default size if no className provided
  const defaultSize = className || "w-48 h-48 md:w-64 md:h-64"
  
  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${defaultSize}`}>
      {/* Flame SVG */}
      <div className="relative flex-shrink-0">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className={`
            transition-all duration-300
            ${isAnimating ? "scale-110 rotate-6" : "scale-100 rotate-0"}
          `}
        >
          <defs>
            <radialGradient id="fireGradient" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="25%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#FB923C" />
              <stop offset="75%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main flame body */}
          <path
            d="M50 85 C35 85 25 70 25 55 C25 45 30 38 35 30 C38 25 40 22 42 15 C44 25 48 30 52 35 C54 32 56 28 58 20 C60 30 65 38 70 45 C73 50 75 55 75 60 C75 75 65 85 50 85 Z"
            fill="url(#fireGradient)"
            filter="url(#glow)"
            stroke="none"
          />

          {/* Inner flame detail */}
          <path
            d="M50 75 C42 75 38 68 38 60 C38 55 40 50 43 45 C45 42 47 40 48 35 C49 40 51 43 53 46 C54 44 55 42 56 38 C57 43 60 48 62 52 C63 55 64 58 64 61 C64 70 58 75 50 75 Z"
            fill="#FEF9C3"
            opacity="0.6"
            stroke="none"
          />
        </svg>

        {/* Glow effect on animation */}
        {isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 bg-orange-400 rounded-full opacity-40 animate-ping" />
          </div>
        )}
      </div>

      {/* Streak number positioned below the flame - Duolingo style */}
      <div className="mt-2 flex items-center justify-center gap-3 md:gap-4 flex-wrap min-w-[200px] md:min-w-[280px]">
        <span
          className={`
            text-5xl md:text-6xl lg:text-7xl font-black
            transition-all duration-300
            ${isAnimating ? "scale-125" : "scale-100"}
            whitespace-nowrap
            flex-shrink-0
          `}
          style={{
            color: '#F97316',
            textShadow: `
              0 2px 8px rgba(251, 146, 60, 0.6),
              0 4px 16px rgba(249, 115, 22, 0.4),
              0 0 20px rgba(251, 146, 60, 0.3)
            `,
          }}
        >
          {streak}
        </span>
        <span 
          className={`
            text-3xl md:text-4xl lg:text-5xl font-black
            transition-all duration-300
            ${isAnimating ? "scale-125" : "scale-100"}
            whitespace-nowrap
            flex-shrink-0
          `}
          style={{
            color: '#F97316',
            textShadow: `
              0 2px 8px rgba(251, 146, 60, 0.6),
              0 4px 16px rgba(249, 115, 22, 0.4),
              0 0 20px rgba(251, 146, 60, 0.3)
            `,
          }}
        >
          day streak
        </span>
      </div>
    </div>
  )
}

