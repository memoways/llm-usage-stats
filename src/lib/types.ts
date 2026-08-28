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

export interface CostSeriesPoint {
  date: string; // YYYY-MM-DD (day) or YYYY-MM (month)
  cost_usd: number;
}

export type SeriesGrain = "day" | "month";

export interface CostData {
  total_cost_usd: number;
  last_updated: string;     // ISO 8601 timestamp
  breakdown: ModelCost[];
  /** Cost over the selected filter range. Empty when the provider has no time axis. */
  series: CostSeriesPoint[];
  seriesGrain: SeriesGrain;
  /** Shown when the series is a period total, not a real daily/monthly curve. */
  seriesNote?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  supportsWorkspaces: boolean;
}
