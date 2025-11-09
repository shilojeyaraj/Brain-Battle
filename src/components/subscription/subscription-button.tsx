'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

interface SubscriptionButtonProps {
  priceId: string;
  children?: React.ReactNode;
  className?: string;
}

export function SubscriptionButton({
  priceId,
  children,
  className = '',
}: SubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
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
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          {children || 'Subscribe Now'}
        </>
      )}
    </button>
  );
}

