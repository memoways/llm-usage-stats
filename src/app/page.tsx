'use client';

/**
 * Main Page - LLM Cost Tracker
 *
 * Orchestrates all components and manages state for the cost tracking application.
 */

import { useState, useEffect } from 'react';
import ProviderSelector from '@/components/ProviderSelector';
import WorkspaceSelector from '@/components/WorkspaceSelector';
import ProjectSelector from '@/components/ProjectSelector';
import DateRangePicker from '@/components/DateRangePicker';
import CostDisplay from '@/components/CostDisplay';
import ModelBreakdown from '@/components/ModelBreakdown';
import { CostData } from '@/lib/types';

export default function Home() {
  // State management
  const [providerId, setProviderId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [supportsWorkspaces, setSupportsWorkspaces] = useState(false);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workspace total state (separate from project-level)
  const [workspaceTotalStartDate, setWorkspaceTotalStartDate] = useState('');
  const [workspaceTotalEndDate, setWorkspaceTotalEndDate] = useState('');
  const [workspaceTotalCostData, setWorkspaceTotalCostData] = useState<CostData | null>(null);
  const [workspaceTotalLoading, setWorkspaceTotalLoading] = useState(false);
  const [workspaceTotalError, setWorkspaceTotalError] = useState<string | null>(null);
  const [workspaceTotalPreset, setWorkspaceTotalPreset] = useState<string | null>('month');

  // Initialize default date range (last month)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastMonth.toISOString().split('T')[0]);
    
    // Also initialize workspace total dates
    setWorkspaceTotalEndDate(today.toISOString().split('T')[0]);
    setWorkspaceTotalStartDate(lastMonth.toISOString().split('T')[0]);
  }, []);

  // Fetch workspace total costs (all projects combined)
  const fetchWorkspaceTotal = async () => {
    if (!providerId || !workspaceId || !workspaceTotalStartDate || !workspaceTotalEndDate) {
      return;
    }

    try {
      setWorkspaceTotalLoading(true);
      setWorkspaceTotalError(null);

      const params = new URLSearchParams({
        provider: providerId,
        workspace: workspaceId,
        start_date: workspaceTotalStartDate,
        end_date: workspaceTotalEndDate,
        // Note: no project_id - this fetches all projects
      });

      const response = await fetch(`/api/costs?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch workspace total');
      }

      const data = await response.json();
      setWorkspaceTotalCostData(data);
    } catch (err) {
      setWorkspaceTotalError(err instanceof Error ? err.message : 'Failed to load workspace total');
      console.error('Error fetching workspace total:', err);
    } finally {
      setWorkspaceTotalLoading(false);
    }
  };

  // Handle workspace total preset selection
  const handleWorkspaceTotalPreset = (preset: 'week' | 'month' | 'year') => {
    const today = new Date();
    const start = new Date(today);

    switch (preset) {
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        break;
    }

    setWorkspaceTotalStartDate(start.toISOString().split('T')[0]);
    setWorkspaceTotalEndDate(today.toISOString().split('T')[0]);
    setWorkspaceTotalPreset(preset);
  };

  // Fetch provider info to determine workspace support
  useEffect(() => {
    if (!providerId) return;

    async function checkWorkspaceSupport() {
      try {
        const response = await fetch('/api/providers');
        const data = await response.json();
        const provider = data.providers?.find((p: { id: string }) => p.id === providerId);

        if (provider) {
          setSupportsWorkspaces(provider.supportsWorkspaces);

          // Reset workspace if provider doesn't support it
          if (!provider.supportsWorkspaces) {
            setWorkspaceId('');
          }
        }
      } catch (err) {
        console.error('Error checking workspace support:', err);
      }
    }

    checkWorkspaceSupport();
  }, [providerId]);

  // Fetch cost data
  const fetchCosts = async () => {
    if (!providerId || !projectId || !startDate || !endDate) {
      return;
    }

    // Check if workspace is required
    if (supportsWorkspaces && !workspaceId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        provider: providerId,
        project_id: projectId,
        start_date: startDate,
        end_date: endDate,
      });

      if (workspaceId) {
        params.append('workspace', workspaceId);
      }

      const response = await fetch(`/api/costs?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch costs');
      }

      const data = await response.json();
      setCostData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost data');
      console.error('Error fetching costs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when all required fields are filled
  useEffect(() => {
    if (providerId && projectId && startDate && endDate) {
      if (supportsWorkspaces && !workspaceId) {
        return; // Wait for workspace selection
      }
      fetchCosts();
    }
  }, [providerId, workspaceId, projectId, startDate, endDate]);

  // Auto-fetch workspace total when workspace and dates are set
  useEffect(() => {
    if (providerId && workspaceId && workspaceTotalStartDate && workspaceTotalEndDate) {
      fetchWorkspaceTotal();
    }
  }, [providerId, workspaceId, workspaceTotalStartDate, workspaceTotalEndDate]);

  // Determine if we can show results
  const canShowResults = providerId && projectId && startDate && endDate &&
                         (!supportsWorkspaces || workspaceId);
  
  // Determine if we can show workspace total
  const canShowWorkspaceTotal = providerId && workspaceId && workspaceTotalStartDate && workspaceTotalEndDate;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            LLM Cost Tracker
          </h1>
          <p className="text-lg text-gray-600">
            Track and analyze costs across multiple LLM providers
          </p>
        </div>

        {/* Selection Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Provider Selector */}
            <ProviderSelector
              value={providerId}
              onChange={(id) => {
                setProviderId(id);
                setProjectId(''); // Reset project when provider changes
                setCostData(null); // Clear results
              }}
            />

            {/* Workspace Selector (Conditional) */}
            <WorkspaceSelector
              providerId={providerId}
              value={workspaceId}
              onChange={(id) => {
                setWorkspaceId(id);
                setProjectId(''); // Reset project when workspace changes
                setCostData(null); // Clear results
              }}
              visible={supportsWorkspaces}
            />

            {/* Project Selector */}
            <ProjectSelector
              providerId={providerId}
              workspaceId={workspaceId}
              value={projectId}
              onChange={(id) => {
                setProjectId(id);
                setCostData(null); // Clear results
              }}
              supportsWorkspaces={supportsWorkspaces}
            />
          </div>

          {/* Date Range Picker */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </div>

          {/* Refresh Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={fetchCosts}
              disabled={!canShowResults || loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Project-Specific Results Section */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading cost data...</p>
          </div>
        )}

        {!loading && costData && (
          <div className="space-y-6">
            {/* Total Cost Display */}
            <CostDisplay
              totalCost={costData.total_cost_usd}
              lastUpdated={costData.last_updated}
              provider={providerId}
            />

            {/* Model Breakdown Table */}
            <ModelBreakdown breakdown={costData.breakdown} />
          </div>
        )}

        {!loading && !costData && canShowResults && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">
              Click &quot;Refresh Data&quot; to load cost information
            </p>
          </div>
        )}

        {/* Workspace Total Section - At Bottom */}
        {supportsWorkspaces && workspaceId && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 mt-8 text-white">
            <h2 className="text-2xl font-bold mb-4">
              📊 Workspace Total {providerId === 'anthropic' ? '(All API Keys)' : '(All Projects)'}
            </h2>
            {/* Provider-specific explanation */}
            <p className="text-sm text-white/70 mb-4">
              {providerId === 'anthropic' 
                ? 'Anthropic: Costs aggregated for the entire workspace (API keys are listed as "Projects" in this app)'
                : 'OpenAI: Costs aggregated across all projects in this workspace'
              }
            </p>
            
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => handleWorkspaceTotalPreset('week')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  workspaceTotalPreset === 'week'
                    ? 'bg-white text-indigo-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Last Week
              </button>
              <button
                onClick={() => handleWorkspaceTotalPreset('month')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  workspaceTotalPreset === 'month'
                    ? 'bg-white text-indigo-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Last Month
              </button>
              <button
                onClick={() => handleWorkspaceTotalPreset('year')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  workspaceTotalPreset === 'year'
                    ? 'bg-white text-indigo-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                Last Year
              </button>
            </div>

            {/* Custom Date Range */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-white/80">Start Date</label>
                <input
                  type="date"
                  value={workspaceTotalStartDate}
                  onChange={(e) => {
                    setWorkspaceTotalStartDate(e.target.value);
                    setWorkspaceTotalPreset(null);
                  }}
                  className="px-3 py-2 rounded-md text-gray-900 bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-white/80">End Date</label>
                <input
                  type="date"
                  value={workspaceTotalEndDate}
                  onChange={(e) => {
                    setWorkspaceTotalEndDate(e.target.value);
                    setWorkspaceTotalPreset(null);
                  }}
                  className="px-3 py-2 rounded-md text-gray-900 bg-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchWorkspaceTotal}
                  disabled={workspaceTotalLoading}
                  className="px-4 py-2 bg-white text-indigo-600 font-medium rounded-md hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {workspaceTotalLoading ? 'Loading...' : 'Calculate'}
                </button>
              </div>
            </div>

            {/* Workspace Total Error */}
            {workspaceTotalError && (
              <div className="bg-red-500/20 border border-red-300/50 rounded-lg p-3 mb-4">
                <p className="text-white">
                  <strong>Error:</strong> {workspaceTotalError}
                </p>
              </div>
            )}

            {/* Workspace Total Loading */}
            {workspaceTotalLoading && (
              <div className="text-center py-6">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
                <p className="mt-2 text-white/80">Calculating workspace total...</p>
              </div>
            )}

            {/* Workspace Total Result */}
            {!workspaceTotalLoading && workspaceTotalCostData && (
              <div className="space-y-4">
                {/* Check if usage is not available (indicated by -1) */}
                {workspaceTotalCostData.total_cost_usd < 0 ? (
                  <div className="bg-amber-500/20 border border-amber-300/50 rounded-lg p-4">
                    <div className="text-xl font-semibold">
                      ⚠️ Usage Data Not Available via API
                    </div>
                    <div className="text-sm text-white/90 mt-2">
                      {providerId === 'anthropic' && (
                        <>
                          Anthropic does not expose usage/billing data via their API.
                          <br />
                          Check your usage manually at:{' '}
                          <a 
                            href="https://console.anthropic.com/settings/billing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline font-medium hover:text-white"
                          >
                            console.anthropic.com/settings/billing
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="text-4xl font-bold">
                        ${workspaceTotalCostData.total_cost_usd.toFixed(2)}
                      </div>
                      <div className="text-sm text-white/70 mt-1">
                        {providerId === 'anthropic' 
                          ? 'Total spend for this workspace (all API keys)'
                          : 'Total spend across all projects'
                        }
                      </div>
                    </div>
                    
                    {/* Model Breakdown for Workspace */}
                    {workspaceTotalCostData.breakdown && workspaceTotalCostData.breakdown.length > 0 && (
                      <div className="bg-white/10 rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Model Breakdown</h3>
                        <div className="space-y-2">
                          {workspaceTotalCostData.breakdown.map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-white/90">{item.model}</span>
                              <div className="text-right">
                                <span className="font-medium">${item.cost_usd.toFixed(2)}</span>
                                <span className="text-white/60 ml-2">({item.requests.toLocaleString()} requests)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
