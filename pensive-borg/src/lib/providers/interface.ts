/**
 * ILLMProvider - Common interface for all LLM service providers
 *
 * This interface defines the contract that all LLM providers must implement.
 * It allows the application to interact with different LLM services (OpenAI,
 * Anthropic, Mistral, etc.) through a unified API.
 */

import { Workspace, Project, CostParams, CostData } from '../types';

export interface ILLMProvider {
  /**
   * Unique identifier for the provider (e.g., 'openai', 'anthropic', 'mistral')
   */
  id: string;

  /**
   * Human-readable name of the provider (e.g., 'OpenAI', 'Anthropic')
   */
  name: string;

  /**
   * Whether this provider supports multiple workspaces
   * - true: Provider has workspaces (e.g., OpenAI with multiple organizations)
   * - false: Provider has a single account (e.g., Anthropic, Mistral)
   */
  supportsWorkspaces: boolean;

  /**
   * Get the list of available workspaces for this provider
   *
   * @returns Array of workspaces. Returns empty array if provider doesn't support workspaces.
   */
  getWorkspaces(): Promise<Workspace[]>;

  /**
   * Get the list of projects for a given workspace
   *
   * @param workspace - Optional workspace ID. Required if provider supports workspaces.
   * @returns Array of projects available in the workspace
   */
  getProjects(workspace?: string): Promise<Project[]>;

  /**
   * Get cost data for a specific project and date range
   *
   * @param params - Cost query parameters including workspace, project, and date range
   * @returns Cost data with total and breakdown by model
   */
  getCosts(params: CostParams): Promise<CostData>;
}
