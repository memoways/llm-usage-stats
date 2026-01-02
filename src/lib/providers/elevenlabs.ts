/**
 * ElevenLabs Provider
 *
 * Implements the ILLMProvider interface for ElevenLabs text-to-speech service.
 * ElevenLabs charges by characters, not tokens, so the cost display is adapted accordingly.
 */

import { ILLMProvider } from './interface';
import { Workspace, Project, CostParams, CostData, ModelCost } from '../types';

export class ElevenLabsProvider implements ILLMProvider {
  public readonly id = 'elevenlabs';
  public readonly name = 'ElevenLabs';
  public readonly supportsWorkspaces = false; // Single account model

  private readonly apiKey: string;
  private readonly BASE_URL = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        `ElevenLabs API key not found. Please set ELEVENLABS_API_KEY environment variable.`
      );
    }
  }

  private async fetchElevenLabs(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.BASE_URL}${endpoint}`;
    console.log(`[ElevenLabs] Fetching: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs] API error (${response.status}):`, errorText);
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    return response;
  }

  async getWorkspaces(): Promise<Workspace[]> {
    // ElevenLabs doesn't have workspaces - single account model
    return [];
  }

  async getProjects(): Promise<Project[]> {
    // ElevenLabs doesn't have projects in the same sense as OpenAI
    // We return a single "account" project representing the user's account
    try {
      const response = await this.fetchElevenLabs('/user');
      const userData = await response.json();
      
      console.log('[ElevenLabs] User data:', JSON.stringify(userData, null, 2));

      return [
        {
          id: 'account',
          name: `Account (${userData.subscription?.tier || 'Unknown tier'})`,
        },
      ];
    } catch (error) {
      console.error('[ElevenLabs] Error fetching user data:', error);
      // Return a default account even if API fails
      return [{ id: 'account', name: 'Account' }];
    }
  }

  async getCosts(params: CostParams): Promise<CostData> {
    const { startDate, endDate } = params;

    console.log(`[ElevenLabs] Fetching usage from ${startDate} to ${endDate}`);

    try {
      // Get user subscription info
      const userResponse = await this.fetchElevenLabs('/user');
      const userData = await userResponse.json();

      console.log('[ElevenLabs] Full user response:', JSON.stringify(userData, null, 2));

      // Get subscription details
      const subscriptionResponse = await this.fetchElevenLabs('/user/subscription');
      const subscriptionData = await subscriptionResponse.json();

      console.log('[ElevenLabs] Full subscription response:', JSON.stringify(subscriptionData, null, 2));

      // Extract usage data
      const characterCount = subscriptionData.character_count || userData.subscription?.character_count || 0;
      const characterLimit = subscriptionData.character_limit || userData.subscription?.character_limit || 0;
      const tier = subscriptionData.tier || userData.subscription?.tier || 'unknown';

      // ElevenLabs pricing per 1000 characters (approximate, varies by plan)
      // These are rough estimates based on public pricing
      const PRICING_PER_1000_CHARS: Record<string, number> = {
        'free': 0,           // Free tier
        'starter': 0.30,     // ~$5/mo for ~17k chars
        'creator': 0.24,     // ~$22/mo for ~100k chars  
        'pro': 0.18,         // ~$99/mo for ~500k chars
        'scale': 0.11,       // ~$330/mo for ~2M chars
        'business': 0.08,    // Custom pricing
        'enterprise': 0.05,  // Custom pricing
        'growing_business': 0.11,
        'default': 0.20,
      };

      const pricePerChar = (PRICING_PER_1000_CHARS[tier.toLowerCase()] || PRICING_PER_1000_CHARS['default']) / 1000;
      const estimatedCost = characterCount * pricePerChar;

      // Calculate usage percentage
      const usagePercent = characterLimit > 0 ? ((characterCount / characterLimit) * 100).toFixed(1) : 'N/A';

      const breakdown: ModelCost[] = [
        {
          model: `Characters Used (${tier})`,
          cost_usd: estimatedCost,
          requests: characterCount,
        },
      ];

      // Add a breakdown item showing the quota
      if (characterLimit > 0) {
        breakdown.push({
          model: `Quota: ${characterCount.toLocaleString()} / ${characterLimit.toLocaleString()} (${usagePercent}%)`,
          cost_usd: 0,
          requests: 0,
        });
      }

      // Get detailed usage stats for the date range
      try {
        const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
        const endUnix = Math.floor(new Date(endDate).getTime() / 1000);
        
        const usageResponse = await this.fetchElevenLabs(
          `/usage/character-stats?start_unix=${startUnix}&end_unix=${endUnix}`
        );
        const usageData = await usageResponse.json();
        console.log('[ElevenLabs] Usage stats for period:', JSON.stringify(usageData, null, 2));
        
        // If we get detailed stats, recalculate cost based on actual period usage
        if (usageData && Array.isArray(usageData) && usageData.length > 0) {
          // Sum up characters for the period
          const periodCharacters = usageData.reduce((sum: number, item: { character_count?: number }) => {
            return sum + (item.character_count || 0);
          }, 0);
          
          const periodCost = periodCharacters * pricePerChar;
          
          // Update breakdown with period-specific data
          return {
            total_cost_usd: periodCost,
            last_updated: new Date().toISOString(),
            breakdown: [
              {
                model: `Characters (${startDate} to ${endDate})`,
                cost_usd: periodCost,
                requests: periodCharacters,
              },
              {
                model: `Monthly Quota: ${characterCount.toLocaleString()} / ${characterLimit.toLocaleString()} (${usagePercent}%)`,
                cost_usd: 0,
                requests: 0,
              },
            ],
          };
        }
      } catch (usageError) {
        // Usage stats endpoint might not be available, fall back to monthly data
        console.log('[ElevenLabs] Detailed usage stats not available, using monthly totals');
      }

      return {
        total_cost_usd: estimatedCost,
        last_updated: new Date().toISOString(),
        breakdown,
      };
    } catch (error) {
      console.error('[ElevenLabs] Error fetching costs:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch ElevenLabs usage: ${error.message}`);
      }
      throw error;
    }
  }
}

