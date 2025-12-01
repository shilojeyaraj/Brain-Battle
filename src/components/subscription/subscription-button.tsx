'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { requireAuthOrRedirect } from '@/lib/utils/require-auth-redirect';

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = async () => {
    setLoading(true);
    try {
      // Check authentication and redirect if not logged in
      const isAuthenticated = await requireAuthOrRedirect(router, pathname, searchParams);
      if (!isAuthenticated) {
        setLoading(false);
        return; // Already redirected to login
      }

      // Get userId from API (more reliable than localStorage)
      const userResponse = await fetch('/api/user/current');
      if (!userResponse.ok) {
        setLoading(false);
        return;
      }
      
      const userData = await userResponse.json();
      const userId = userData.userId;
      
      if (!userId) {
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

