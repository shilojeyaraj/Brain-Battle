'use client';

import { useState } from 'react';
import { Crown, X, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface UpgradePromptProps {
  feature: string;
  limit: number | string;
  current?: number;
  onDismiss?: () => void;
  className?: string;
}

export function UpgradePrompt({
  feature,
  limit,
  current,
  onDismiss,
  className = '',
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`relative bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-4 border-orange-500/50 rounded-lg p-6 backdrop-blur-sm shadow-lg ${className}`}
        >
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Upgrade to Pro
              </h3>
              <p className="text-slate-300 mb-4">
                {current !== undefined
                  ? `You've used ${current} of ${limit} ${feature}.`
                  : `${feature} is limited to ${limit} for free users.`}
                {' '}Upgrade to Pro for unlimited access and advanced features!
              </p>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/50 transform hover:scale-105"
              >
                View Plans
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
