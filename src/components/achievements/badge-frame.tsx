import type React from "react"
import { cn } from "@/lib/utils"

export type Rarity = "common" | "rare" | "epic" | "legendary"

type BadgeFrameProps = {
  rarity: Rarity
  size?: number
  children?: React.ReactNode
  className?: string
  showGlow?: boolean
}

const rarityColors = {
  common: {
    border: "#475569",
    fill: "#94a3b8",
    glow: "none",
  },
  rare: {
    border: "#2563eb",
    fill: "#60a5fa",
    glow: "#3b82f6",
  },
  epic: {
    border: "#7c3aed",
    fill: "#a855f7",
    glow: "#8b5cf6",
  },
  legendary: {
    border: "#ea580c",
    fill: "#fbbf24",
    glow: "#f59e0b",
  },
}

export function BadgeFrame({ rarity, size = 128, children, className, showGlow = false }: BadgeFrameProps) {
  const colors = rarityColors[rarity]
  const strokeWidth = 4
  const glowSize = showGlow && rarity === "legendary" ? 8 : 0

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Glow effect for legendary */}
      {showGlow && rarity === "legendary" && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            filter: `blur(${glowSize}px)`,
            background: `radial-gradient(circle, ${colors.glow}40 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Badge frame SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        {/* Outer decorative ring */}
        <circle cx="64" cy="64" r="60" fill="none" stroke={colors.border} strokeWidth={strokeWidth} opacity="0.3" />

        {/* Main badge circle */}
        <circle cx="64" cy="64" r="54" fill="transparent" stroke={colors.border} strokeWidth={strokeWidth * 1.5} />

        {/* Inner highlight ring */}
        <circle cx="64" cy="64" r="48" fill="none" stroke={colors.fill} strokeWidth={strokeWidth / 2} opacity="0.4" />

        {/* Corner decorations for rare and above */}
        {rarity !== "common" && (
          <>
            <path d="M64 8L68 16L64 12L60 16L64 8Z" fill={colors.fill} stroke={colors.border} strokeWidth="1.5" />
            <path
              d="M120 64L112 68L116 64L112 60L120 64Z"
              fill={colors.fill}
              stroke={colors.border}
              strokeWidth="1.5"
            />
            <path
              d="M64 120L60 112L64 116L68 112L64 120Z"
              fill={colors.fill}
              stroke={colors.border}
              strokeWidth="1.5"
            />
            <path d="M8 64L16 60L12 64L16 68L8 64Z" fill={colors.fill} stroke={colors.border} strokeWidth="1.5" />
          </>
        )}

        {/* Extra stars for epic */}
        {rarity === "epic" && (
          <>
            <circle cx="24" cy="24" r="3" fill={colors.fill} stroke={colors.border} strokeWidth="1" />
            <circle cx="104" cy="24" r="3" fill={colors.fill} stroke={colors.border} strokeWidth="1" />
            <circle cx="24" cy="104" r="3" fill={colors.fill} stroke={colors.border} strokeWidth="1" />
            <circle cx="104" cy="104" r="3" fill={colors.fill} stroke={colors.border} strokeWidth="1" />
          </>
        )}

        {/* Legendary sparkles */}
        {rarity === "legendary" && (
          <>
            <path d="M20 20L22 24L20 22L18 24L20 20Z" fill="#fef3c7" stroke={colors.border} strokeWidth="1" />
            <path d="M108 20L110 24L108 22L106 24L108 20Z" fill="#fef3c7" stroke={colors.border} strokeWidth="1" />
            <path d="M20 108L18 104L20 106L22 104L20 108Z" fill="#fef3c7" stroke={colors.border} strokeWidth="1" />
            <path d="M108 108L106 104L108 106L110 104L108 108Z" fill="#fef3c7" stroke={colors.border} strokeWidth="1" />
            <circle cx="32" cy="18" r="2" fill="#fef3c7" opacity="0.8" />
            <circle cx="96" cy="18" r="2" fill="#fef3c7" opacity="0.8" />
            <circle cx="18" cy="32" r="2" fill="#fef3c7" opacity="0.8" />
            <circle cx="110" cy="32" r="2" fill="#fef3c7" opacity="0.8" />
          </>
        )}
      </svg>

      {/* Icon content */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: size * 0.6, height: size * 0.6 }}>
        {children}
      </div>
    </div>
  )
}

