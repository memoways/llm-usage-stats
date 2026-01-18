/**
 * Provider Factory
 *
 * Factory pattern for creating LLM provider instances.
 * This allows the application to dynamically instantiate the correct
 * provider based on the provider ID.
 */

import { ILLMProvider } from './interface';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { ElevenLabsProvider } from './elevenlabs';
import { DeepgramProvider } from './deepgram';
import { OpenRouterProvider } from './openrouter';
import { ProviderInfo } from '../types';

// Registry of available providers
const providerRegistry = new Map<string, () => ILLMProvider>([
  ['openai', () => new OpenAIProvider()],
  ['anthropic', () => new AnthropicProvider()],
  ['elevenlabs', () => new ElevenLabsProvider()],
  ['deepgram', () => new DeepgramProvider()],
  ['openrouter', () => new OpenRouterProvider()],
  // Future providers can be added here:
  // ['mistral', () => new MistralProvider()],
]);

/**
 * Get a provider instance by ID
 *
 * @param providerId - The unique ID of the provider (e.g., 'openai', 'anthropic')
 * @returns Provider instance implementing ILLMProvider
 * @throws Error if provider is not found
 */
export function getProvider(providerId: string): ILLMProvider {
  const factory = providerRegistry.get(providerId);

  if (!factory) {
    throw new Error(
      `Provider '${providerId}' not found. Available providers: ${Array.from(
        providerRegistry.keys()
      ).join(', ')}`
    );
  }

  return factory();
}

/**
 * Get list of all available providers
 *
 * @returns Array of provider information (id, name, supportsWorkspaces)
 */
export function getAvailableProviders(): ProviderInfo[] {
  const providers: ProviderInfo[] = [];

  for (const [id, factory] of providerRegistry.entries()) {
    try {
      const provider = factory();
      providers.push({
        id: provider.id,
        name: provider.name,
        supportsWorkspaces: provider.supportsWorkspaces,
      });
    } catch (error) {
      // Skip providers that can't be instantiated (e.g., missing API keys)
      console.warn(`Warning: Could not instantiate provider '${id}':`, error);
    }
  }

  return providers;
}

/**
 * Check if a provider is available
 *
 * @param providerId - The provider ID to check
 * @returns true if provider exists in registry
 */
export function isProviderAvailable(providerId: string): boolean {
  return providerRegistry.has(providerId);
}
