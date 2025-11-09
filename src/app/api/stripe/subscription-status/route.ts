import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserSubscription } from '@/lib/stripe/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const subscription = await getUserSubscription(userId);

    if (!subscription) {
      return NextResponse.json(
        { tier: 'free', status: 'free', isActive: false },
        { status: 200 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

