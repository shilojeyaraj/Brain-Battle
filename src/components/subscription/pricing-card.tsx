'use client';

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  priceId: string;
  features: string[];
  popular?: boolean;
  currentPlan?: boolean;
}

export function PricingCard({
  name,
  price,
  period,
  priceId,
  features,
  popular = false,
  currentPlan = false,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Get userId from session cookie (more secure than localStorage)
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
        console.warn('Failed to get userId from API, falling back to localStorage');
      }
      
      // Fallback to localStorage for backwards compatibility
      if (!userId) {
        userId = localStorage.getItem('userId');
      }
      
      if (!userId) {
        alert('Please log in to subscribe');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          mode: 'subscription',
          userId,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session:', data.error);
        alert('Failed to start checkout. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl border-4 p-8 backdrop-blur-sm transition-all flex flex-col h-full ${
        popular
          ? 'border-orange-500/70 bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-2xl shadow-orange-500/20 scale-105'
          : currentPlan
          ? 'border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80'
          : 'border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-slate-500/70'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg border-2 border-orange-400">
            <Zap className="w-4 h-4" />
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className={`text-2xl font-bold mb-2 ${
          popular ? 'text-white' : 'text-slate-200'
        }`}>{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-5xl font-bold ${
            popular ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-blue-400' : 'text-white'
          }`}>${price}</span>
          <span className="text-slate-400">/{period}</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8 flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              popular ? 'text-orange-400' : 'text-blue-400'
            }`} />
            <span className="text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={handleSubscribe}
        disabled={currentPlan}
        loading={loading}
        loadingText="Loading..."
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all mt-auto ${
          currentPlan
            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border-2 border-slate-600/50'
            : popular
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:shadow-orange-500/50 transform hover:scale-105 border-2 border-orange-400/50'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl border-2 border-blue-500/50'
        }`}
      >
        {currentPlan ? 'Current Plan' : 'Subscribe Now'}
      </Button>
    </div>
  );
}

