# LLM Cost Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-provider LLM cost tracking application starting with OpenAI support (3 workspaces), with extensible architecture for future providers (Anthropic, Mistral, etc.).

**Architecture:** 4-layer architecture with Provider pattern - Presentation (React/Next.js), API routes (server-side), Provider abstraction layer (ILLMProvider interface), and LLM service integrations. Navigation is conditional (workspace selector only for OpenAI). Data is normalized (USD, ISO dates) but model names stay native.

**Tech Stack:** Next.js 14+ App Router, TypeScript (strict), Tailwind CSS, React, Vercel deployment

---

## Task 1: Initialize Next.js Project with TypeScript

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Initialize Next.js with TypeScript**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src --import-alias "@/*"
```

Answer prompts:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: Yes (@/*)

Expected: Next.js project initialized with TypeScript and Tailwind

**Step 2: Verify project structure**

Run:
```bash
ls -la
```

Expected output should include:
- `package.json`
- `tsconfig.json`
- `next.config.js`
- `tailwind.config.ts`
- `src/app/` directory

**Step 3: Update .gitignore**

Add to `.gitignore`:
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

**Step 4: Create .env.example**

Create file with content:
```env
# OpenAI API Keys (3 workspaces)
OPENAI_API_KEY_EDUGAMI=sk-proj-your-key-here
OPENAI_API_KEY_MEMOWAYS=sk-proj-your-key-here
OPENAI_API_KEY_STORYGAMI=sk-proj-your-key-here

# Future providers (optional)
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# MISTRAL_API_KEY=your-key-here
```

**Step 5: Install project dependencies**

Run:
```bash
npm install
```

Expected: All dependencies installed successfully

**Step 6: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Create TypeScript Types and Interfaces

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/providers/interface.ts`

**Step 1: Create common types file**

Create `src/lib/types.ts`:
```typescript
// Common types used across the application

export interface Workspace {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ModelCost {
  model: string;        // Native model name from provider
  cost_usd: number;
  requests: number;
}

export interface CostData {
  total_cost_usd: number;
  last_updated: string;  // ISO 8601
  breakdown: ModelCost[];
}

export interface CostParams {
  workspace?: string;
  projectId: string;
  startDate: string;     // ISO 8601
  endDate: string;       // ISO 8601
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export type DateRangePreset = 'week' | 'month' | 'year' | 'custom';
```

**Step 2: Create provider interface**

Create `src/lib/providers/interface.ts`:
```typescript
import { Workspace, Project, CostData, CostParams } from '../types';

/**
 * Common interface that all LLM providers must implement
 * This enables extensibility for multiple LLM services
 */
export interface ILLMProvider {
  /** Unique identifier for the provider (e.g., 'openai', 'anthropic') */
  readonly id: string;

  /** Display name for the provider (e.g., 'OpenAI', 'Anthropic') */
  readonly name: string;

  /** Whether this provider supports multiple workspaces */
  readonly supportsWorkspaces: boolean;

  /**
   * Get list of workspaces for this provider
   * Returns empty array if workspaces not supported
   */
  getWorkspaces(): Promise<Workspace[]>;

  /**
   * Get list of projects for a given workspace
   * @param workspace - Optional workspace ID (required if supportsWorkspaces is true)
   */
  getProjects(workspace?: string): Promise<Project[]>;

  /**
   * Get cost data for a project within a date range
   * @param params - Cost query parameters
   */
  getCosts(params: CostParams): Promise<CostData>;
}
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/providers/interface.ts
git commit -m "feat: add TypeScript types and provider interface"
```

---

## Task 3: Implement Cache Utility

**Files:**
- Create: `src/utils/cache.ts`

**Step 1: Create cache utility**

Create `src/utils/cache.ts`:
```typescript
/**
 * Simple in-memory cache with TTL support
 * Cache entries expire after a configurable duration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>>;
  private ttl: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 5) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > this.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with current timestamp
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Manually invalidate a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance with 5 minute TTL
export const cache = new SimpleCache(5);

/**
 * Generate cache key for cost queries
 */
export function generateCacheKey(
  provider: string,
  workspace: string | undefined,
  projectId: string,
  startDate: string,
  endDate: string
): string {
  const parts = [provider, workspace || 'default', projectId, startDate, endDate];
  return parts.join('_');
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/utils/cache.ts
git commit -m "feat: add cache utility with TTL support"
```

---

## Task 4: Implement OpenAI Provider

