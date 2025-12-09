"use client"

import React, { Suspense } from "react"
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

import { GlobalNavigationLoading } from "@/components/global-navigation-loading"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClientWrapper>
      <SoundSettingsProvider>
        <PostHogProvider>
          <ToastProvider>
            <MotionProvider>
              {children}
              <Suspense fallback={null}>
                <GlobalNavigationLoading />
              </Suspense>
            </MotionProvider>
          </ToastProvider>
        </PostHogProvider>
      </SoundSettingsProvider>
    </ClientWrapper>
  )
}


