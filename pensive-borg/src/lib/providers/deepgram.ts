/**
 * Deepgram Provider
 *
 * Implements the ILLMProvider interface for Deepgram speech-to-text service.
 * Deepgram charges by audio duration (hours/minutes), not tokens.
 */

import { ILLMProvider } from './interface';
import { Workspace, Project, CostParams, CostData, ModelCost } from '../types';

export class DeepgramProvider implements ILLMProvider {
  public readonly id = 'deepgram';
  public readonly name = 'Deepgram';
  public readonly supportsWorkspaces = true; // Deepgram has projects

  private readonly apiKey: string;
  private readonly BASE_URL = 'https://api.deepgram.com/v1';

  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        `Deepgram API key not found. Please set DEEPGRAM_API_KEY environment variable.`
      );
    }
  }

  private async fetchDeepgram(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.BASE_URL}${endpoint}`;
    console.log(`[Deepgram] Fetching: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Deepgram] API error (${response.status}):`, errorText);
      throw new Error(`Deepgram API error (${response.status}): ${errorText}`);
    }

    return response;
  }

  async getWorkspaces(): Promise<Workspace[]> {
    // In Deepgram, "projects" are the top-level organizational unit
    // We'll treat them as workspaces for consistency with our UI
    try {
      const response = await this.fetchDeepgram('/projects');
      const data = await response.json();

      console.log('[Deepgram] Projects response:', JSON.stringify(data, null, 2));

      if (!data.projects || !Array.isArray(data.projects)) {
        console.error('[Deepgram] Unexpected projects response format:', data);
        return [];
      }

      const workspaces = data.projects.map((project: { project_id: string; name: string }) => ({
        id: project.project_id,
        name: project.name,
      }));

      console.log(`[Deepgram] Found ${workspaces.length} project(s): ${workspaces.map((w: Workspace) => w.name).join(', ')}`);
      return workspaces;
    } catch (error) {
      console.error('[Deepgram] Error fetching projects:', error);
      throw error;
    }
  }

  async getProjects(workspaceId?: string): Promise<Project[]> {
    if (!workspaceId) {
      return [];
    }

    // Get API keys for the project - these act as our "projects" for cost tracking
    try {
      const response = await this.fetchDeepgram(`/projects/${workspaceId}/keys`);
      const data = await response.json();

      console.log('[Deepgram] Keys response:', JSON.stringify(data, null, 2));

      if (!data.api_keys || !Array.isArray(data.api_keys)) {
        // If no keys, return a default "all usage" project
        return [{ id: 'all', name: 'All Usage' }];
      }

      // Deepgram nests key info under api_key object
      const projects: Project[] = [
        { id: 'all', name: 'All Usage (Project Total)' },
        ...data.api_keys.map((keyEntry: { api_key: { api_key_id: string; comment: string } }) => ({
          id: keyEntry.api_key.api_key_id,
          name: keyEntry.api_key.comment || `API Key ...${keyEntry.api_key.api_key_id.slice(-8)}`,
        })),
      ];

      console.log(`[Deepgram] Found ${projects.length} API key(s)`);
      return projects;
    } catch (error) {
      console.error('[Deepgram] Error fetching keys:', error);
      // Return default project on error
      return [{ id: 'all', name: 'All Usage' }];
    }
  }

  async getCosts(params: CostParams): Promise<CostData> {
    const { workspace, startDate, endDate } = params;

    if (!workspace) {
      throw new Error('Workspace (project) is required for Deepgram provider');
    }

    console.log(`[Deepgram] Fetching usage for project ${workspace} from ${startDate} to ${endDate}`);

    // Deepgram pricing per hour (approximate, varies by model and plan)
    const MODEL_PRICING_PER_HOUR: Record<string, number> = {
      'nova-2': 0.0043 * 60,      // $0.0043/min = $0.258/hour
      'nova': 0.0043 * 60,
      'enhanced': 0.0145 * 60,    // $0.0145/min = $0.87/hour
      'base': 0.0125 * 60,        // $0.0125/min = $0.75/hour
      'whisper': 0.0048 * 60,     // $0.0048/min = $0.288/hour
      'default': 0.0043 * 60,     // Default to Nova pricing
    };

    try {
      // Get usage data for the project
      // Deepgram expects dates in YYYY-MM-DD format
      const startFormatted = startDate.split('T')[0]; // Extract just the date part
      const endFormatted = endDate.split('T')[0];
      
      // Try the usage endpoint with date range
      const usageResponse = await this.fetchDeepgram(
        `/projects/${workspace}/usage?start=${startFormatted}&end=${endFormatted}`
      );
      const usageData = await usageResponse.json();

      console.log('[Deepgram] Usage response:', JSON.stringify(usageData, null, 2));

      // Also get balances
      let balanceData = null;
      try {
        const balanceResponse = await this.fetchDeepgram(`/projects/${workspace}/balances`);
        balanceData = await balanceResponse.json();
        console.log('[Deepgram] Balance response:', JSON.stringify(balanceData, null, 2));
      } catch (balanceError) {
        console.log('[Deepgram] Could not fetch balance:', balanceError);
      }

      // Parse usage data - Deepgram returns results by day
      const breakdown: ModelCost[] = [];
      let totalCost = 0;
      let totalHours = 0;
      let totalRequests = 0;

      // Deepgram response format: { results: [{ start, end, hours, requests, ... }] }
      if (usageData.results && Array.isArray(usageData.results)) {
        // Sum up all daily results
        for (const result of usageData.results) {
          const hours = result.hours || result.total_hours || 0;
          const requests = result.requests || 0;
          
          totalHours += hours;
          totalRequests += requests;
        }

        // Calculate cost based on Nova-2 pricing (most common)
        const pricePerHour = MODEL_PRICING_PER_HOUR['default'];
        totalCost = totalHours * pricePerHour;

        if (totalHours > 0 || totalRequests > 0) {
          breakdown.push({
            model: `Speech-to-Text (${this.formatDuration(totalHours)})`,
            cost_usd: totalCost,
            requests: totalRequests,
          });
        }
      } else if (usageData.hours !== undefined || usageData.duration !== undefined) {
        // Simple format with total hours
        const hours = usageData.hours || usageData.duration || 0;
        const requests = usageData.requests || usageData.count || 0;
        const pricePerHour = MODEL_PRICING_PER_HOUR['default'];
        const cost = hours * pricePerHour;

        totalCost = cost;
        totalHours = hours;

        breakdown.push({
          model: `Speech-to-Text (${this.formatDuration(hours)})`,
          cost_usd: cost,
          requests: requests,
        });
      }

      // Add balance info if available
      if (balanceData && balanceData.balances && Array.isArray(balanceData.balances)) {
        for (const balance of balanceData.balances) {
          if (balance.amount !== undefined) {
            breakdown.push({
              model: `Credit Balance: $${balance.amount.toFixed(2)}`,
              cost_usd: 0,
              requests: 0,
            });
          }
        }
      }

      // If no data found, add a "no usage" message
      if (breakdown.length === 0 && totalHours === 0) {
        breakdown.push({
          model: 'No usage in this period',
          cost_usd: 0,
          requests: 0,
        });
      }

      // If still no data, return a helpful message
      if (breakdown.length === 0) {
        breakdown.push({
          model: 'No usage data found for this period',
          cost_usd: 0,
          requests: 0,
        });
      }

      return {
        total_cost_usd: totalCost,
        last_updated: new Date().toISOString(),
        breakdown,
      };
    } catch (error) {
      console.error('[Deepgram] Error fetching usage:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Deepgram usage: ${error.message}`);
      }
      throw error;
    }
  }

  private formatDuration(hours: number): string {
    if (hours < 1/60) {
      const seconds = Math.round(hours * 3600);
      return `${seconds}s`;
    } else if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}min`;
    } else {
      return `${hours.toFixed(2)}h`;
    }
  }
}

