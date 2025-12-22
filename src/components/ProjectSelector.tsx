'use client';

/**
 * ProjectSelector Component
 *
 * Dropdown selector for choosing a project.
 * Dynamically loads projects based on selected provider and workspace.
 */

import { useEffect, useState } from 'react';
import { Project } from '@/lib/types';

interface ProjectSelectorProps {
  providerId: string;
  workspaceId?: string;
  value: string;
  onChange: (projectId: string) => void;
}

export default function ProjectSelector({
  providerId,
  workspaceId,
  value,
  onChange,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId) {
      return;
    }

    async function fetchProjects() {
      try {
        setLoading(true);
        setError(null);

        // Build URL with provider and optional workspace
        const params = new URLSearchParams({ provider: providerId });
        if (workspaceId) {
          params.append('workspace', workspaceId);
        }

        const response = await fetch(`/api/projects?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        setProjects(data.projects || []);

        // Clear selection when projects change
        onChange('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
        console.error('Error fetching projects:', err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [providerId, workspaceId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Project</label>
        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Project</label>
        <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="project-select" className="text-sm font-medium text-gray-700">
        Project
      </label>
      <select
        id="project-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={projects.length === 0}
        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">
          {projects.length === 0 ? 'No projects available' : 'Select a project...'}
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}
