/**
 * OpenAIProvider - Implementation of ILLMProvider for OpenAI
 *
 * This provider supports 3 separate workspaces:
 * - Edugami
 * - Memoways
 * - Storygami
 *
 * Each workspace has its own API key stored in environment variables.
 */

import { ILLMProvider } from './interface';
import { Workspace, Project, CostParams, CostData, ModelCost } from '../types';

export class OpenAIProvider implements ILLMProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI';
  public readonly supportsWorkspaces = true;

  // Workspace configurations
  private readonly workspaces: Workspace[] = [
    { id: 'edugami', name: 'Edugami' },
    { id: 'memoways', name: 'Memoways' },
    { id: 'storygami', name: 'Storygami' },
  ];

  /**
   * Get API key for a specific workspace
   */
  private getApiKey(workspace: string): string {
    const envKey = `OPENAI_API_KEY_${workspace.toUpperCase()}`;
    const apiKey = process.env[envKey];

    if (!apiKey) {
      throw new Error(`API key not found for workspace: ${workspace}. Expected env var: ${envKey}`);
    }

    return apiKey;
  }

  /**
   * Make an authenticated request to OpenAI API
   */
  private async fetchOpenAI(
    endpoint: string,
    workspace: string,
    options: RequestInit = {},
    isAdminAPI: boolean = false
  ): Promise<Response> {
    const apiKey = this.getApiKey(workspace);

    // Admin API uses a different base URL
    const baseUrl = isAdminAPI
      ? 'https://api.openai.com/v1/organization'
      : 'https://api.openai.com/v1';

    const url = `${baseUrl}${endpoint}`;

    console.log(`[OpenAI] Fetching: ${url} for workspace: ${workspace} (Admin: ${isAdminAPI})`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenAI] API error (${response.status}):`, errorText);

      // Provide helpful error messages for common issues
      if (response.status === 403) {
        throw new Error(
          `OpenAI API permission denied (403). The API key needs specific permissions/scopes enabled. ` +
          `Please check your API key has 'api.read' scope in the OpenAI dashboard. ` +
          `Error details: ${errorText}`
        );
      }

      throw new Error(
        `OpenAI API error (${response.status}): ${errorText}`
      );
    }

    return response;
  }

  /**
   * Get list of workspaces (static list for OpenAI)
   */
  async getWorkspaces(): Promise<Workspace[]> {
    return this.workspaces;
  }

  /**
   * Get list of projects for a given workspace
   *
   * @param workspace - Workspace ID (required for OpenAI)
   */
  async getProjects(workspace?: string): Promise<Project[]> {
    if (!workspace) {
      throw new Error('Workspace is required for OpenAI provider');
    }

    try {
      // Use admin API to fetch projects
      const response = await this.fetchOpenAI(
        '/projects',
        workspace,
        {},
        true // isAdminAPI = true
      );

      const data = await response.json();

      console.log('[OpenAI] Projects response:', JSON.stringify(data, null, 2));

      // OpenAI API returns projects in a 'data' array
      // Each project has an 'id' and 'name' field
      if (!data.data || !Array.isArray(data.data)) {
        console.error('[OpenAI] Unexpected response format:', data);
        throw new Error('Invalid response format from OpenAI projects API');
      }

      return data.data.map((project: { id: string; name: string }) => ({
        id: project.id,
        name: project.name,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get cost data for a specific project and date range
   *
   * @param params - Cost query parameters
   */
  async getCosts(params: CostParams): Promise<CostData> {
    const { workspace, projectId, startDate, endDate } = params;

    if (!workspace) {
      throw new Error('Workspace is required for OpenAI provider');
    }

    try {
      // Build query parameters for OpenAI usage API
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        project_id: projectId,
      });

      const response = await this.fetchOpenAI(
        `/usage?${queryParams.toString()}`,
        workspace
      );

      const data = await response.json();

      // Parse OpenAI usage data format
      // The actual format may vary - this is based on typical OpenAI API structure
      // You may need to adjust this based on the actual API response
      const breakdown: ModelCost[] = [];
      let totalCost = 0;

      if (data.data && Array.isArray(data.data)) {
        // Group by model and sum costs
        const modelMap = new Map<string, { cost: number; requests: number }>();

        for (const entry of data.data) {
          const model = entry.snapshot_id || entry.model || 'unknown';
          const cost = entry.cost || 0;
          const requests = entry.n_requests || 1;

          const existing = modelMap.get(model);
          if (existing) {
            existing.cost += cost;
            existing.requests += requests;
          } else {
            modelMap.set(model, { cost, requests });
          }

          totalCost += cost;
        }

        // Convert map to array
        for (const [model, { cost, requests }] of modelMap.entries()) {
          breakdown.push({
            model,
            cost_usd: cost,
            requests,
          });
        }
      }

      // Sort breakdown by cost (descending)
      breakdown.sort((a, b) => b.cost_usd - a.cost_usd);

      return {
        total_cost_usd: totalCost,
        last_updated: new Date().toISOString(),
        breakdown,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch costs: ${error.message}`);
      }
      throw error;
    }
  }
}
