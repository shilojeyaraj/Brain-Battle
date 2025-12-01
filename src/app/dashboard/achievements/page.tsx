"use client"

import { Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AchievementGallery } from "@/components/achievements/achievement-gallery"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AchievementsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10">
        <Suspense fallback={null}>
          <DashboardHeader />
        </Suspense>

        <main className="container mx-auto px-6 py-12">
          {/* Back to Dashboard Button */}
          <div className="mb-6">
            <Link href="/dashboard">
              <Button 
                className="font-black border-4 border-orange-400/50 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 cartoon-border cartoon-shadow"
              >
                <ArrowLeft className="h-5 w-5 mr-2" strokeWidth={3} />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Achievement Gallery */}
          <div>
            <AchievementGallery />
          </div>
        </main>
      </div>
    </div>
  )
}


