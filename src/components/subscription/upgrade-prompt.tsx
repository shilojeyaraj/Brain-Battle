/**
 * Upgrade Prompt Component
 * 
 * Displays a prompt encouraging users to upgrade to Pro when they hit limits.
 * Used throughout the app when free users try to access Pro features.
 */

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { SubscriptionButton } from './subscription-button'
import { Crown, Sparkles, ArrowRight } from 'lucide-react'

interface UpgradePromptProps {
  feature: string
  limit?: number
  current?: number
  className?: string
  variant?: 'default' | 'compact' | 'banner'
  showFeatureIcon?: boolean
}

export function UpgradePrompt({ 
  feature, 
  limit, 
  current, 
  className = '',
  variant = 'default',
  showFeatureIcon = true
}: UpgradePromptProps) {
  const remaining = limit && current !== undefined ? limit - current : undefined

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-gradient-to-r from-blue-600/20 to-orange-600/20 border-2 border-blue-400/50 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showFeatureIcon && <Crown className="w-5 h-5 text-yellow-400" />}
            <div>
              <p className="text-sm font-semibold text-white">
                Pro Feature Required
              </p>
              <p className="text-xs text-blue-100/80">
                {limit && current !== undefined 
                  ? `${feature}: ${current}/${limit} used`
                  : `${feature} requires Pro`}
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <button className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all">
              Upgrade
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </motion.div>
    )
  }

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-orange-600/30 border-2 border-blue-400/60 rounded-xl p-6 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            {showFeatureIcon && (
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                Unlock Pro Features
              </h3>
              <p className="text-blue-100/90 mb-1">
                {limit && current !== undefined 
                  ? `You've used ${current} of ${limit} ${feature}.`
                  : `${feature} is available in Pro.`}
              </p>
              <p className="text-blue-100/80 text-sm">
                Upgrade to Pro for unlimited access and advanced features.
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <button className="bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
              Upgrade to Pro
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </motion.div>
    )
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-4 border-blue-400/50 rounded-2xl p-6 shadow-2xl ${className}`}
    >
      <div className="flex items-start gap-4 mb-4">
        {showFeatureIcon && (
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-3 flex-shrink-0">
            <Crown className="w-6 h-6 text-white" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white mb-2">
            Pro Feature Required
          </h3>
          <p className="text-blue-100/80 mb-4">
            {limit && current !== undefined 
              ? `You've used ${current} of ${limit} ${feature}. Upgrade to Pro for unlimited access.`
              : `${feature} is available in Pro. Upgrade to unlock this feature and more.`}
          </p>
          {remaining !== undefined && remaining > 0 && (
            <p className="text-sm text-blue-200/70 mb-4">
              {remaining} {feature} remaining this month
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-400/30">
          <h4 className="font-semibold text-white mb-2">Free Plan</h4>
          <ul className="text-sm text-blue-100/70 space-y-1">
            <li>• Limited {feature}</li>
            <li>• Basic features</li>
            <li>• Standard support</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-blue-600/30 to-orange-600/30 rounded-lg p-4 border-2 border-blue-400/50">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4 text-yellow-400" />
            Pro Plan
          </h4>
          <ul className="text-sm text-white space-y-1">
            <li>• Unlimited {feature}</li>
            <li>• Advanced features</li>
            <li>• Priority support</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/pricing" className="flex-1">
          <button className="w-full bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl">
            Upgrade to Pro
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <Link href="/pro-onboarding" className="flex-1">
          <button className="w-full bg-slate-700/50 hover:bg-slate-700/70 text-white px-6 py-3 rounded-lg font-semibold border-2 border-slate-600/50 transition-all">
            Learn More
          </button>
        </Link>
      </div>
    </motion.div>
  )
}

