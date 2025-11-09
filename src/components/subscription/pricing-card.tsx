'use client';

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';

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
      // Get userId from localStorage (your app's auth system)
      const userId = localStorage.getItem('userId');
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
      className={`relative rounded-2xl border-2 p-8 ${
        popular
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl'
          : 'border-gray-200 bg-white'
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <Zap className="w-4 h-4" />
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-gray-900">${price}</span>
          <span className="text-gray-600">/{period}</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        disabled={loading || currentPlan}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
          currentPlan
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : popular
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
      >
        {loading
          ? 'Loading...'
          : currentPlan
          ? 'Current Plan'
          : 'Subscribe Now'}
      </button>
    </div>
  );
}

