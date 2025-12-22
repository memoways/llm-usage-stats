/**
 * API Route: GET /api/workspaces
 *
 * Returns the list of workspaces for a given provider.
 * Query params:
 * - provider: Provider ID (e.g., 'openai')
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers/factory';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: provider',
        },
        { status: 400 }
      );
    }

    const providerInstance = getProvider(provider);

    // Check if provider supports workspaces
    if (!providerInstance.supportsWorkspaces) {
      return NextResponse.json(
        {
          error: `Provider '${provider}' does not support workspaces`,
          workspaces: [],
        },
        { status: 200 }
      );
    }

    const workspaces = await providerInstance.getWorkspaces();

    return NextResponse.json({
      workspaces,
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch workspaces',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
