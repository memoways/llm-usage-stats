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

  // Initialize default date range (last month)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastMonth.toISOString().split('T')[0]);
  }, []);

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

  // Determine if we can show results
  const canShowResults = providerId && projectId && startDate && endDate &&
                         (!supportsWorkspaces || workspaceId);

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

        {/* Results Section */}
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
      </div>
    </div>
  );
}