**Files:**
- Create: `src/lib/providers/openai.ts`

**Step 1: Create OpenAI provider implementation**

Create `src/lib/providers/openai.ts`:
```typescript
import { ILLMProvider } from './interface';
import { Workspace, Project, CostData, CostParams } from '../types';

/**
 * OpenAI provider implementation
 * Supports 3 separate workspaces (Edugami, Memoways, Storygami)
 */
export class OpenAIProvider implements ILLMProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly supportsWorkspaces = true;

  private apiKeys: Record<string, string>;

  constructor() {
    // Load API keys from environment variables
    this.apiKeys = {
      edugami: process.env.OPENAI_API_KEY_EDUGAMI || '',
      memoways: process.env.OPENAI_API_KEY_MEMOWAYS || '',
      storygami: process.env.OPENAI_API_KEY_STORYGAMI || ''
    };
  }

  /**
   * Get list of configured workspaces
   */
  async getWorkspaces(): Promise<Workspace[]> {
    return [
      { id: 'edugami', name: 'Edugami' },
      { id: 'memoways', name: 'Memoways' },
      { id: 'storygami', name: 'Storygami' }
    ];
  }

  /**
   * Get list of projects for a workspace
   */
  async getProjects(workspace?: string): Promise<Project[]> {
    if (!workspace) {
      throw new Error('Workspace is required for OpenAI provider');
    }

    const apiKey = this.apiKeys[workspace.toLowerCase()];
    if (!apiKey) {
      throw new Error(`No API key configured for workspace: ${workspace}`);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/organization/projects', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Map OpenAI response to our Project interface
      return data.data?.map((proj: any) => ({
        id: proj.id,
        name: proj.name
      })) || [];
    } catch (error) {
      console.error('Error fetching OpenAI projects:', error);
      throw error;
    }
  }

  /**
   * Get cost data for a project
   */
  async getCosts(params: CostParams): Promise<CostData> {
    const { workspace, projectId, startDate, endDate } = params;

    if (!workspace) {
      throw new Error('Workspace is required for OpenAI provider');
    }

    const apiKey = this.apiKeys[workspace.toLowerCase()];
    if (!apiKey) {
      throw new Error(`No API key configured for workspace: ${workspace}`);
    }

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        project_id: projectId
      });

      const response = await fetch(
        `https://api.openai.com/v1/usage?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Calculate total cost and prepare breakdown
      const breakdown = data.data?.map((item: any) => ({
        model: item.model,
        cost_usd: item.cost,
        requests: item.requests
      })) || [];

      const totalCost = breakdown.reduce((sum: number, item: any) => sum + item.cost_usd, 0);

      return {
        total_cost_usd: totalCost,
        last_updated: new Date().toISOString(),
        breakdown
      };
    } catch (error) {
      console.error('Error fetching OpenAI costs:', error);
      throw error;
    }
  }
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/lib/providers/openai.ts
git commit -m "feat: implement OpenAI provider with 3 workspaces"
```

---

## Task 5: Implement Provider Factory

**Files:**
- Create: `src/lib/providers/factory.ts`
- Create: `src/lib/providers/index.ts`

**Step 1: Create provider factory**

Create `src/lib/providers/factory.ts`:
```typescript
import { ILLMProvider } from './interface';
import { OpenAIProvider } from './openai';

/**
 * Provider factory for creating and managing LLM provider instances
 */
class ProviderFactory {
  private providers: Map<string, ILLMProvider>;

  constructor() {
    this.providers = new Map();
    this.registerProviders();
  }

