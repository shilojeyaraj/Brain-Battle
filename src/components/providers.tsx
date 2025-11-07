"use client"

import React from "react"
import { MotionConfig } from "framer-motion"
import { SoundSettingsProvider, useSoundSettings } from "@/context/sound-settings"
import { ClientWrapper } from "@/components/client-wrapper"

function MotionProvider({ children }: { children: React.ReactNode }) {
  const { reducedMotion } = useSoundSettings()
  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      {children}
    </MotionConfig>
  )
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClientWrapper>
      <SoundSettingsProvider>
        <MotionProvider>{children}</MotionProvider>
      </SoundSettingsProvider>
    </ClientWrapper>
  )
}


