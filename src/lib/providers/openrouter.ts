/**
 * OpenRouter Provider
 *
 * Implements the ILLMProvider interface for OpenRouter.
 * OpenRouter provides access to multiple LLM models (GPT-4, Claude, Llama, etc.)
 * with a unified API and pay-as-you-go pricing.
 */

import { ILLMProvider } from './interface';
import { Workspace, Project, CostParams, CostData, ModelCost } from '../types';

export class OpenRouterProvider implements ILLMProvider {
  public readonly id = 'openrouter';
  public readonly name = 'OpenRouter';
  public readonly supportsWorkspaces = false; // Single account model

  private readonly apiKey: string;
  private readonly BASE_URL = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        `OpenRouter API key not found. Please set OPENROUTER_API_KEY environment variable.`
      );
    }
  }

  private async fetchOpenRouter(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.BASE_URL}${endpoint}`;
    console.log(`[OpenRouter] Fetching: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenRouter] API error (${response.status}):`, errorText);
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    return response;
  }

  async getWorkspaces(): Promise<Workspace[]> {
    // OpenRouter doesn't have workspaces - single account model
    return [];
  }

  async getProjects(): Promise<Project[]> {
    // OpenRouter doesn't have projects - return a single "account" entry
    return [{ id: 'account', name: 'Account' }];
  }

  async getCosts(params: CostParams): Promise<CostData> {
    const { startDate, endDate } = params;

    console.log(`[OpenRouter] Fetching usage from ${startDate} to ${endDate}`);

    try {
      // Get key info with usage stats
      const keyResponse = await this.fetchOpenRouter('/auth/key');
      const keyData = await keyResponse.json();

      console.log('[OpenRouter] Key data:', JSON.stringify(keyData, null, 2));

      // Get credits info
      const creditsResponse = await this.fetchOpenRouter('/credits');
      const creditsData = await creditsResponse.json();

      console.log('[OpenRouter] Credits data:', JSON.stringify(creditsData, null, 2));

      const breakdown: ModelCost[] = [];

      // Extract usage data from key info
      const keyInfo = keyData.data || keyData;
      const usage = keyInfo.usage || 0;
      const usageDaily = keyInfo.usage_daily || 0;
      const usageWeekly = keyInfo.usage_weekly || 0;
      const usageMonthly = keyInfo.usage_monthly || 0;
      const limit = keyInfo.limit;
      const limitRemaining = keyInfo.limit_remaining;

      // Extract credits data
      const credits = creditsData.data || creditsData;
      const totalCredits = credits.total_credits || 0;
      const totalUsage = credits.total_usage || 0;

      // Determine which usage to show based on date range
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));

      let periodUsage = totalUsage;
      let periodLabel = 'Total';

      if (daysDiff <= 1) {
        periodUsage = usageDaily;
        periodLabel = 'Today';
      } else if (daysDiff <= 7) {
        periodUsage = usageWeekly;
        periodLabel = 'Last 7 Days';
      } else if (daysDiff <= 31) {
        periodUsage = usageMonthly;
        periodLabel = 'Last 30 Days';
      }

      // Add usage breakdown
      if (periodUsage > 0) {
        breakdown.push({
          model: `Usage (${periodLabel})`,
          cost_usd: periodUsage,
          requests: 0, // OpenRouter doesn't provide request count in this endpoint
        });
      }

      // Add usage breakdown by period if available
      if (usageDaily > 0 && periodLabel !== 'Today') {
        breakdown.push({
          model: `Today`,
          cost_usd: usageDaily,
          requests: 0,
        });
      }

      if (usageWeekly > 0 && periodLabel !== 'Last 7 Days' && usageWeekly !== usageDaily) {
        breakdown.push({
          model: `Last 7 Days`,
          cost_usd: usageWeekly,
          requests: 0,
        });
      }

      if (usageMonthly > 0 && periodLabel !== 'Last 30 Days' && usageMonthly !== usageWeekly) {
        breakdown.push({
          model: `Last 30 Days`,
          cost_usd: usageMonthly,
          requests: 0,
        });
      }

      // Add credit balance info
      const remaining = totalCredits - totalUsage;
      breakdown.push({
        model: `Credit Balance: $${remaining.toFixed(2)} / $${totalCredits.toFixed(2)}`,
        cost_usd: 0,
        requests: 0,
      });

      // Add limit info if set
      if (limit !== null && limitRemaining !== null) {
        breakdown.push({
          model: `Key Limit Remaining: $${limitRemaining.toFixed(2)} / $${limit.toFixed(2)}`,
          cost_usd: 0,
          requests: 0,
        });
      }

      // If no usage, show a message
      if (breakdown.length === 0 || (periodUsage === 0 && totalUsage === 0)) {
        breakdown.unshift({
          model: 'No usage recorded',
          cost_usd: 0,
          requests: 0,
        });
      }

      return {
        total_cost_usd: totalUsage,
        last_updated: new Date().toISOString(),
        breakdown,
      };
    } catch (error) {
      console.error('[OpenRouter] Error fetching usage:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch OpenRouter usage: ${error.message}`);
      }
      throw error;
    }
  }
}

