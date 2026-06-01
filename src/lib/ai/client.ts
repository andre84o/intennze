import "server-only";

import { AIError, type AIGenerateOptions, type AIGenerateResponse, type AIProviderName, type Provider } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";

const VALID_PROVIDERS: AIProviderName[] = ["openai", "anthropic"];

// One cached instance per provider name — recreated on cold start or redeploy
const _providers = new Map<AIProviderName, Provider>();

function createProviderByName(name: AIProviderName): Provider {
  if (name === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AIError("OPENAI_API_KEY is not set", "INVALID_CONFIG");
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    return new OpenAIProvider(apiKey, model);
  }
  // name === "anthropic"
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AIError("ANTHROPIC_API_KEY is not set", "INVALID_CONFIG");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  return new AnthropicProvider(apiKey, model);
}

function getProvider(override?: AIProviderName): Provider {
  const name = override ?? (process.env.AI_PROVIDER as AIProviderName | undefined);
  if (!name || !VALID_PROVIDERS.includes(name)) {
    throw new AIError(
      'AI_PROVIDER must be "openai" or "anthropic"',
      "INVALID_CONFIG"
    );
  }
  if (!_providers.has(name)) {
    _providers.set(name, createProviderByName(name));
  }
  return _providers.get(name)!;
}

/**
 * Generate text via the configured AI provider.
 * Call only from server-side code (API routes, Server Actions).
 * Never pass user-provided data directly as systemPrompt without sanitizing first.
 */
export async function generateText(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AIGenerateResponse> {
  try {
    return await getProvider(options?.provider).generateText(prompt, options);
  } catch (err) {
    if (err instanceof AIError) throw err;
    throw new AIError("Unexpected error", "UNKNOWN");
  }
}

export { AIError };
export type { AIGenerateOptions, AIGenerateResponse };
