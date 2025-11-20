'use client';

import { useState, useEffect } from 'react';
import { Crown, X, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export function SubscriptionBanner() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Get userId from session cookie
        let userId: string | null = null;
        try {
          const response = await fetch('/api/user/current');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.userId) {
              userId = data.userId;
            }
          }
        } catch (e) {
          // Fallback to localStorage
          userId = localStorage.getItem('userId');
        }

        if (!userId) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/stripe/subscription-status?userId=${userId}`);
        const data = await response.json();
        setSubscriptionStatus(data);
      } catch (error) {
        console.error('Error fetching subscription status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  // Don't show if user is Pro or loading
  if (isLoading || subscriptionStatus?.isActive) {
    return null;
  }

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 bg-gradient-to-r from-orange-500/20 via-orange-600/10 to-blue-500/20 border-4 border-orange-500/50 rounded-lg p-4 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  Unlock Pro Features
                </h3>
                <p className="text-xs text-slate-300">
                  Get unlimited documents, unlimited questions, and advanced AI features
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/50"
              >
                Upgrade
                <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

