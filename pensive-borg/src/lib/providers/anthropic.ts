/**
 * AnthropicProvider - Implementation of ILLMProvider for Anthropic
 *
 * This provider uses a SINGLE Admin API key to access all workspaces.
 * Workspaces and API keys are fetched DYNAMICALLY from the Anthropic Admin API.
 * 
 * The "Project" dropdown lists API keys for the selected workspace.
 *
 * Environment variable:
 *   ANTHROPIC_ADMIN_KEY=sk-ant-admin-xxx...
 */

import { ILLMProvider } from './interface';
import { Workspace, Project, CostParams, CostData, ModelCost } from '../types';

export class AnthropicProvider implements ILLMProvider {
  public readonly id = 'anthropic';
  public readonly name = 'Anthropic';
  public readonly supportsWorkspaces = true;

  /**
   * Get the Admin API key
   */
  private getAdminApiKey(): string {
    const apiKey = process.env.ANTHROPIC_ADMIN_KEY;

    if (!apiKey) {
      throw new Error(
        'Anthropic Admin API key not found. ' +
        'Please set ANTHROPIC_ADMIN_KEY environment variable. ' +
        'Create an Admin key at: https://console.anthropic.com/settings/admin-keys'
      );
    }

    return apiKey;
  }

  /**
   * Make an authenticated request to Anthropic Admin API
   */
  private async fetchAnthropicAdmin(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const adminApiKey = this.getAdminApiKey();

    const url = `https://api.anthropic.com/v1${endpoint}`;

    console.log(`[Anthropic] Fetching: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': adminApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Anthropic] API error (${response.status}):`, errorText);

      if (response.status === 403) {
        throw new Error(
          `Anthropic API permission denied (403). The Admin API key may not have the required permissions. ` +
          `Make sure you're using an Admin API key (sk-ant-admin-...). ` +
          `Error details: ${errorText}`
        );
      }

      if (response.status === 401) {
        throw new Error(
          `Anthropic API authentication failed (401). Please check your Admin API key. ` +
          `Error details: ${errorText}`
        );
      }

      throw new Error(
        `Anthropic API error (${response.status}): ${errorText}`
      );
    }

