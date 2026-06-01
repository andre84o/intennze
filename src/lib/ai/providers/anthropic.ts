import "server-only";

import { AIError, type AIGenerateOptions, type AIGenerateResponse, type Provider } from "../types";

const BASE_URL = "https://api.anthropic.com/v1";
const API_VERSION = "2023-06-01";
const DEFAULT_TIMEOUT_MS = 30_000;

export class AnthropicProvider implements Provider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generateText(
    prompt: string,
    options?: AIGenerateOptions
  ): Promise<AIGenerateResponse> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = {
        model: this.model,
        // max_tokens is required by Anthropic — no default in their API
        max_tokens: options?.maxTokens ?? 1024,
        messages: [{ role: "user", content: prompt }],
      };

      // Anthropic takes system as a top-level field, not inside messages
      if (options?.systemPrompt) {
        body.system = options.systemPrompt;
      }

      // Anthropic temperature range: 0–1 (clamp to be safe)
      if (options?.temperature !== undefined) {
        body.temperature = Math.max(0, Math.min(1, options.temperature));
      }

      const response = await fetch(`${BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw mapStatusToError(response.status);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await response.json()) as Record<string, any>;
      const text = extractText(data);
      if (!text) throw new AIError("Empty response", "API_ERROR");

      return { text, usage: extractUsage(data) };
    } catch (err) {
      if (err instanceof AIError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new AIError("Request timed out", "TIMEOUT");
      }
      throw new AIError("Network error", "UNKNOWN");
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function mapStatusToError(status: number): AIError {
  if (status === 401 || status === 403)
    return new AIError("Authentication failed", "INVALID_CONFIG", status);
  if (status === 429)
    return new AIError("Rate limit exceeded", "RATE_LIMITED", status);
  if (status === 404)
    return new AIError("Model not found", "INVALID_MODEL", status);
  return new AIError("API error", "API_ERROR", status);
}

function extractText(data: Record<string, unknown>): string | null {
  const content = data["content"];
  if (!Array.isArray(content) || content.length === 0) return null;
  const block = content[0] as Record<string, unknown>;
  if (block?.["type"] !== "text") return null;
  const text = block["text"];
  return typeof text === "string" ? text : null;
}

function extractUsage(
  data: Record<string, unknown>
): AIGenerateResponse["usage"] {
  const usage = data["usage"];
  if (typeof usage !== "object" || usage === null) return undefined;
  const u = usage as Record<string, unknown>;
  if (typeof u["input_tokens"] !== "number" || typeof u["output_tokens"] !== "number")
    return undefined;
  return {
    promptTokens: u["input_tokens"] as number,
    completionTokens: u["output_tokens"] as number,
    totalTokens: (u["input_tokens"] as number) + (u["output_tokens"] as number),
  };
}
