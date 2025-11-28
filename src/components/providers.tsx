"use client"

import React from "react"
import { MotionConfig } from "@/components/ui/motion"
import { SoundSettingsProvider, useSoundSettings } from "@/context/sound-settings"
import { ClientWrapper } from "@/components/client-wrapper"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import { ToastProvider } from "@/components/ui/toast"

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
        <PostHogProvider>
          <ToastProvider>
            <MotionProvider>{children}</MotionProvider>
          </ToastProvider>
        </PostHogProvider>
      </SoundSettingsProvider>
    </ClientWrapper>
  )
}


