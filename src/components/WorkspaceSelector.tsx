'use client';

/**
 * WorkspaceSelector Component
 *
 * Conditional dropdown selector for choosing a workspace.
 * Only visible for providers that support workspaces (e.g., OpenAI).
 */

import { useEffect, useState } from 'react';
import { Workspace } from '@/lib/types';

interface WorkspaceSelectorProps {
  providerId: string;
  value: string;
  onChange: (workspaceId: string) => void;
  visible: boolean;
}

export default function WorkspaceSelector({
  providerId,
  value,
  onChange,
  visible,
}: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !providerId) {
      return;
    }

    async function fetchWorkspaces() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/workspaces?provider=${providerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch workspaces');
        }

        const data = await response.json();
        setWorkspaces(data.workspaces || []);

        // Auto-select first workspace if none selected
        if (!value && data.workspaces && data.workspaces.length > 0) {
          onChange(data.workspaces[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspaces');
        console.error('Error fetching workspaces:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspaces();
  }, [providerId, visible]);

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Workspace</label>
        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Workspace</label>
        <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="workspace-select" className="text-sm font-medium text-gray-700">
        Workspace
      </label>
      <select
        id="workspace-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
      >
        <option value="">Select a workspace...</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </div>
  );
}
