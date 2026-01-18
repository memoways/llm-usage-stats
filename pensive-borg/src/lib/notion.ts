/**
 * Notion Integration for LLM Cost Tracking
 *
 * This module handles all interactions with Notion databases using a
 * relational structure:
 * - Services: Reference table for LLM providers (OpenAI, Anthropic, etc.)
 * - Usages: Detailed usage entries linked to services
 *
 * All requests are made server-side to avoid CORS issues.
 */

import { Client } from '@notionhq/client';
import { ModelCost } from './types';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Database IDs from environment
const SERVICES_DB_ID = process.env.NOTION_SERVICES_DB_ID || '';
const USAGES_DB_ID = process.env.NOTION_USAGES_DB_ID || '';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Collection status for debug/validation
 */
export type CollectionStatus = 'Succes' | 'Echec' | 'Partiel' | 'Donnees indisponibles';

/**
 * Service - A provider entry in the Services database
 */
export interface Service {
  id: string; // Notion page ID
  name: string; // Display name (OpenAI, Anthropic, etc.)
  providerId: string; // Technical ID (openai, anthropic, etc.)
  status: string; // Actif, Inactif, En attente API
  consoleUrl?: string;
  notes?: string;
}

/**
 * Usage Entry - Detailed usage data for a collection session
 */
export interface UsageEntry {
  identifier: string; // Format: "2026-01 - OpenAI - ProjectName"
  servicePageId: string; // Notion page ID of the related service
  month: string; // Format: "2026-01"
  projectApiKey: string; // Project name, API key, or workspace if not available
  workspace?: string; // Workspace ID if applicable
  models: string; // Comma-separated list of models used
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  requests: number;
  breakdownJson: string; // Full breakdown as JSON string
  collectedAt: string; // ISO timestamp
  collectionStatus: CollectionStatus;
  logStatus: string; // Debug messages, errors, collection info
}

/**
 * Usage data returned from queries (includes computed fields)
 */
export interface UsageData extends Omit<UsageEntry, 'servicePageId'> {
  id: string; // Notion page ID
  serviceName: string;
  tokensTotal: number;
}

// Legacy interfaces for backward compatibility with report page
export interface ProviderSnapshot {
  month: string;
  provider: string;
  totalCostUsd: number;
  requests: number;
  breakdown: ModelCost[];
  collectedAt: string;
}

