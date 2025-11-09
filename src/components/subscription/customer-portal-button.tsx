'use client';

import { useState } from 'react';
import { Settings, Loader2 } from 'lucide-react';

interface CustomerPortalButtonProps {
  children?: React.ReactNode;
  className?: string;
}

export function CustomerPortalButton({
  children,
  className = '',
}: CustomerPortalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // Get userId from localStorage (your app's auth system)
      const userId = localStorage.getItem('userId');
      if (!userId) {
        alert('Please log in to manage your subscription');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create portal session:', data.error);
        alert('Failed to open customer portal. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Settings className="w-4 h-4" />
          {children || 'Manage Subscription'}
        </>
      )}
    </button>
  );
}

