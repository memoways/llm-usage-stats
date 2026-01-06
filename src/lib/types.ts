/**
 * Common TypeScript types for LLM Cost Tracker
 */

export interface Workspace {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface CostParams {
  workspace?: string;
  projectId?: string; // Optional: omit for workspace-wide totals
  startDate: string;  // ISO 8601 format
  endDate: string;    // ISO 8601 format
}

export interface ModelCost {
  model: string;        // Native model name from the LLM provider
  cost_usd: number;     // Cost in USD
  requests: number;     // Number of requests/calls made
}

export interface CostData {
  total_cost_usd: number;
  last_updated: string;     // ISO 8601 timestamp
  breakdown: ModelCost[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  supportsWorkspaces: boolean;
}