    return response;
  }

  /**
   * Get list of workspaces - DYNAMICALLY FETCHED from Anthropic API
   */
  async getWorkspaces(): Promise<Workspace[]> {
    try {
      const response = await this.fetchAnthropicAdmin('/organizations/workspaces');
      const data = await response.json();

      console.log('[Anthropic] Workspaces response:', JSON.stringify(data, null, 2));

      if (!data.data || !Array.isArray(data.data)) {
        console.error('[Anthropic] Unexpected workspaces response format:', data);
        return [];
      }

      // Map Anthropic workspaces to our Workspace type
      const workspaces = data.data.map((ws: { id: string; name: string }) => ({
        id: ws.id,
        name: ws.name,
      }));

      // Handle pagination if there are more workspaces
      let nextPage = data.has_more ? data.last_id : null;
      while (nextPage) {
        const pageResponse = await this.fetchAnthropicAdmin(
          `/organizations/workspaces?after_id=${nextPage}`
        );
        const pageData = await pageResponse.json();
        
        if (pageData.data && Array.isArray(pageData.data)) {
          workspaces.push(...pageData.data.map((ws: { id: string; name: string }) => ({
            id: ws.id,
            name: ws.name,
          })));
        }
        
        nextPage = pageData.has_more ? pageData.last_id : null;
      }

      console.log(`[Anthropic] Found ${workspaces.length} workspace(s):`, workspaces.map((w: Workspace) => w.name).join(', '));

      return workspaces;
    } catch (error) {
      if (error instanceof Error) {
        console.error('[Anthropic] Error fetching workspaces:', error.message);
        throw new Error(`Failed to fetch workspaces: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get list of API keys for a given workspace (used as "Projects")
   * DYNAMICALLY FETCHED from Anthropic API
   *
   * @param workspace - Workspace ID (required for Anthropic)
   */
  async getProjects(workspace?: string): Promise<Project[]> {
    if (!workspace) {
      throw new Error('Workspace is required for Anthropic provider');
    }

    try {
      // Fetch API keys filtered by workspace_id
      const response = await this.fetchAnthropicAdmin(
        `/organizations/api_keys?workspace_id=${workspace}`
      );

      const data = await response.json();

      console.log('[Anthropic] API Keys response:', JSON.stringify(data, null, 2));

      if (!data.data || !Array.isArray(data.data)) {
        console.error('[Anthropic] Unexpected API keys response format:', data);
        return [];
      }

      // Map API keys to our Project type
      // Include partial key hint for identification
      const projects = data.data
        .filter((apiKey: { status: string }) => apiKey.status === 'active')
        .map((apiKey: { id: string; name: string; partial_key_hint?: string }) => ({
          id: apiKey.id,
          name: apiKey.name || `API Key (...${apiKey.partial_key_hint?.slice(-8) || apiKey.id.slice(-8)})`,
        }));

      // Handle pagination if there are more API keys
      let nextPage = data.has_more ? data.last_id : null;
      while (nextPage) {
        const pageResponse = await this.fetchAnthropicAdmin(
          `/organizations/api_keys?workspace_id=${workspace}&after_id=${nextPage}`
        );
        const pageData = await pageResponse.json();
        
        if (pageData.data && Array.isArray(pageData.data)) {
          projects.push(...pageData.data
            .filter((apiKey: { status: string }) => apiKey.status === 'active')
            .map((apiKey: { id: string; name: string; partial_key_hint?: string }) => ({
              id: apiKey.id,
              name: apiKey.name || `API Key (...${apiKey.partial_key_hint?.slice(-8) || apiKey.id.slice(-8)})`,
            })));
        }
        
        nextPage = pageData.has_more ? pageData.last_id : null;
      }

      console.log(`[Anthropic] Found ${projects.length} active API key(s) in workspace`);

      return projects;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch API keys: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get cost data for a specific API key and date range
   *
   * NOTE: Anthropic's Admin API may not expose usage data via API yet.
   * This method will attempt to fetch from the usage endpoint if available,
   * otherwise it will return zeros with a note.
   *
   * @param params - Cost query parameters
   */
  async getCosts(params: CostParams): Promise<CostData> {
    const { workspace, projectId, startDate, endDate } = params;

    if (!workspace) {
      throw new Error('Workspace is required for Anthropic provider');
    }

    try {
      const scope = projectId ? `API key ${projectId}` : 'all API keys (workspace total)';
      console.log(`[Anthropic] Fetching usage for ${scope} from ${startDate} to ${endDate}`);

      // Build query parameters
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        workspace_id: workspace,
      });
      
      // Only add api_key_id if specified (omit for workspace-wide totals)
      if (projectId) {
        queryParams.set('api_key_id', projectId);
      }

      // Anthropic pricing per 1M tokens (as of late 2024)
      const MODEL_PRICING: Record<string, { input: number; output: number }> = {
        // Claude 3.5 Sonnet
        'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
        'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },
        'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
        // Claude 3.5 Haiku
        'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
        'claude-3-5-haiku': { input: 0.80, output: 4.00 },
        // Claude 3 Opus
        'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
        'claude-3-opus': { input: 15.00, output: 75.00 },
        // Claude 3 Sonnet
        'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
        'claude-3-sonnet': { input: 3.00, output: 15.00 },
        // Claude 3 Haiku
        'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
        'claude-3-haiku': { input: 0.25, output: 1.25 },
        // Claude 2.x
        'claude-2.1': { input: 8.00, output: 24.00 },
        'claude-2.0': { input: 8.00, output: 24.00 },
        'claude-instant-1.2': { input: 0.80, output: 2.40 },
        // Default fallback (Claude 3.5 Sonnet pricing)
        'default': { input: 3.00, output: 15.00 },
      };

      // Try multiple possible usage endpoints
      const usageEndpoints = [
        `/organizations/usage?${queryParams.toString()}`,
        `/usage?${queryParams.toString()}`,
        `/organizations/workspaces/${workspace}/usage?start_date=${startDate}&end_date=${endDate}`,
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let usageData: any = null;
      let usageEndpointFound = false;

      for (const endpoint of usageEndpoints) {
        try {
          const response = await this.fetchAnthropicAdmin(endpoint);
          usageData = await response.json();
          usageEndpointFound = true;
          console.log(`[Anthropic] Usage data from ${endpoint}:`, JSON.stringify(usageData, null, 2));
          break;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            console.log(`[Anthropic] Endpoint ${endpoint} not found, trying next...`);
            continue;
          }
          // For other errors, keep trying but log
          console.log(`[Anthropic] Error from ${endpoint}:`, errorMsg);
          continue;
        }
      }

      // If no usage endpoint worked, return a helpful message
      // NOTE: As of December 2024, Anthropic does NOT expose usage/billing data via their API.
      // The Admin API only provides: workspaces, api_keys, members, invites management.
      // Usage data must be checked manually in the Anthropic Console: https://console.anthropic.com/settings/billing
      if (!usageEndpointFound || !usageData) {
        console.warn('[Anthropic] Usage API not available - Anthropic does NOT expose usage data via API');
        console.warn('[Anthropic] Check usage manually at: https://console.anthropic.com/settings/billing');
        return {
          total_cost_usd: -1, // Use -1 to indicate "not available" (different from 0)
          last_updated: new Date().toISOString(),
          breakdown: [{
            model: '⚠️ Usage API not available',
            cost_usd: 0,
            requests: 0,
          }],
        };
      }

      const breakdown: ModelCost[] = [];
      let totalCost = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalRequests = 0;

      // Group by model and sum tokens/requests
      const modelMap = new Map<string, { 
        inputTokens: number; 
        outputTokens: number; 
        requests: number;
      }>();

      // Parse usage data based on expected response structure
      const usageEntries = usageData.data || usageData.usage || usageData.results || [usageData];
      
      if (Array.isArray(usageEntries)) {
        for (const entry of usageEntries) {
          const model = entry.model || 'unknown';
          const inputTokens = entry.input_tokens || entry.prompt_tokens || 0;
          const outputTokens = entry.output_tokens || entry.completion_tokens || 0;
          const requests = entry.request_count || entry.num_requests || entry.requests || 1;

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          totalRequests += requests;

          const existing = modelMap.get(model);
          if (existing) {
            existing.inputTokens += inputTokens;
            existing.outputTokens += outputTokens;
            existing.requests += requests;
          } else {
            modelMap.set(model, { inputTokens, outputTokens, requests });
          }
        }
      }

      // Calculate costs for each model using model-specific pricing
      for (const [model, { inputTokens, outputTokens, requests }] of modelMap.entries()) {
        // Find the best matching pricing
        let pricing = MODEL_PRICING[model];
        if (!pricing) {
          const modelPrefix = Object.keys(MODEL_PRICING).find(key => 
            model.startsWith(key) || key.startsWith(model.split('-').slice(0, 3).join('-'))
          );
          pricing = modelPrefix ? MODEL_PRICING[modelPrefix] : MODEL_PRICING['default'];
        }

        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;
        const modelCost = inputCost + outputCost;

        breakdown.push({
          model: model === 'unknown' ? 'Unknown Model' : model,
          cost_usd: modelCost,
          requests,
        });

        totalCost += modelCost;
      }

      // Log the calculated totals
      console.log(`[Anthropic] Calculated: ${totalInputTokens.toLocaleString()} input tokens, ${totalOutputTokens.toLocaleString()} output tokens, ${totalRequests.toLocaleString()} requests, $${totalCost.toFixed(2)} total cost`);

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
