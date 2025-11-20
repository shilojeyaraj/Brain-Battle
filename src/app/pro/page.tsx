"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Crown, Sparkles, ArrowLeft, Zap, Infinity, Users, FileText, Brain, Trophy } from "lucide-react"
import Link from "next/link"

export default function ProPage() {
  const freeFeatures = [
    { name: "Basic Study Notes", included: true },
    { name: "Quiz Generation (10 per day)", included: true },
    { name: "Singleplayer Battles", included: true },
    { name: "Multiplayer Rooms (up to 4 players)", included: true },
    { name: "Basic Leaderboard", included: true },
    { name: "XP & Leveling System", included: true },
    { name: "PDF Upload (up to 10MB)", included: true },
    { name: "Basic AI Question Generation", included: true },
    { name: "Unlimited Quiz Questions", included: false },
    { name: "Advanced AI Features", included: false },
    { name: "Priority Support", included: false },
    { name: "Custom Study Plans", included: false },
    { name: "Export Notes (PDF)", included: true },
    { name: "Progress Analytics", included: false },
    { name: "Unlimited File Uploads", included: false },
  ]

  const proFeatures = [
    { name: "Everything in Free", included: true, highlight: true },
    { name: "Unlimited Quiz Generation", included: true },
    { name: "Advanced AI Question Generation", included: true },
    { name: "Unlimited File Uploads (up to 50MB)", included: true },
    { name: "Multiplayer Rooms (up to 20 players)", included: true },
    { name: "Priority Support", included: true },
    { name: "Custom Study Plans", included: true },
    { name: "Advanced Progress Analytics", included: true },
    { name: "Export Notes (PDF, Markdown, DOCX)", included: true },
    { name: "Early Access to New Features", included: true },
    { name: "Ad-Free Experience", included: true },
    { name: "Custom Themes", included: true },
    { name: "Study Streak Tracking", included: true },
    { name: "Advanced Diagram Analysis", included: true },
    { name: "Voice Notes Integration", included: true },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-300/70 hover:text-blue-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={3} />
            <span className="font-bold">Back to Dashboard</span>
          </Link>
          
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 mb-4">
              <Crown className="w-8 h-8 text-yellow-500" strokeWidth={3} />
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Brain Battle Pro
              </h1>
            </div>
            <p className="text-blue-100/70 font-bold text-lg">
              Unlock the full potential of your study sessions
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Free Plan */}
          <Card className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 cartoon-shadow">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white mb-2">Free Plan</h2>
              <div className="text-4xl font-black text-blue-300 mb-1">$0</div>
              <p className="text-blue-100/70 font-bold">Forever free</p>
            </div>
            
            <div className="space-y-3 mb-6">
              {freeFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-chart-3 flex-shrink-0" strokeWidth={3} />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground flex-shrink-0" strokeWidth={3} />
                  )}
                  <span className={`font-bold ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
              disabled
            >
              Current Plan
            </Button>
          </Card>

          {/* Pro Plan */}
          <Card className="p-8 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-4 border-yellow-500/50 cartoon-shadow relative overflow-hidden">
            {/* Pro Badge */}
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                PRO
              </Badge>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white mb-2">Pro Plan</h2>
              <div className="text-4xl font-black text-yellow-400 mb-1">$4.99</div>
              <p className="text-blue-100/70 font-bold">per month</p>
            </div>
            
            <div className="space-y-3 mb-6">
              {proFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className={`w-5 h-5 flex-shrink-0 ${feature.highlight ? 'text-yellow-400' : 'text-chart-3'}`} strokeWidth={3} />
                  <span className={`font-bold ${feature.highlight ? 'text-yellow-300' : 'text-foreground'}`}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-black text-lg cartoon-border cartoon-shadow cartoon-hover"
            >
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to Pro
            </Button>
          </Card>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <Zap className="w-8 h-8 text-yellow-400 mb-4" strokeWidth={3} />
            <h3 className="text-xl font-black text-foreground mb-2">Unlimited Power</h3>
            <p className="text-muted-foreground font-bold">
              Generate unlimited quizzes and study materials without restrictions
            </p>
          </Card>

          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <Infinity className="w-8 h-8 text-blue-400 mb-4" strokeWidth={3} />
            <h3 className="text-xl font-black text-foreground mb-2">No Limits</h3>
            <p className="text-muted-foreground font-bold">
              Upload files up to 50MB and create rooms with up to 20 players
            </p>
          </Card>

          <Card className="p-6 bg-card cartoon-border cartoon-shadow">
            <Users className="w-8 h-8 text-chart-3 mb-4" strokeWidth={3} />
            <h3 className="text-xl font-black text-foreground mb-2">Enhanced Collaboration</h3>
            <p className="text-muted-foreground font-bold">
              Study with larger groups and enjoy advanced multiplayer features
            </p>
          </Card>
        </div>

        {/* Additional Info */}
        <Card className="p-6 bg-card/50 cartoon-border">
          <div className="flex items-start gap-4">
            <Brain className="w-6 h-6 text-primary flex-shrink-0 mt-1" strokeWidth={3} />
            <div>
              <h3 className="text-lg font-black text-foreground mb-2">Why Upgrade?</h3>
              <p className="text-muted-foreground font-bold mb-4">
                Brain Battle Pro gives you access to advanced AI features, unlimited resources, and priority support. 
                Perfect for serious students who want to maximize their study efficiency.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/20 text-primary font-bold">Advanced AI</Badge>
                <Badge className="bg-primary/20 text-primary font-bold">Unlimited Usage</Badge>
                <Badge className="bg-primary/20 text-primary font-bold">Priority Support</Badge>
                <Badge className="bg-primary/20 text-primary font-bold">Early Access</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

