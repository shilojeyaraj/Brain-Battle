'use client';

import { PricingCard } from '@/components/subscription/pricing-card';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PricingPage() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');
  const isNewUser = searchParams.get('newUser') === 'true';
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    // Get userId from session cookie (more secure)
    const fetchStatus = async () => {
      try {
        // Try to get userId from session cookie first
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

        if (!userId) return;

        // Fetch current subscription status
        const res = await fetch(`/api/stripe/subscription-status?userId=${userId}`);
        const data = await res.json();
        setSubscriptionStatus(data);
      } catch (err) {
        console.error('Error fetching subscription:', err);
      }
    };

    fetchStatus();
  }, []);

  // Get Stripe Price IDs from environment variables
  const PRO_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_xxxxx';
  const PRO_YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID;
  
  // Only show yearly option if it's configured
  const hasYearlyPlan = PRO_YEARLY_PRICE_ID && PRO_YEARLY_PRICE_ID !== 'price_xxxxx';

  const isPro = subscriptionStatus?.isActive && subscriptionStatus?.tier === 'pro';

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back to Dashboard Button */}
          <div className="mb-8">
            <Link href="/dashboard">
              <Button
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black border-2 border-orange-400 shadow-lg hover:shadow-xl hover:shadow-orange-500/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={3} />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            {isNewUser && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 inline-block"
              >
                <div className="bg-gradient-to-r from-orange-500/20 to-blue-500/20 border-4 border-orange-500/50 rounded-lg px-6 py-3 backdrop-blur-sm">
                  <p className="text-orange-200 font-bold text-lg">
                    🎉 Welcome to Brain Battle! Choose your plan to get started
                  </p>
                </div>
              </motion.div>
            )}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-blue-400 bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              {isNewUser 
                ? "Start your learning journey with the perfect plan for you"
                : "Unlock advanced features and take your study sessions to the next level"
              }
            </p>
          </div>

          {/* Canceled Message */}
          {canceled && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-orange-500/20 border-4 border-orange-500/50 rounded-lg backdrop-blur-sm">
              <p className="text-orange-200">
                Checkout was canceled. You can try again anytime.
              </p>
            </div>
          )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12" style={{ gridAutoRows: '1fr' }}>
          {/* Free Plan */}
          <PricingCard
            name="Free"
            price="0"
            period="month"
            priceId=""
            features={[
              '15 documents per month',
              '15 quizzes per month',
              'Up to 15 questions per quiz',
              'Multiplayer rooms (up to 4 players)',
              'Can join any lobby',
              'Standard XP system',
              'Basic analytics',
            ]}
            currentPlan={!isPro && !isNewUser}
            isNewUser={isNewUser}
          />

          {/* Pro Plan - Monthly */}
          <PricingCard
            name="Pro"
            price="4.99"
            period="month"
            priceId={PRO_MONTHLY_PRICE_ID}
            features={[
              '50 documents per month',
              '50 quizzes per month',
              'Up to 20 questions per quiz',
              'Large multiplayer rooms (up to 15 players)',
              'Create and join clans',
              'Advanced XP system with bonuses',
              'Detailed analytics & insights',
              'Priority AI processing',
              'Custom study room themes',
              'Export study materials',
              'Advanced anti-cheat features',
            ]}
            popular={true}
            currentPlan={isPro && subscriptionStatus?.interval !== 'year'}
          />

          {/* Pro Plan - Yearly */}
          {hasYearlyPlan ? (
            <PricingCard
              name="Pro (Yearly)"
              price="49.99"
              period="year"
              priceId={PRO_YEARLY_PRICE_ID}
              features={[
                'Everything in Pro Monthly',
                '50 documents per month',
                '50 quizzes per month',
                'Up to 20 questions per quiz',
                'Large multiplayer rooms (up to 15 players)',
                'Create and join clans',
                'Save 17% with annual billing',
                'Priority support',
                'Early access to new features',
              ]}
              currentPlan={isPro && subscriptionStatus?.interval === 'year'}
            />
          ) : (
            <div className="hidden md:block" /> // Placeholder to maintain grid layout
          )}
        </div>


          {/* FAQ Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8 text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-lg p-6 shadow-lg backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-2 text-orange-400">
                  Can I cancel anytime?
                </h3>
                <p className="text-slate-300">
                  Yes! You can cancel your subscription at any time. You'll
                  continue to have access to Pro features until the end of your
                  billing period.
                </p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-lg p-6 shadow-lg backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-2 text-orange-400">
                  What payment methods do you accept?
                </h3>
                <p className="text-slate-300">
                  We accept all major credit cards, debit cards, and other payment
                  methods supported by Stripe.
                </p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-slate-600/50 rounded-lg p-6 shadow-lg backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-2 text-orange-400">
                  Will I lose my data if I cancel?
                </h3>
                <p className="text-slate-300">
                  No, your data is safe. You can export all your study materials
                  and progress before canceling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

