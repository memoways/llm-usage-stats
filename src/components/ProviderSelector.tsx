'use client';

/**
 * ProviderSelector Component
 *
 * Dropdown selector for choosing an LLM provider (OpenAI, Anthropic, Mistral, etc.)
 */

import { useEffect, useState } from 'react';
import { ProviderInfo } from '@/lib/types';

interface ProviderSelectorProps {
  value: string;
  onChange: (providerId: string) => void;
}

export default function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProviders() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/providers');
        if (!response.ok) {
          throw new Error('Failed to fetch providers');
        }

        const data = await response.json();
        setProviders(data.providers || []);

        // Auto-select first provider if none selected
        if (!value && data.providers && data.providers.length > 0) {
          onChange(data.providers[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load providers');
        console.error('Error fetching providers:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProviders();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">LLM Provider</label>
        <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">LLM Provider</label>
        <div className="text-sm text-red-600 p-3 bg-red-50 rounded-md">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="provider-select" className="text-sm font-medium text-gray-700">
        LLM Provider
      </label>
      <select
        id="provider-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select a provider...</option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
    </div>
  );
}