export interface MonthlySummary {
  month: string;
  totalCostUsd: number;
  previousMonthCost: number;
  changePercent: number;
  providerCount: number;
  reportUrl: string;
  collectedAt: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Check if Notion is properly configured
 */
export function isNotionConfigured(): boolean {
  return !!(
    process.env.NOTION_API_KEY &&
    process.env.NOTION_SERVICES_DB_ID &&
    process.env.NOTION_USAGES_DB_ID
  );
}

// ============================================================================
// SERVICES DATABASE
// ============================================================================

/**
 * Get or create a service entry by provider ID
 */
export async function getOrCreateService(providerId: string, displayName: string): Promise<Service> {
  if (!isNotionConfigured()) {
    throw new Error('Notion is not configured. Please set NOTION_API_KEY and database IDs.');
  }

  // First, try to find existing service
  const existing = await findServiceByProviderId(providerId);
  if (existing) {
    return existing;
  }

  // Create new service entry
  const consoleUrls: Record<string, string> = {
    openai: 'https://platform.openai.com',
    anthropic: 'https://console.anthropic.com',
    elevenlabs: 'https://elevenlabs.io',
    deepgram: 'https://console.deepgram.com',
    openrouter: 'https://openrouter.ai',
  };

  const response = await notion.pages.create({
    parent: { database_id: SERVICES_DB_ID },
    properties: {
      'Nom': {
        title: [{ text: { content: displayName } }],
      },
      'ID Provider': {
        rich_text: [{ text: { content: providerId } }],
      },
      'Statut': {
        select: { name: 'Actif' },
      },
      'URL Console': {
        url: consoleUrls[providerId] || null,
      },
    },
  });

  return {
    id: response.id,
    name: displayName,
    providerId,
    status: 'Actif',
    consoleUrl: consoleUrls[providerId],
  };
}

/**
 * Find a service by provider ID
 */
export async function findServiceByProviderId(providerId: string): Promise<Service | null> {
  if (!isNotionConfigured()) {
    return null;
  }

  const response = await notion.databases.query({
    database_id: SERVICES_DB_ID,
    filter: {
      property: 'ID Provider',
      rich_text: { equals: providerId },
    },
  });

  if (response.results.length === 0) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = response.results[0] as any;
  return parseServicePage(page);
}

/**
 * Get all services
 */
export async function getAllServices(): Promise<Service[]> {
  if (!isNotionConfigured()) {
    return [];
  }

  const response = await notion.databases.query({
    database_id: SERVICES_DB_ID,
    sorts: [{ property: 'Nom', direction: 'ascending' }],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.results.map((page: any) => parseServicePage(page));
}

/**
 * Parse a Notion page into Service
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseServicePage(page: any): Service {
  const props = page.properties;
  return {
    id: page.id,
    name: props['Nom']?.title?.[0]?.text?.content || '',
    providerId: props['ID Provider']?.rich_text?.[0]?.text?.content || '',
    status: props['Statut']?.select?.name || 'Actif',
    consoleUrl: props['URL Console']?.url || undefined,
    notes: props['Notes']?.rich_text?.[0]?.text?.content || undefined,
  };
}

// ============================================================================
// USAGES DATABASE
// ============================================================================

/**
 * Create a new usage entry
 */
export async function createUsageEntry(entry: UsageEntry): Promise<string> {
  if (!isNotionConfigured()) {
    throw new Error('Notion is not configured. Please set NOTION_API_KEY and database IDs.');
  }

  // Truncate breakdown JSON if too long (Notion has 2000 char limit for rich_text)
  let breakdownJson = entry.breakdownJson;
  if (breakdownJson.length > 1900) {
    // Keep first items and add truncation note
    try {
      const breakdown = JSON.parse(breakdownJson);
      const truncated = breakdown.slice(0, 5);
      breakdownJson = JSON.stringify(truncated) + ' [truncated]';
    } catch {
      breakdownJson = breakdownJson.substring(0, 1900) + '... [truncated]';
    }
  }

  // Truncate log status if too long
  let logStatus = entry.logStatus;
  if (logStatus.length > 1900) {
    logStatus = logStatus.substring(0, 1900) + '... [truncated]';
  }

  const response = await notion.pages.create({
    parent: { database_id: USAGES_DB_ID },
    properties: {
      'Identifiant': {
        title: [{ text: { content: entry.identifier } }],
      },
      'Service': {
        relation: [{ id: entry.servicePageId }],
      },
      'Mois': {
        rich_text: [{ text: { content: entry.month } }],
      },
      'Projet/API Key': {
        rich_text: [{ text: { content: entry.projectApiKey } }],
      },
      'Workspace': {
        rich_text: [{ text: { content: entry.workspace || '' } }],
      },
      'Modèles': {
        rich_text: [{ text: { content: entry.models } }],
      },
      'Tokens Input': {
        number: entry.tokensInput,
      },
      'Tokens Output': {
        number: entry.tokensOutput,
      },
      'Coût USD': {
        number: entry.costUsd,
      },
      'Requêtes': {
        number: entry.requests,
      },
      'Breakdown JSON': {
        rich_text: [{ text: { content: breakdownJson } }],
      },
      'Collecte Le': {
        date: { start: entry.collectedAt },
      },
      'Statut Collecte': {
        select: { name: entry.collectionStatus },
      },
      'Log Status': {
        rich_text: [{ text: { content: logStatus } }],
      },
    },
  });

  return response.id;
}

/**
 * Get all usage entries for a specific month
 */
export async function getMonthUsages(month: string): Promise<UsageData[]> {
  if (!isNotionConfigured()) {
    return [];
  }

  const response = await notion.databases.query({
    database_id: USAGES_DB_ID,
    filter: {
      property: 'Mois',
      rich_text: { equals: month },
    },
    sorts: [{ property: 'Coût USD', direction: 'descending' }],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.results.map((page: any) => parseUsagePage(page));
}

/**
 * Get usage entries for a specific month and provider
 */
export async function getMonthUsagesByProvider(month: string, providerId: string): Promise<UsageData[]> {
  const allUsages = await getMonthUsages(month);
  // Filter by checking if the identifier contains the provider name
  // This is a workaround since we can't easily filter by relation properties
  return allUsages.filter(u => 
    u.identifier.toLowerCase().includes(providerId.toLowerCase())
  );
}

/**
 * Parse a Notion page into UsageData
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseUsagePage(page: any): UsageData {
  const props = page.properties;
  
  const tokensInput = props['Tokens Input']?.number || 0;
  const tokensOutput = props['Tokens Output']?.number || 0;

  return {
    id: page.id,
    identifier: props['Identifiant']?.title?.[0]?.text?.content || '',
    serviceName: '', // Would need additional query to get service name
    month: props['Mois']?.rich_text?.[0]?.text?.content || '',
    projectApiKey: props['Projet/API Key']?.rich_text?.[0]?.text?.content || '',
    workspace: props['Workspace']?.rich_text?.[0]?.text?.content || undefined,
    models: props['Modèles']?.rich_text?.[0]?.text?.content || '',
    tokensInput,
    tokensOutput,
    tokensTotal: tokensInput + tokensOutput,
    costUsd: props['Coût USD']?.number || 0,
    requests: props['Requêtes']?.number || 0,
    breakdownJson: props['Breakdown JSON']?.rich_text?.[0]?.text?.content || '[]',
    collectedAt: props['Collecte Le']?.date?.start || '',
    collectionStatus: props['Statut Collecte']?.select?.name || 'Succes',
    logStatus: props['Log Status']?.rich_text?.[0]?.text?.content || '',
  };
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

/**
 * Get aggregated data for a month (for report page compatibility)
 */
export async function getMonthSnapshots(month: string): Promise<ProviderSnapshot[]> {
  const usages = await getMonthUsages(month);
  
  // Group by provider (extracted from identifier)
  const providerMap = new Map<string, {
    costs: number;
    requests: number;
    breakdown: ModelCost[];
    collectedAt: string;
  }>();

  for (const usage of usages) {
    // Extract provider from identifier (format: "2026-01 - OpenAI - ProjectName")
    const parts = usage.identifier.split(' - ');
    const provider = parts[1]?.toLowerCase() || 'unknown';

    const existing = providerMap.get(provider);
    
    let breakdown: ModelCost[] = [];
    try {
      const parsed = JSON.parse(usage.breakdownJson.replace(' [truncated]', ''));
      breakdown = Array.isArray(parsed) ? parsed : [];
    } catch {
      breakdown = [];
    }

    if (existing) {
      existing.costs += usage.costUsd;
      existing.requests += usage.requests;
      existing.breakdown = [...existing.breakdown, ...breakdown];
      if (usage.collectedAt > existing.collectedAt) {
        existing.collectedAt = usage.collectedAt;
      }
    } else {
      providerMap.set(provider, {
        costs: usage.costUsd,
        requests: usage.requests,
        breakdown,
        collectedAt: usage.collectedAt,
      });
    }
  }

  // Convert to ProviderSnapshot array
  const snapshots: ProviderSnapshot[] = [];
  for (const [provider, data] of providerMap.entries()) {
    snapshots.push({
      month,
      provider,
      totalCostUsd: data.costs,
      requests: data.requests,
      breakdown: data.breakdown,
      collectedAt: data.collectedAt,
    });
  }

  return snapshots;
}

/**
 * Get monthly summary (aggregated from usages)
 */
export async function getMonthlySummary(month: string): Promise<{ id: string; data: MonthlySummary } | null> {
  const usages = await getMonthUsages(month);
  
  if (usages.length === 0) {
    return null;
  }

  const totalCost = usages.reduce((sum, u) => sum + u.costUsd, 0);
  const providers = new Set(usages.map(u => {
    const parts = u.identifier.split(' - ');
    return parts[1] || 'unknown';
  }));
  
  const latestCollected = usages.reduce((latest, u) => 
    u.collectedAt > latest ? u.collectedAt : latest, 
    usages[0].collectedAt
  );

  // Get previous month data for comparison
  const previousMonth = getPreviousMonth(month);
  const previousUsages = await getMonthUsages(previousMonth);
  const previousCost = previousUsages.reduce((sum, u) => sum + u.costUsd, 0);
  const changePercent = calculateChangePercent(totalCost, previousCost);

  // Generate report URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reportToken = process.env.REPORT_SECRET_TOKEN || '';
  const reportUrl = `${appUrl}/report?token=${reportToken}&month=${month}`;

  return {
    id: month, // Use month as pseudo-ID
    data: {
      month,
      totalCostUsd: totalCost,
      previousMonthCost: previousCost,
      changePercent,
      providerCount: providers.size,
      reportUrl,
      collectedAt: latestCollected,
    },
  };
}

/**
 * Get all monthly summaries
 */
export async function getAllMonthlySummaries(): Promise<MonthlySummary[]> {
  if (!isNotionConfigured()) {
    return [];
  }

  // Get all usages and group by month
  const response = await notion.databases.query({
    database_id: USAGES_DB_ID,
    sorts: [{ property: 'Mois', direction: 'descending' }],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usages = response.results.map((page: any) => parseUsagePage(page));

  // Group by month
  const monthMap = new Map<string, UsageData[]>();
  for (const usage of usages) {
    const existing = monthMap.get(usage.month) || [];
    existing.push(usage);
    monthMap.set(usage.month, existing);
  }

  // Convert to summaries
  const summaries: MonthlySummary[] = [];
  const months = Array.from(monthMap.keys()).sort().reverse();

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    const monthUsages = monthMap.get(month) || [];
    const totalCost = monthUsages.reduce((sum, u) => sum + u.costUsd, 0);
    
    const providers = new Set(monthUsages.map(u => {
      const parts = u.identifier.split(' - ');
      return parts[1] || 'unknown';
    }));

    const latestCollected = monthUsages.reduce((latest, u) => 
      u.collectedAt > latest ? u.collectedAt : latest, 
      monthUsages[0]?.collectedAt || ''
    );

    // Previous month cost
    const prevMonth = months[i + 1];
    const prevUsages = prevMonth ? (monthMap.get(prevMonth) || []) : [];
    const prevCost = prevUsages.reduce((sum, u) => sum + u.costUsd, 0);
    const changePercent = calculateChangePercent(totalCost, prevCost);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reportToken = process.env.REPORT_SECRET_TOKEN || '';

    summaries.push({
      month,
      totalCostUsd: totalCost,
      previousMonthCost: prevCost,
      changePercent,
      providerCount: providers.size,
      reportUrl: `${appUrl}/report?token=${reportToken}&month=${month}`,
      collectedAt: latestCollected,
    });
  }

  return summaries;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the previous month string (e.g., "2026-01" -> "2025-12")
 */
export function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get the current month string (e.g., "2026-01")
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate percentage change between two values
 */
export function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Generate identifier for usage entry
 */
export function generateUsageIdentifier(month: string, providerName: string, projectName: string): string {
  return `${month} - ${providerName} - ${projectName}`;
}

// ============================================================================
// LEGACY COMPATIBILITY (for existing code)
// ============================================================================

// These functions maintain backward compatibility with the old structure
// They are wrappers around the new functions

export async function saveProviderSnapshot(snapshot: ProviderSnapshot): Promise<string> {
  // Get or create the service
  const service = await getOrCreateService(snapshot.provider, snapshot.provider);

  // Calculate tokens from breakdown
  let tokensInput = 0;
  const tokensOutput = 0;
  for (const item of snapshot.breakdown) {
    // Estimate tokens from cost (rough approximation)
    tokensInput += Math.round(item.cost_usd * 100000); // Placeholder
  }

  // Create usage entry
  const identifier = generateUsageIdentifier(snapshot.month, service.name, 'All Projects');
  
  return createUsageEntry({
    identifier,
    servicePageId: service.id,
    month: snapshot.month,
    projectApiKey: 'All Projects',
    workspace: undefined,
    models: snapshot.breakdown.map(b => b.model).join(', '),
    tokensInput,
    tokensOutput,
    costUsd: snapshot.totalCostUsd,
    requests: snapshot.requests,
    breakdownJson: JSON.stringify(snapshot.breakdown),
    collectedAt: snapshot.collectedAt,
    collectionStatus: 'Succes',
    logStatus: 'Legacy save via saveProviderSnapshot()',
  });
}

export async function getProviderSnapshot(
  month: string,
  provider: string
): Promise<{ id: string; data: ProviderSnapshot } | null> {
  const snapshots = await getMonthSnapshots(month);
  const snapshot = snapshots.find(s => s.provider.toLowerCase() === provider.toLowerCase());
  
  if (!snapshot) {
    return null;
  }

  return {
    id: `${month}-${provider}`,
    data: snapshot,
  };
}

export async function saveMonthlySummary(_summary: MonthlySummary): Promise<string> {
  // In the new structure, summaries are computed from usages
  // This function is now a no-op but kept for compatibility
  console.log('[Notion] saveMonthlySummary is deprecated - summaries are now computed from usages');
  return 'computed';
}
