/**
 * Monthly Data Collection API
 *
 * This endpoint collects usage data from all configured providers,
 * saves detailed entries to Notion (Services + Usages databases),
 * and optionally triggers email notification.
 *
 * Security: Requires COLLECT_SECRET_TOKEN for authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAvailableProviders, getProvider } from '@/lib/providers/factory';
import {
  getOrCreateService,
  createUsageEntry,
  generateUsageIdentifier,
  getMonthlySummary,
  getCurrentMonth,
  getPreviousMonth,
  calculateChangePercent,
  isNotionConfigured,
  CollectionStatus,
} from '@/lib/notion';
import { CostData } from '@/lib/types';

interface CollectionResult {
  provider: string;
  success: boolean;
  totalCost?: number;
  requests?: number;
  entriesCreated?: number;
  error?: string;
}

interface UsageCollectionData {
  providerName: string;
  projectName: string;
  workspace?: string;
  costData: CostData;
  logMessages: string[];
  status: CollectionStatus;
}

/**
 * POST /api/collect
 *
 * Collects monthly usage data from all providers and saves to Notion.
 *
 * Query params:
 * - token: Secret token for authorization
 * - month: Optional month to collect (format: "2026-01"). Defaults to current month.
 * - send_email: Optional "true" to trigger email notification
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authorization token
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.COLLECT_SECRET_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Server configuration error: COLLECT_SECRET_TOKEN not set' },
        { status: 500 }
      );
    }

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // Check Notion configuration
    if (!isNotionConfigured()) {
      return NextResponse.json(
        { error: 'Notion is not configured. Please set up Notion integration first.' },
        { status: 500 }
      );
    }

    // Determine which month to collect
    const targetMonth = searchParams.get('month') || getCurrentMonth();
    const previousMonth = getPreviousMonth(targetMonth);
    const sendEmail = searchParams.get('send_email') === 'true';

    console.log(`[Collect] Starting collection for month: ${targetMonth}`);

    // Calculate date range for the month
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[Collect] Date range: ${startDateStr} to ${endDateStr}`);

    // Get all available providers
    const providers = getAvailableProviders();
    console.log(`[Collect] Found ${providers.length} providers: ${providers.map(p => p.id).join(', ')}`);

    // Collect data from each provider
    const results: CollectionResult[] = [];
    const allUsageData: UsageCollectionData[] = [];

    for (const providerInfo of providers) {
      console.log(`[Collect] Processing provider: ${providerInfo.id}`);
      const providerLogs: string[] = [];
      let entriesCreated = 0;

      try {
        const provider = getProvider(providerInfo.id);
        let totalCost = 0;
        let totalRequests = 0;

        // Get or create the service in Notion
        const service = await getOrCreateService(providerInfo.id, providerInfo.name);
        providerLogs.push(`Service Notion: ${service.id}`);

        if (provider.supportsWorkspaces) {
          // For providers with workspaces, collect per workspace
          const workspaces = await provider.getWorkspaces();
          providerLogs.push(`${workspaces.length} workspace(s) trouvé(s)`);

          for (const workspace of workspaces) {
            try {
              providerLogs.push(`Workspace: ${workspace.name} (${workspace.id})`);
              
              // Get costs for entire workspace (all projects)
              const costs = await provider.getCosts({
                workspace: workspace.id,
                projectId: '', // Empty = all projects
                startDate: startDateStr,
                endDate: endDateStr,
              });

              // Skip if no data available (indicated by -1)
              if (costs.total_cost_usd >= 0) {
                totalCost += costs.total_cost_usd;
                totalRequests += costs.breakdown.reduce((sum, m) => sum + m.requests, 0);

                // Calculate tokens from breakdown (if available)
                const tokensInput = 0;
                const tokensOutput = 0;
                const models: string[] = [];
                
                for (const item of costs.breakdown) {
                  models.push(item.model);
                  // Note: Token counts would need to be extracted from provider-specific data
                }

                // Create usage entry for this workspace
                const identifier = generateUsageIdentifier(targetMonth, providerInfo.name, workspace.name);
                
                await createUsageEntry({
                  identifier,
                  servicePageId: service.id,
                  month: targetMonth,
                  projectApiKey: workspace.name,
                  workspace: workspace.id,
                  models: models.slice(0, 10).join(', '), // Limit to 10 models
                  tokensInput,
                  tokensOutput,
                  costUsd: costs.total_cost_usd,
                  requests: costs.breakdown.reduce((sum, m) => sum + m.requests, 0),
                  breakdownJson: JSON.stringify(costs.breakdown),
                  collectedAt: new Date().toISOString(),
                  collectionStatus: 'Succes',
                  logStatus: providerLogs.join('\n'),
                });

                entriesCreated++;
                providerLogs.push(`✓ $${costs.total_cost_usd.toFixed(2)} sauvegardé`);

                allUsageData.push({
                  providerName: providerInfo.name,
                  projectName: workspace.name,
                  workspace: workspace.id,
                  costData: costs,
                  logMessages: [...providerLogs],
                  status: 'Succes',
                });
              } else {
                providerLogs.push('⚠ Données non disponibles via API');
                
                // Create entry marking data as unavailable
                const identifier = generateUsageIdentifier(targetMonth, providerInfo.name, workspace.name);
                
                await createUsageEntry({
                  identifier,
                  servicePageId: service.id,
                  month: targetMonth,
                  projectApiKey: workspace.name,
                  workspace: workspace.id,
                  models: '',
                  tokensInput: 0,
                  tokensOutput: 0,
                  costUsd: 0,
                  requests: 0,
                  breakdownJson: '[]',
                  collectedAt: new Date().toISOString(),
                  collectionStatus: 'Donnees indisponibles',
                  logStatus: providerLogs.join('\n') + '\nAPI ne fournit pas les données de coût',
                });

                entriesCreated++;
              }
            } catch (wsError) {
              const errorMsg = wsError instanceof Error ? wsError.message : 'Unknown error';
              providerLogs.push(`✗ Erreur workspace ${workspace.id}: ${errorMsg}`);
              console.error(`[Collect] Error fetching workspace ${workspace.id}:`, wsError);
            }
          }
        } else {
          // For providers without workspaces, get costs directly
          try {
            const projects = await provider.getProjects();
            providerLogs.push(`${projects.length} projet(s) trouvé(s)`);

            if (projects.length === 0) {
              // No projects, create a single entry for the provider
              providerLogs.push('Aucun projet - collecte au niveau provider');
              
              try {
                const costs = await provider.getCosts({
                  projectId: '',
                  startDate: startDateStr,
                  endDate: endDateStr,
                });

                if (costs.total_cost_usd >= 0) {
                  totalCost += costs.total_cost_usd;
                  totalRequests += costs.breakdown.reduce((sum, m) => sum + m.requests, 0);

                  const identifier = generateUsageIdentifier(targetMonth, providerInfo.name, 'Default');
                  
                  await createUsageEntry({
                    identifier,
                    servicePageId: service.id,
                    month: targetMonth,
                    projectApiKey: 'Default',
                    models: costs.breakdown.map(b => b.model).slice(0, 10).join(', '),
                    tokensInput: 0,
                    tokensOutput: 0,
                    costUsd: costs.total_cost_usd,
                    requests: costs.breakdown.reduce((sum, m) => sum + m.requests, 0),
                    breakdownJson: JSON.stringify(costs.breakdown),
                    collectedAt: new Date().toISOString(),
                    collectionStatus: 'Succes',
                    logStatus: providerLogs.join('\n'),
                  });

                  entriesCreated++;
                }
              } catch (defaultError) {
                const errorMsg = defaultError instanceof Error ? defaultError.message : 'Unknown error';
                providerLogs.push(`✗ Erreur: ${errorMsg}`);
              }
            } else {
              for (const project of projects) {
                try {
                  providerLogs.push(`Projet: ${project.name}`);
                  
                  const costs = await provider.getCosts({
                    projectId: project.id,
                    startDate: startDateStr,
                    endDate: endDateStr,
                  });

                  if (costs.total_cost_usd >= 0) {
                    totalCost += costs.total_cost_usd;
                    totalRequests += costs.breakdown.reduce((sum, m) => sum + m.requests, 0);

                    const identifier = generateUsageIdentifier(targetMonth, providerInfo.name, project.name);
                    
                    await createUsageEntry({
                      identifier,
                      servicePageId: service.id,
                      month: targetMonth,
                      projectApiKey: project.name,
                      models: costs.breakdown.map(b => b.model).slice(0, 10).join(', '),
                      tokensInput: 0,
                      tokensOutput: 0,
                      costUsd: costs.total_cost_usd,
                      requests: costs.breakdown.reduce((sum, m) => sum + m.requests, 0),
                      breakdownJson: JSON.stringify(costs.breakdown),
                      collectedAt: new Date().toISOString(),
                      collectionStatus: 'Succes',
                      logStatus: providerLogs.join('\n'),
                    });

                    entriesCreated++;
                    providerLogs.push(`✓ $${costs.total_cost_usd.toFixed(2)} sauvegardé`);

                    allUsageData.push({
                      providerName: providerInfo.name,
                      projectName: project.name,
                      costData: costs,
                      logMessages: [...providerLogs],
                      status: 'Succes',
                    });
                  }
                } catch (projError) {
                  const errorMsg = projError instanceof Error ? projError.message : 'Unknown error';
                  providerLogs.push(`✗ Erreur projet ${project.id}: ${errorMsg}`);
                  console.error(`[Collect] Error fetching project ${project.id}:`, projError);
                }
              }
            }
          } catch (projListError) {
            const errorMsg = projListError instanceof Error ? projListError.message : 'Unknown error';
            providerLogs.push(`✗ Erreur listing projets: ${errorMsg}`);
            console.error(`[Collect] Error listing projects for ${providerInfo.id}:`, projListError);
          }
        }

        results.push({
          provider: providerInfo.id,
          success: true,
          totalCost,
          requests: totalRequests,
          entriesCreated,
        });

        console.log(`[Collect] ${providerInfo.id}: $${totalCost.toFixed(2)}, ${totalRequests} requests, ${entriesCreated} entries`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        providerLogs.push(`✗ Erreur fatale: ${errorMessage}`);
        console.error(`[Collect] Error with provider ${providerInfo.id}:`, error);

        // Try to create an error entry
        try {
          const service = await getOrCreateService(providerInfo.id, providerInfo.name);
          const identifier = generateUsageIdentifier(targetMonth, providerInfo.name, 'Error');
          
          await createUsageEntry({
            identifier,
            servicePageId: service.id,
            month: targetMonth,
            projectApiKey: 'Error',
            models: '',
            tokensInput: 0,
            tokensOutput: 0,
            costUsd: 0,
            requests: 0,
            breakdownJson: '[]',
            collectedAt: new Date().toISOString(),
            collectionStatus: 'Echec',
            logStatus: providerLogs.join('\n') + `\n\nErreur: ${errorMessage}`,
          });
        } catch {
          // Ignore error creating error entry
        }

        results.push({
          provider: providerInfo.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Calculate totals from results
    const totalCost = results.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const providerCount = results.filter(r => r.success && (r.totalCost || 0) > 0).length;
    const totalEntries = results.reduce((sum, r) => sum + (r.entriesCreated || 0), 0);

    // Get previous month's data for comparison
    let previousMonthCost = 0;
    const previousSummary = await getMonthlySummary(previousMonth);
    if (previousSummary) {
      previousMonthCost = previousSummary.data.totalCostUsd;
    }

    const changePercent = calculateChangePercent(totalCost, previousMonthCost);

    // Generate report URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reportToken = process.env.REPORT_SECRET_TOKEN || '';
    const reportUrl = `${appUrl}/report?token=${reportToken}&month=${targetMonth}`;

    console.log(`[Collect] Summary: $${totalCost.toFixed(2)} total, ${changePercent.toFixed(1)}% change, ${totalEntries} entries created`);

    // Optionally send email
    let emailSent = false;
    if (sendEmail && process.env.RESEND_API_KEY) {
      try {
        const emailResponse = await fetch(`${appUrl}/api/send-report?token=${expectedToken}&month=${targetMonth}`, {
          method: 'POST',
        });
        emailSent = emailResponse.ok;
        console.log(`[Collect] Email ${emailSent ? 'sent' : 'failed'}`);
      } catch (emailError) {
        console.error('[Collect] Error sending email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      month: targetMonth,
      summary: {
        totalCostUsd: totalCost,
        previousMonthCost,
        changePercent,
        providerCount,
        entriesCreated: totalEntries,
        reportUrl,
      },
      results,
      emailSent,
    });
  } catch (error) {
    console.error('[Collect] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Collection failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/collect
 *
 * Returns the status and configuration info (no data collection).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const expectedToken = process.env.COLLECT_SECRET_TOKEN;

  if (token !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const providers = getAvailableProviders();

  return NextResponse.json({
    configured: {
      notion: isNotionConfigured(),
      email: !!process.env.RESEND_API_KEY,
      providers: providers.map(p => p.id),
    },
    currentMonth: getCurrentMonth(),
  });
}
