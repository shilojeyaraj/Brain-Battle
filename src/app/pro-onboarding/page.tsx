/**
 * Pro Onboarding Page
 * 
 * Comprehensive onboarding experience for users considering upgrading to Pro.
 * Showcases all Pro features and benefits with clear call-to-action.
 */

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Crown, 
  Users, 
  FileText, 
  Zap, 
  BarChart3, 
  Download, 
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  Palette,
  Brain
} from 'lucide-react'
import { SubscriptionButton } from '@/components/subscription/subscription-button'
import { getCurrentUserId } from '@/lib/auth/session'
import { useSubscription } from '@/hooks/use-subscription'

const PRO_FEATURES = [
  {
    icon: Users,
    title: 'Large Multiplayer Rooms',
    description: 'Create rooms with up to 20 players (vs 4 for free users). Perfect for study groups and classrooms.',
    free: 'Up to 4 players',
    pro: 'Up to 20 players'
  },
  {
    icon: FileText,
    title: 'Unlimited Documents',
    description: 'Upload as many study materials as you need. No monthly limits.',
    free: '5 documents/month',
    pro: 'Unlimited'
  },
  {
    icon: Brain,
    title: 'Unlimited Quiz Questions',
    description: 'Generate comprehensive quizzes with unlimited questions per session.',
    free: '10 questions/quiz',
    pro: 'Unlimited'
  },
  {
    icon: Zap,
    title: 'Priority AI Processing',
    description: 'Get faster AI responses with priority processing queue.',
    free: 'Standard queue (30-60s)',
    pro: 'Priority queue (10-20s)'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Detailed performance insights, weak area identification, and progress tracking.',
    free: 'Basic stats',
    pro: 'Advanced analytics'
  },
  {
    icon: Download,
    title: 'Export Study Materials',
    description: 'Export notes, quiz results, and analytics to PDF/Markdown.',
    free: 'View only',
    pro: 'Export enabled'
  },
  {
    icon: Palette,
    title: 'Custom Themes',
    description: 'Personalize your study rooms with custom themes and backgrounds.',
    free: 'Default theme',
    pro: 'Multiple themes'
  },
  {
    icon: Shield,
    title: 'Advanced Anti-Cheat',
    description: 'Enhanced security features for fair competition.',
    free: 'Basic detection',
    pro: 'Advanced monitoring'
  }
]

export default function ProOnboardingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const { isPro, loading: subscriptionLoading } = useSubscription(userId)

  useEffect(() => {
    const currentUserId = getCurrentUserId()
    if (!currentUserId) {
      router.push('/login?redirect=/pro-onboarding')
      return
    }
    setUserId(currentUserId)
  }, [router])

  // Redirect if already Pro
  useEffect(() => {
    if (!subscriptionLoading && isPro) {
      router.push('/dashboard')
    }
  }, [isPro, subscriptionLoading, router])

  if (!userId || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-100 font-semibold">Loading...</p>
        </div>
      </div>
    )
  }

  if (isPro) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-blue-300 hover:text-blue-200 mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Link>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-6"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Unlock Your Full Potential
          </h1>
          <p className="text-xl md:text-2xl text-blue-200 max-w-3xl mx-auto mb-8">
            Upgrade to Brain Battle Pro and get unlimited access to advanced features
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/pricing">
              <button className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                Upgrade to Pro
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <button 
              onClick={() => setCurrentStep(1)}
              className="bg-slate-800/50 hover:bg-slate-800/70 text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-slate-600/50 transition-all"
            >
              Explore Features
            </button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {PRO_FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-2xl border-4 border-blue-400/30 p-6 hover:border-blue-400/60 transition-all"
              >
                <div className="bg-gradient-to-br from-blue-500/20 to-orange-500/20 rounded-lg p-4 w-fit mb-4">
                  <Icon className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-blue-100/70 text-sm mb-4">{feature.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400">Free:</span>
                    <span className="text-blue-100/60">{feature.free}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-semibold">Pro: {feature.pro}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-2xl border-4 border-blue-400/30 p-8">
            <h2 className="text-3xl font-bold text-white text-center mb-8">
              Free vs Pro Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-700">
                    <th className="text-left py-4 px-4 text-white font-semibold">Feature</th>
                    <th className="text-center py-4 px-4 text-blue-200 font-semibold">Free</th>
                    <th className="text-center py-4 px-4 text-yellow-400 font-semibold">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-4 px-4 text-blue-100">Room Size</td>
                    <td className="py-4 px-4 text-center text-blue-100/70">Up to 4 players</td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">Up to 20 players</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-4 px-4 text-blue-100">Documents/Month</td>
                    <td className="py-4 px-4 text-center text-blue-100/70">5</td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">Unlimited</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-4 px-4 text-blue-100">Quiz Questions</td>
                    <td className="py-4 px-4 text-center text-blue-100/70">10 per quiz</td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">Unlimited</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-4 px-4 text-blue-100">AI Processing</td>
                    <td className="py-4 px-4 text-center text-blue-100/70">Standard</td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">Priority</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-4 px-4 text-blue-100">Analytics</td>
                    <td className="py-4 px-4 text-center text-blue-100/70">Basic</td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">Advanced</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 text-blue-100">Export</td>
                    <td className="py-4 px-4 text-center text-blue-100/70">❌</td>
                    <td className="py-4 px-4 text-center text-green-400 font-semibold">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-center mb-16"
        >
          <div className="bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-orange-600/30 rounded-2xl border-4 border-blue-400/50 p-12 max-w-3xl mx-auto">
            <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Level Up?
            </h2>
            <p className="text-xl text-blue-200 mb-8">
              Join thousands of students who are already studying smarter with Pro
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <button className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
                  Start Pro Trial
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="bg-slate-800/50 hover:bg-slate-800/70 text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-slate-600/50 transition-all">
                  Maybe Later
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