  /**
   * Register all available providers
   */
  private registerProviders(): void {
    const openai = new OpenAIProvider();
    this.providers.set(openai.id, openai);

    // Future providers will be registered here:
    // const anthropic = new AnthropicProvider();
    // this.providers.set(anthropic.id, anthropic);
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): ILLMProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all available providers
   */
  getAllProviders(): ILLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider metadata (without instantiation overhead)
   */
  getProviderMetadata(): Array<{ id: string; name: string; supportsWorkspaces: boolean }> {
    return this.getAllProviders().map(provider => ({
      id: provider.id,
      name: provider.name,
      supportsWorkspaces: provider.supportsWorkspaces
    }));
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory();
```

**Step 2: Create barrel export**

Create `src/lib/providers/index.ts`:
```typescript
export { ILLMProvider } from './interface';
export { OpenAIProvider } from './openai';
export { providerFactory } from './factory';
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/lib/providers/factory.ts src/lib/providers/index.ts
git commit -m "feat: add provider factory for managing LLM providers"
```

---

## Task 6: Implement API Route - Providers

**Files:**
- Create: `src/app/api/providers/route.ts`

**Step 1: Create providers API endpoint**

Create `src/app/api/providers/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { providerFactory } from '@/lib/providers';

/**
 * GET /api/providers
 * Returns list of available LLM providers
 */
export async function GET() {
  try {
    const providers = providerFactory.getProviderMetadata();

    return NextResponse.json({
      providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the endpoint locally**

Run:
```bash
npm run dev
```

Open browser or use curl:
```bash
curl http://localhost:3000/api/providers
```

Expected response:
```json
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "supportsWorkspaces": true
    }
  ]
}
```

**Step 3: Stop dev server**

Press Ctrl+C in terminal

**Step 4: Commit**

```bash
git add src/app/api/providers/route.ts
git commit -m "feat: add /api/providers endpoint"
```

---

## Task 7: Implement API Route - Workspaces

**Files:**
- Create: `src/app/api/workspaces/route.ts`

**Step 1: Create workspaces API endpoint**

Create `src/app/api/workspaces/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { providerFactory } from '@/lib/providers';

/**
 * GET /api/workspaces?provider=openai
 * Returns list of workspaces for a provider (if supported)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('provider');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    const provider = providerFactory.getProvider(providerId);

    if (!provider) {
      return NextResponse.json(
        { error: `Provider not found: ${providerId}` },
        { status: 404 }
      );
    }

    if (!provider.supportsWorkspaces) {
      // Return empty array for providers without workspace support
      return NextResponse.json({
        workspaces: []
      });
    }

    const workspaces = await provider.getWorkspaces();

    return NextResponse.json({
      workspaces
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the endpoint locally**

Run:
```bash
npm run dev
```

Test with curl:
```bash
curl "http://localhost:3000/api/workspaces?provider=openai"
```

Expected response:
```json
{
  "workspaces": [
    { "id": "edugami", "name": "Edugami" },
    { "id": "memoways", "name": "Memoways" },
    { "id": "storygami", "name": "Storygami" }
  ]
}
```

**Step 3: Stop dev server**

Press Ctrl+C

**Step 4: Commit**

```bash
git add src/app/api/workspaces/route.ts
git commit -m "feat: add /api/workspaces endpoint with conditional support"
```

---

## Task 8: Implement API Route - Projects

**Files:**
- Create: `src/app/api/projects/route.ts`

**Step 1: Create projects API endpoint**

Create `src/app/api/projects/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { providerFactory } from '@/lib/providers';

/**
 * GET /api/projects?provider=openai&workspace=edugami
 * Returns list of projects for a provider/workspace
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('provider');
    const workspace = searchParams.get('workspace');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    const provider = providerFactory.getProvider(providerId);

    if (!provider) {
      return NextResponse.json(
        { error: `Provider not found: ${providerId}` },
        { status: 404 }
      );
    }

    // Validate workspace requirement
    if (provider.supportsWorkspaces && !workspace) {
      return NextResponse.json(
        { error: 'Workspace parameter is required for this provider' },
        { status: 400 }
      );
    }

    const projects = await provider.getProjects(workspace || undefined);

    return NextResponse.json({
      projects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/projects/route.ts
git commit -m "feat: add /api/projects endpoint with workspace support"
```

---

## Task 9: Implement API Route - Costs with Cache

**Files:**
- Create: `src/app/api/costs/route.ts`

**Step 1: Create costs API endpoint with caching**

Create `src/app/api/costs/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { providerFactory } from '@/lib/providers';
import { cache, generateCacheKey } from '@/utils/cache';
import { CostData } from '@/lib/types';

/**
 * GET /api/costs?provider=openai&workspace=edugami&project_id=proj_123&start_date=2025-01-01&end_date=2025-01-31
 * Returns cost data for a project within a date range
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('provider');
    const workspace = searchParams.get('workspace');
    const projectId = searchParams.get('project_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate required parameters
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id parameter is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date parameters are required' },
        { status: 400 }
      );
    }

    const provider = providerFactory.getProvider(providerId);

    if (!provider) {
      return NextResponse.json(
        { error: `Provider not found: ${providerId}` },
        { status: 404 }
      );
    }

    // Validate workspace requirement
    if (provider.supportsWorkspaces && !workspace) {
      return NextResponse.json(
        { error: 'workspace parameter is required for this provider' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = generateCacheKey(
      providerId,
      workspace || undefined,
      projectId,
      startDate,
      endDate
    );

    const cachedData = cache.get<CostData>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Fetch from provider
    const costData = await provider.getCosts({
      workspace: workspace || undefined,
      projectId,
      startDate,
      endDate
    });

    // Store in cache
    cache.set(cacheKey, costData);

    return NextResponse.json(costData);
  } catch (error) {
    console.error('Error fetching costs:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch costs';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/costs?provider=openai&workspace=edugami&project_id=proj_123&start_date=2025-01-01&end_date=2025-01-31
 * Invalidate cache for specific cost query (refresh functionality)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get('provider');
    const workspace = searchParams.get('workspace');
    const projectId = searchParams.get('project_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!providerId || !projectId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters for cache invalidation' },
        { status: 400 }
      );
    }

    const cacheKey = generateCacheKey(
      providerId,
      workspace || undefined,
      projectId,
      startDate,
      endDate
    );

    cache.invalidate(cacheKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/costs/route.ts
git commit -m "feat: add /api/costs endpoint with caching and refresh"
```

---

## Task 10: Create UI Components - ProviderSelector

**Files:**
- Create: `src/components/ProviderSelector.tsx`

**Step 1: Create provider selector component**

Create `src/components/ProviderSelector.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';

interface Provider {
  id: string;
  name: string;
  supportsWorkspaces: boolean;
}

interface ProviderSelectorProps {
  value: string;
  onChange: (providerId: string) => void;
}

export default function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/providers');

      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }

      const data = await response.json();
      setProviders(data.providers);

      // Auto-select first provider if none selected
      if (!value && data.providers.length > 0) {
        onChange(data.providers[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          LLM Service
        </label>
        <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
          Loading providers...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          LLM Service
        </label>
        <div className="w-full px-4 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="provider-select" className="block text-sm font-medium text-gray-700 mb-2">
        LLM Service
      </label>
      <select
        id="provider-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select a provider</option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ProviderSelector.tsx
git commit -m "feat: add ProviderSelector component"
```

---

## Task 11: Create UI Components - WorkspaceSelector (Conditional)

**Files:**
- Create: `src/components/WorkspaceSelector.tsx`

**Step 1: Create workspace selector component**

Create `src/components/WorkspaceSelector.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceSelectorProps {
  providerId: string;
  value: string;
  onChange: (workspaceId: string) => void;
}

export default function WorkspaceSelector({ providerId, value, onChange }: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providerId) {
      fetchWorkspaces();
    }
  }, [providerId]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspaces?provider=${providerId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data.workspaces);

      // Auto-select first workspace if none selected
      if (!value && data.workspaces.length > 0) {
        onChange(data.workspaces[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no workspaces (provider doesn't support them)
  if (!loading && workspaces.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Workspace
        </label>
        <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
          Loading workspaces...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Workspace
        </label>
        <div className="w-full px-4 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="workspace-select" className="block text-sm font-medium text-gray-700 mb-2">
        Workspace
      </label>
      <select
        id="workspace-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select a workspace</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/WorkspaceSelector.tsx
git commit -m "feat: add conditional WorkspaceSelector component"
```

---

## Task 12: Create UI Components - ProjectSelector

**Files:**
- Create: `src/components/ProjectSelector.tsx`

**Step 1: Create project selector component**

Create `src/components/ProjectSelector.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
}

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
  onChange
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (providerId) {
      fetchProjects();
    }
  }, [providerId, workspaceId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/projects?provider=${providerId}`;
      if (workspaceId) {
        url += `&workspace=${workspaceId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects);

      // Clear selection when projects change
      onChange('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project
        </label>
        <div className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
          Loading projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project
        </label>
        <div className="w-full px-4 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-2">
        Project
      </label>
      <select
        id="project-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={projects.length === 0}
      >
        <option value="">
          {projects.length === 0 ? 'No projects available' : 'Select a project'}
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
```

**Step 2: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ProjectSelector.tsx
git commit -m "feat: add ProjectSelector component with dynamic loading"
```

---

## Task 13: Create UI Components - DateRangePicker

**Files:**
- Create: `src/components/DateRangePicker.tsx`
- Create: `src/utils/dateHelpers.ts`

**Step 1: Create date helper utilities**

Create `src/utils/dateHelpers.ts`:
```typescript
import { DateRange, DateRangePreset } from '@/lib/types';

/**
 * Get date range for preset period
 */
export function getDateRangeForPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const startDate = new Date();

  switch (preset) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'custom':
      // Return current month as default for custom
      startDate.setDate(1);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0]
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

**Step 2: Create date range picker component**

Create `src/components/DateRangePicker.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { DateRange, DateRangePreset } from '@/lib/types';
import { getDateRangeForPreset } from '@/utils/dateHelpers';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('month');

  const handlePresetClick = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    const range = getDateRangeForPreset(preset);
    onChange(range);
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onChange({
      ...value,
      [field]: value
    });
  };

  return (
    <div className="w-full space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handlePresetClick('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPreset === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => handlePresetClick('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPreset === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => handlePresetClick('year')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPreset === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => handlePresetClick('custom')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPreset === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {selectedPreset === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={value.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={value.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/DateRangePicker.tsx src/utils/dateHelpers.ts
git commit -m "feat: add DateRangePicker with preset and custom options"
```

---

## Task 14: Create UI Components - CostDisplay and ModelBreakdown

**Files:**
- Create: `src/components/CostDisplay.tsx`
- Create: `src/components/ModelBreakdown.tsx`

**Step 1: Create cost display component**

Create `src/components/CostDisplay.tsx`:
```typescript
'use client';

import { formatDate } from '@/utils/dateHelpers';

interface CostDisplayProps {
  totalCost: number;
  lastUpdated: string;
}

export default function CostDisplay({ totalCost, lastUpdated }: CostDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-sm text-gray-500 mb-2">Total Cost</div>
      <div className="text-4xl font-bold text-gray-900 mb-4">
        ${totalCost.toFixed(2)}
      </div>
      <div className="text-xs text-gray-400">
        Last updated: {formatDate(lastUpdated)}
      </div>
    </div>
  );
}
```

**Step 2: Create model breakdown component**

Create `src/components/ModelBreakdown.tsx`:
```typescript
'use client';

import { ModelCost } from '@/lib/types';

interface ModelBreakdownProps {
  breakdown: ModelCost[];
}

export default function ModelBreakdown({ breakdown }: ModelBreakdownProps) {
  if (breakdown.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown by Model</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown by Model</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requests
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost (USD)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {breakdown.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.model}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {item.requests.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  ${item.cost_usd.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript compilation**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/CostDisplay.tsx src/components/ModelBreakdown.tsx
git commit -m "feat: add CostDisplay and ModelBreakdown components"
```

---

## Task 15: Create Main Page with All Components

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Step 1: Update global CSS**

Modify `src/app/globals.css` (replace content):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-100;
}
```

**Step 2: Create main page**

Modify `src/app/page.tsx` (replace content):
```typescript
'use client';

import { useState } from 'react';
import ProviderSelector from '@/components/ProviderSelector';
import WorkspaceSelector from '@/components/WorkspaceSelector';
import ProjectSelector from '@/components/ProjectSelector';
import DateRangePicker from '@/components/DateRangePicker';
import CostDisplay from '@/components/CostDisplay';
import ModelBreakdown from '@/components/ModelBreakdown';
import { DateRange } from '@/lib/types';
import { getDateRangeForPreset } from '@/utils/dateHelpers';

export default function Home() {
  const [providerId, setProviderId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(
    getDateRangeForPreset('month')
  );
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchCosts = async () => {
    if (!providerId || !projectId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = `/api/costs?provider=${providerId}&project_id=${projectId}&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;

      if (workspaceId) {
        url += `&workspace=${workspaceId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch costs');
      }

      const data = await response.json();
      setCostData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCostData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!providerId || !projectId) {
      return;
    }

    try {
      // Invalidate cache
      let url = `/api/costs?provider=${providerId}&project_id=${projectId}&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;

      if (workspaceId) {
        url += `&workspace=${workspaceId}`;
      }

      await fetch(url, { method: 'DELETE' });

      // Fetch fresh data
      await handleFetchCosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">LLM Cost Tracker</h1>
          <p className="text-gray-600 mt-2">
            Track costs across multiple LLM providers and projects
          </p>
        </header>

        <div className="space-y-6">
          {/* Selection Controls */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <ProviderSelector
              value={providerId}
              onChange={(id) => {
                setProviderId(id);
                setWorkspaceId('');
                setProjectId('');
                setCostData(null);
              }}
            />

            {providerId && (
              <WorkspaceSelector
                providerId={providerId}
                value={workspaceId}
                onChange={(id) => {
                  setWorkspaceId(id);
                  setProjectId('');
                  setCostData(null);
                }}
              />
            )}

            {providerId && (
              <ProjectSelector
                providerId={providerId}
                workspaceId={workspaceId}
                value={projectId}
                onChange={(id) => {
                  setProjectId(id);
                  setCostData(null);
                }}
              />
            )}

            <DateRangePicker value={dateRange} onChange={setDateRange} />

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleFetchCosts}
                disabled={!providerId || !projectId || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading...' : 'Get Costs'}
              </button>

              {costData && (
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  Refresh
                </button>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">Error: {error}</p>
              </div>
            )}
          </div>

          {/* Results */}
          {costData && (
            <div className="space-y-6">
              <CostDisplay
                totalCost={costData.total_cost_usd}
                lastUpdated={costData.last_updated}
              />
              <ModelBreakdown breakdown={costData.breakdown} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Test the full application**

Run:
```bash
npm run dev
```

Open browser to http://localhost:3000

Expected: Full UI with all selectors and cost display

**Step 4: Stop dev server**

Press Ctrl+C

**Step 5: Commit**

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "feat: create main page with full UI integration"
```

---

## Task 16: Final Testing and Documentation

**Files:**
- Modify: `README.md` (update with testing instructions)

**Step 1: Create production build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Test production build locally**

Run:
```bash
npm run start
```

Open browser to http://localhost:3000 and verify all features work

**Step 3: Stop production server**

Press Ctrl+C

**Step 4: Add testing section to README**

Add to `README.md` before "Déploiement sur Vercel" section:
```markdown
## Testing Locally

### With Mock Data (Before Adding API Keys)

The application will build and run without API keys, but will show errors when trying to fetch real data. This is expected.

### With Real API Keys

1. **Get your OpenAI API keys:**
   - Go to https://platform.openai.com
   - Navigate to your organization settings
   - Generate admin API keys for each workspace

2. **Add keys to .env.local:**
   ```env
   OPENAI_API_KEY_EDUGAMI=sk-proj-your-actual-key
   OPENAI_API_KEY_MEMOWAYS=sk-proj-your-actual-key
   OPENAI_API_KEY_STORYGAMI=sk-proj-your-actual-key
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Test the flow:**
   - Select "OpenAI" provider
   - Select a workspace (Edugami/Memoways/Storygami)
   - Select a project from the dropdown
   - Choose a date range
   - Click "Get Costs"
   - Verify cost data displays correctly
   - Click "Refresh" to invalidate cache and fetch new data

### Troubleshooting

**"Failed to fetch projects":**
- Verify your API keys are correct
- Ensure the API key has admin permissions
- Check network connectivity

**"Provider not found":**
- Clear your browser cache
- Restart the dev server

**Build errors:**
- Run `npm install` to ensure all dependencies are installed
- Check that you're using Node.js 18+
```

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add testing instructions to README"
```

---

## Task 17: Prepare for Deployment

**Files:**
- Create: `.env.local.example` (if needed)
- Verify: `.gitignore` includes `.env.local`

**Step 1: Verify .gitignore**

Run:
```bash
cat .gitignore | grep -E "\.env"
```

Expected: Should include `.env*.local` and `.env`

**Step 2: Create final commit**

Run:
```bash
git add .
git commit -m "chore: prepare for deployment"
```

**Step 3: View commit log**

Run:
```bash
git log --oneline
```

Expected: All commits listed chronologically

---

## Implementation Complete!

The LLM Cost Tracker application is now fully implemented with:

✅ Multi-provider architecture with extensible pattern
✅ OpenAI provider with 3 workspace support
✅ Conditional workspace selection UI
✅ Complete API routes with caching
✅ React components for all UI elements
✅ Date range selection (presets + custom)
✅ Cost display and model breakdown
✅ Cache invalidation (refresh functionality)

**Next Steps:**

1. **Add API keys** to `.env.local` for testing
2. **Test locally** with real OpenAI data
3. **Create GitHub repository** and push code
4. **Deploy to Vercel** following README instructions
5. **Add future providers** (Anthropic, Mistral) as needed

**Future Enhancements:**
- Add export functionality (CSV, PDF)
- Add charts and visualizations
- Add cost alerts
- Add authentication for multi-user support
