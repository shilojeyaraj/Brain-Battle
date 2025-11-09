'use client';

import { PricingCard } from '@/components/subscription/pricing-card';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PricingPage() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    // Get userId from localStorage (your app's auth system)
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Fetch current subscription status
    fetch(`/api/stripe/subscription-status?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setSubscriptionStatus(data))
      .catch((err) => console.error('Error fetching subscription:', err));
  }, []);

  // Replace these with your actual Stripe Price IDs from your Stripe Dashboard
  const PRO_MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_xxxxx';
  const PRO_YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || 'price_xxxxx';

  const isPro = subscriptionStatus?.isActive && subscriptionStatus?.tier === 'pro';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock advanced features and take your study sessions to the next
            level
          </p>
        </div>

        {/* Canceled Message */}
        {canceled && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              Checkout was canceled. You can try again anytime.
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Free Plan */}
          <PricingCard
            name="Free"
            price="0"
            period="month"
            priceId=""
            features={[
              '5 documents per month',
              'Basic AI study notes',
              '10 quiz questions per session',
              'Basic multiplayer rooms (up to 4 players)',
              'Standard XP system',
              'Basic analytics',
            ]}
            currentPlan={!isPro}
          />

          {/* Pro Plan - Monthly */}
          <PricingCard
            name="Pro"
            price="9.99"
            period="month"
            priceId={PRO_MONTHLY_PRICE_ID}
            features={[
              'Unlimited documents',
              'Advanced AI study notes with images',
              'Unlimited quiz questions',
              'Large multiplayer rooms (up to 20 players)',
              'Advanced XP system with bonuses',
              'Detailed analytics & insights',
              'Priority AI processing',
              'Custom study room themes',
              'Export study materials',
              'Advanced anti-cheat features',
            ]}
            popular={true}
            currentPlan={isPro}
          />
        </div>

        {/* Yearly Option */}
        <div className="max-w-md mx-auto">
          <PricingCard
            name="Pro (Yearly)"
            price="99.99"
            period="year"
            priceId={PRO_YEARLY_PRICE_ID}
            features={[
              'Everything in Pro Monthly',
              'Save 17% with annual billing',
              'Priority support',
              'Early access to new features',
            ]}
            currentPlan={false}
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can cancel your subscription at any time. You'll
                continue to have access to Pro features until the end of your
                billing period.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, debit cards, and other payment
                methods supported by Stripe.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">
                Will I lose my data if I cancel?
              </h3>
              <p className="text-gray-600">
                No, your data is safe. You can export all your study materials
                and progress before canceling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

