/**
 * API Route: GET /api/costs
 *
 * Returns cost data for a given project and date range, with caching.
 * Query params:
 * - provider: Provider ID (required)
 * - workspace: Workspace ID (optional, required if provider supports workspaces)
 * - project_id: Project ID (optional, omit for workspace-wide totals)
 * - start_date: Start date in ISO 8601 format (required)
 * - end_date: End date in ISO 8601 format (required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers/factory';
import { generateCacheKey, getFromCache, setCache } from '@/utils/cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const workspace = searchParams.get('workspace') || undefined;
    const projectId = searchParams.get('project_id') || undefined; // Optional: omit for workspace totals
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate required parameters
    if (!provider) {
      return NextResponse.json(
        { error: 'Missing required parameter: provider' },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: 'Missing required parameter: start_date' },
        { status: 400 }
      );
    }

    if (!endDate) {
      return NextResponse.json(
        { error: 'Missing required parameter: end_date' },
        { status: 400 }
      );
    }

    // Validate date format (basic ISO 8601 check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD (ISO 8601)' },
        { status: 400 }
      );
    }

    // Get provider instance
    const providerInstance = getProvider(provider);

    // Check if workspace is required
    if (providerInstance.supportsWorkspaces && !workspace) {
      return NextResponse.json(
        { error: `Provider '${provider}' requires a workspace parameter` },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey(
      provider,
      workspace,
      projectId,
      startDate,
      endDate
    );

    // TEMPORARILY DISABLED: Cache to debug calculation issues
    // Try to get from cache
    // const cachedData = getFromCache(cacheKey);
    // if (cachedData) {
    //   console.log(`Cache HIT for key: ${cacheKey}`);
    //   return NextResponse.json(cachedData);
    // }

    console.log(`Fetching fresh data (cache disabled for debugging), key: ${cacheKey}`);

    // Fetch fresh data from provider
    const costData = await providerInstance.getCosts({
      workspace,
      projectId,
      startDate,
      endDate,
    });

    // Store in cache
    setCache(cacheKey, costData);

    return NextResponse.json(costData);
  } catch (error) {
    console.error('Error fetching costs:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch costs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
