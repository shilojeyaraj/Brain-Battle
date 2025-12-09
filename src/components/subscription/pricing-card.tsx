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
  isNewUser?: boolean;
  onContinueFree?: () => void;
}

export function PricingCard({
  name,
  price,
  period,
  priceId,
  features,
  popular = false,
  currentPlan = false,
  isNewUser = false,
  onContinueFree,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);

  const handleContinueFree = async () => {
    if (onContinueFree) {
      onContinueFree();
      return;
    }

    setLoading(true);
    try {
      // For new users, retry authentication check (cookie might not be immediately available)
      let userId: string | null = null;
      const maxRetries = 5;
      const retryDelay = 500; // 500ms between retries
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const authResponse = await fetch('/api/user/current', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          });
          
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.success && authData.userId) {
              userId = authData.userId;
              console.log(`✅ [PRICING] Authentication successful on attempt ${attempt + 1}`);
              break; // Success, exit retry loop
            }
          } else if (authResponse.status === 401 && attempt < maxRetries - 1) {
            // Not authenticated yet, but we have retries left
            console.log(`⏳ [PRICING] Authentication not ready yet, retrying... (${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1))); // Exponential backoff
            continue;
          }
        } catch (e) {
          console.warn(`⚠️ [PRICING] Auth check attempt ${attempt + 1} failed:`, e);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
            continue;
          }
        }
      }

      if (!userId) {
        console.error('❌ [PRICING] Authentication failed after all retries');
        alert('Unable to verify your session. Please try logging in again.');
        window.location.href = '/login?redirect=/pricing?newUser=true';
        setLoading(false);
        return;
      }

      console.log('✅ [PRICING] Proceeding with free plan setup for user:', userId);

      // Call set-free API
      const response = await fetch('/api/subscription/set-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Include cookies for authentication
        cache: 'no-store',
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ [PRICING] Free plan set successfully, redirecting to dashboard');
        // Redirect to dashboard with newUser flag to trigger tutorial
        // Use window.location.href for a full page reload to ensure session is recognized
        window.location.href = '/dashboard?newUser=true';
      } else {
        console.error('❌ [PRICING] Failed to set free plan:', data.error);
        const errorMsg = data.error || data.message || 'Failed to set free plan. Please try again.';
        alert(errorMsg);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ [PRICING] Error setting free plan:', error);
      alert('An error occurred. Please try again or contact support if the problem persists.');
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Get userId from session cookie (more secure than localStorage)
      let userId: string | null = null;
      try {
        const response = await fetch('/api/user/current', {
          method: 'GET',
          credentials: 'include', // CRITICAL: Include cookies for authentication
        });
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
        alert('Please log in to subscribe. Redirecting to login page...');
        window.location.href = '/login?redirect=/pricing';
        setLoading(false);
        return;
      }

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRITICAL: Include cookies for authentication
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
      className={`relative rounded-2xl border-4 p-8 backdrop-blur-sm transition-all flex flex-col ${
        popular
          ? 'border-orange-500/70 bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-2xl shadow-orange-500/20'
          : currentPlan
          ? 'border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80'
          : 'border-slate-600/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-slate-500/70'
      }`}
      style={{ height: '100%' }}
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

      <ul className="space-y-4 mb-8 flex-grow flex flex-col justify-start">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3 flex-shrink-0">
            <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              popular ? 'text-orange-400' : 'text-blue-400'
            }`} />
            <span className="text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={isNewUser && name === 'Free' ? handleContinueFree : handleSubscribe}
        disabled={currentPlan && !isNewUser}
        loading={loading}
        loadingText={isNewUser && name === 'Free' ? 'Setting up...' : 'Loading...'}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all mt-auto ${
          currentPlan && !isNewUser
            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border-2 border-slate-600/50'
            : isNewUser && name === 'Free'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl border-2 border-blue-500/50'
            : popular
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:shadow-orange-500/50 transform hover:scale-105 border-2 border-orange-400/50'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl border-2 border-blue-500/50'
        }`}
      >
        {isNewUser && name === 'Free' 
          ? 'Continue with Free Plan' 
          : currentPlan 
          ? 'Current Plan' 
          : 'Subscribe Now'}
      </Button>
    </div>
  );
}

