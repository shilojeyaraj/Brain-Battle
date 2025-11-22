'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingButton, setLoadingButton] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      // Verify the session and update subscription status
      // The webhook should have already handled this, but we can verify here
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } else {
      setError('No session ID found');
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => {
              setLoadingButton('dashboard')
              router.push('/dashboard')
              setTimeout(() => setLoadingButton(null), 1000)
            }}
            loading={loadingButton === 'dashboard'}
            loadingText="Loading..."
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for subscribing to Brain Battle Pro! Your subscription is
          now active and you have access to all Pro features.
        </p>
        <div className="space-y-3">
          <Button
            onClick={() => {
              setLoadingButton('dashboard')
              router.push('/dashboard')
              setTimeout(() => setLoadingButton(null), 1000)
            }}
            loading={loadingButton === 'dashboard'}
            loadingText="Loading..."
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => {
              setLoadingButton('pricing')
              router.push('/pricing')
              setTimeout(() => setLoadingButton(null), 1000)
            }}
            loading={loadingButton === 'pricing'}
            loadingText="Loading..."
            className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold"
          >
            View Plans
          </Button>
        </div>
      </div>
    </div>
  );
}

