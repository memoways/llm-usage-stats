/**
 * API Route: GET /api/projects
 *
 * Returns the list of projects for a given provider and workspace.
 * Query params:
 * - provider: Provider ID (required)
 * - workspace: Workspace ID (optional, required if provider supports workspaces)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers/factory';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const workspace = searchParams.get('workspace') || undefined;

    if (!provider) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: provider',
        },
        { status: 400 }
      );
    }

    const providerInstance = getProvider(provider);

    // Check if workspace is required for this provider
    if (providerInstance.supportsWorkspaces && !workspace) {
      return NextResponse.json(
        {
          error: `Provider '${provider}' requires a workspace parameter`,
        },
        { status: 400 }
      );
    }

    const projects = await providerInstance.getProjects(workspace);

    return NextResponse.json({
      projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
