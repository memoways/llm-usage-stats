/**
 * OpenAIProvider - Implementation of ILLMProvider for OpenAI
 *
 * This provider supports multiple workspaces, detected dynamically from environment variables.
 * Each workspace has its own API key stored in environment variables with pattern:
 *   OPENAI_API_KEY_<WORKSPACE_NAME>=sk-admin-xxx...
 *
 * Example:
 *   OPENAI_API_KEY_PRODUCTION=sk-admin-xxx...
 *   OPENAI_API_KEY_DEVELOPMENT=sk-admin-xxx...
 */

import { ILLMProvider } from './interface';
import { Workspace, Project, CostParams, CostData, ModelCost } from '../types';

export class OpenAIProvider implements ILLMProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI';
  public readonly supportsWorkspaces = true;

  // Workspace configurations - detected dynamically from environment variables
  private readonly workspaces: Workspace[] = [];

  constructor() {
    // Dynamically detect workspaces from environment variables
    // Looking for OPENAI_API_KEY_<WORKSPACE_NAME> pattern
    const envKeys = Object.keys(process.env);
    const workspacePattern = /^OPENAI_API_KEY_(\w+)$/;
    
    for (const key of envKeys) {
      const match = key.match(workspacePattern);
      if (match && process.env[key]) {
        const workspaceId = match[1].toLowerCase();
        // Convert to title case for display name
        const workspaceName = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        this.workspaces.push({ id: workspaceId, name: workspaceName });
      }
    }

    // Sort workspaces alphabetically
    this.workspaces.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`[OpenAI] Detected ${this.workspaces.length} workspace(s):`, this.workspaces.map(w => w.name).join(', '));
  }

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
      // Convert dates to Unix timestamps (seconds) as required by OpenAI usage API
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      
      const scope = projectId ? `project ${projectId}` : 'all projects (workspace total)';
      console.log(`[OpenAI] Fetching usage for ${scope} from ${startDate} to ${endDate}`);

      // OpenAI API has a limit of 31 days per request with daily buckets
      // For longer periods, we need to chunk into 31-day windows
      const SECONDS_PER_DAY = 86400;
      const MAX_DAYS_PER_REQUEST = 30; // Use 30 to be safe (API limit is 31)
      const MAX_SECONDS_PER_REQUEST = MAX_DAYS_PER_REQUEST * SECONDS_PER_DAY;

      // Generate time chunks
      const timeChunks: { start: number; end: number }[] = [];
      let chunkStart = startTimestamp;
      while (chunkStart < endTimestamp) {
        const chunkEnd = Math.min(chunkStart + MAX_SECONDS_PER_REQUEST, endTimestamp);
        timeChunks.push({ start: chunkStart, end: chunkEnd });
        chunkStart = chunkEnd;
      }

      console.log(`[OpenAI] Date range requires ${timeChunks.length} time chunk(s)`);

      // Helper function to fetch ALL pages for a single time chunk
      const fetchAllPagesForChunk = async (chunk: { start: number; end: number }): Promise<any[]> => {
        const allChunkBuckets: any[] = [];
        let nextPage: string | null = null;
        let pageCount = 0;
        const MAX_PAGES_PER_CHUNK = 50; // Safety limit
        
        do {
          const queryParams = new URLSearchParams({
            start_time: chunk.start.toString(),
            end_time: chunk.end.toString(),
            group_by: 'model', // Get model-level breakdown
          });
          
          // Only add project_ids if specified (omit for workspace-wide totals)
          if (projectId) {
            queryParams.set('project_ids', projectId);
          }
          
          // Add pagination token if we have one
          if (nextPage) {
            queryParams.set('page', nextPage);
          }

          let success = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const response = await this.fetchOpenAI(
                `/usage/completions?${queryParams.toString()}`,
                workspace,
                {},
                true // isAdminAPI
              );

              const data = await response.json();
              
              // Collect buckets from this page
              if (data.data && Array.isArray(data.data)) {
                allChunkBuckets.push(...data.data);
              }
              
              // Check for more pages
              nextPage = data.has_more ? data.next_page : null;
              pageCount++;
              success = true;
              break;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              
              if (errorMsg.includes('404')) {
                throw new Error(`OpenAI usage endpoint not found.`);
              } else if (errorMsg.includes('403')) {
                throw new Error(`OpenAI API permission denied. Check API key scopes.`);
              }
              
              // Retry on 503 or timeout errors
              if (attempt < 3 && (errorMsg.includes('503') || errorMsg.includes('timeout'))) {
                console.log(`[OpenAI] Page request failed (attempt ${attempt}/3), retrying in ${attempt * 2}s...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                continue;
              }
              throw error;
            }
          }
          
          if (!success) {
            break;
          }
        } while (nextPage && pageCount < MAX_PAGES_PER_CHUNK);
        
        return allChunkBuckets;
      };

      // Fetch chunks SEQUENTIALLY to avoid overwhelming the API and hitting timeouts
      // The API has pagination within each chunk, so parallel requests cause too many concurrent connections
      const allBuckets: any[] = [];
      
      for (let i = 0; i < timeChunks.length; i++) {
        const chunk = timeChunks[i];
        const startStr = new Date(chunk.start * 1000).toISOString().split('T')[0];
        const endStr = new Date(chunk.end * 1000).toISOString().split('T')[0];
        console.log(`[OpenAI] Fetching chunk ${i + 1}/${timeChunks.length}: ${startStr} to ${endStr}`);
        
        try {
          const chunkBuckets = await fetchAllPagesForChunk(chunk);
          allBuckets.push(...chunkBuckets);
          console.log(`[OpenAI] Chunk ${i + 1} returned ${chunkBuckets.length} buckets`);
        } catch (error) {
          // Log error but continue with other chunks
          console.error(`[OpenAI] Chunk ${i + 1} failed:`, error instanceof Error ? error.message : error);
          // Re-throw to stop processing - partial data would be confusing
          throw error;
        }
      }

      console.log(`[OpenAI] Fetched all ${timeChunks.length} chunks, collected ${allBuckets.length} total buckets`);
      
      // Debug: Log detailed bucket structure to understand the API response
      if (allBuckets.length > 0) {
        console.log(`[OpenAI] Sample bucket (first):`, JSON.stringify(allBuckets[0], null, 2));
        console.log(`[OpenAI] Sample bucket (last):`, JSON.stringify(allBuckets[allBuckets.length - 1], null, 2));
        console.log(`[OpenAI] All bucket keys:`, [...new Set(allBuckets.flatMap(b => Object.keys(b)))]);
      }

      // OpenAI Usage API returns buckets with results containing token counts
      // We need to calculate costs from tokens using model-specific pricing
      // Pricing per 1M tokens (as of late 2024):
      const MODEL_PRICING: Record<string, { input: number; output: number }> = {
        // GPT-4o
        'gpt-4o': { input: 2.50, output: 10.00 },
        'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
        'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
        'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
        // GPT-4o mini
        'gpt-4o-mini': { input: 0.15, output: 0.60 },
        'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
        // GPT-4 Turbo
        'gpt-4-turbo': { input: 10.00, output: 30.00 },
        'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
        'gpt-4-1106-preview': { input: 10.00, output: 30.00 },
        // GPT-4
        'gpt-4': { input: 30.00, output: 60.00 },
        'gpt-4-0613': { input: 30.00, output: 60.00 },
        // GPT-3.5 Turbo
        'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
        'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
        'gpt-3.5-turbo-1106': { input: 1.00, output: 2.00 },
        // Embeddings
        'text-embedding-3-small': { input: 0.02, output: 0 },
        'text-embedding-3-large': { input: 0.13, output: 0 },
        'text-embedding-ada-002': { input: 0.10, output: 0 },
        // Default fallback
        'default': { input: 2.50, output: 10.00 },
      };

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

      // Parse all collected buckets from pagination
      let bucketsWithResults = 0;
      let bucketsWithoutResults = 0;
      let totalResultsProcessed = 0;
      
      for (const bucket of allBuckets) {
        // Check multiple possible data structures
        // Structure 1: bucket.results[] array (original expected)
        // Structure 2: bucket itself contains the fields directly
        // Structure 3: bucket is the result object
        
        if (bucket.results && Array.isArray(bucket.results)) {
          bucketsWithResults++;
          for (const result of bucket.results) {
            const model = result.model || 'unknown';
            const inputTokens = result.input_tokens || 0;
            const outputTokens = result.output_tokens || 0;
            const requests = result.num_model_requests || 0;

            totalInputTokens += inputTokens;
            totalOutputTokens += outputTokens;
            totalRequests += requests;
            totalResultsProcessed++;

            const existing = modelMap.get(model);
            if (existing) {
              existing.inputTokens += inputTokens;
              existing.outputTokens += outputTokens;
              existing.requests += requests;
            } else {
              modelMap.set(model, { inputTokens, outputTokens, requests });
            }
          }
        } else if (bucket.input_tokens !== undefined || bucket.output_tokens !== undefined) {
          // Direct structure - bucket IS the result
          bucketsWithResults++;
          const model = bucket.model || 'unknown';
          const inputTokens = bucket.input_tokens || 0;
          const outputTokens = bucket.output_tokens || 0;
          const requests = bucket.num_model_requests || 0;

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          totalRequests += requests;
          totalResultsProcessed++;

          const existing = modelMap.get(model);
          if (existing) {
            existing.inputTokens += inputTokens;
            existing.outputTokens += outputTokens;
            existing.requests += requests;
          } else {
            modelMap.set(model, { inputTokens, outputTokens, requests });
          }
        } else {
          bucketsWithoutResults++;
        }
      }
      
      console.log(`[OpenAI] Parsed ${bucketsWithResults} buckets with data, ${bucketsWithoutResults} empty, ${totalResultsProcessed} total results`);
      console.log(`[OpenAI] Models found:`, [...modelMap.keys()]);

      // Calculate costs for each model using model-specific pricing
      for (const [model, { inputTokens, outputTokens, requests }] of modelMap.entries()) {
        // Find the best matching pricing (try exact match, then prefix match, then default)
        let pricing = MODEL_PRICING[model];
        if (!pricing) {
          // Try to find a prefix match (e.g., 'gpt-4o-2024-11-20' matches 'gpt-4o')
          const modelPrefix = Object.keys(MODEL_PRICING).find(key => 
            model.startsWith(key) || key.startsWith(model.split('-').slice(0, 2).join('-'))
          );
          pricing = modelPrefix ? MODEL_PRICING[modelPrefix] : MODEL_PRICING['default'];
        }

        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;
        const modelCost = inputCost + outputCost;

        // Create a readable model name
        let displayName = model;
        if (model === 'unknown' || model === null) {
          displayName = 'Unknown Model';
        }

        breakdown.push({
          model: displayName,
          cost_usd: modelCost,
          requests,
        });

        totalCost += modelCost;
      }

      // If no breakdown but we have totals, create a summary entry
      if (breakdown.length === 0 && (totalInputTokens > 0 || totalOutputTokens > 0)) {
        const defaultPricing = MODEL_PRICING['default'];
        const inputCost = (totalInputTokens / 1_000_000) * defaultPricing.input;
        const outputCost = (totalOutputTokens / 1_000_000) * defaultPricing.output;
        totalCost = inputCost + outputCost;
        
        breakdown.push({
          model: 'All Models (aggregated)',
          cost_usd: totalCost,
          requests: totalRequests,
        });
      }

      // Log the calculated totals
      console.log(`[OpenAI] Calculated: ${totalInputTokens.toLocaleString()} input tokens, ${totalOutputTokens.toLocaleString()} output tokens, ${totalRequests.toLocaleString()} requests, $${totalCost.toFixed(2)} total cost`);

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
