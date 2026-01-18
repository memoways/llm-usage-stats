/**
 * API Route: GET /api/providers
 *
 * Returns the list of available LLM providers.
 */

import { NextResponse } from 'next/server';
import { getAvailableProviders } from '@/lib/providers/factory';

export async function GET() {
  try {
    const providers = getAvailableProviders();

    return NextResponse.json({
      providers,
    });
  } catch (error) {
    console.error('Error fetching providers:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch providers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
