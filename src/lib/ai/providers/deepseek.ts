import "server-only";

import { AIError, type AIGenerateOptions, type AIGenerateResponse, type Provider } from "../types";

// DeepSeek exposes an OpenAI-compatible chat completions endpoint
const BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

export class DeepSeekProvider implements Provider {
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
      const messages: { role: string; content: string }[] = [];
      if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      messages.push({ role: "user", content: prompt });

      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          ...(options?.temperature !== undefined && { temperature: options.temperature }),
          ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        }),
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
  const choices = data["choices"];
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const content = (choices[0] as Record<string, unknown>)?.["message"];
  if (typeof content !== "object" || content === null) return null;
  const text = (content as Record<string, unknown>)["content"];
  return typeof text === "string" ? text : null;
}

function extractUsage(
  data: Record<string, unknown>
): AIGenerateResponse["usage"] {
  const usage = data["usage"];
  if (typeof usage !== "object" || usage === null) return undefined;
  const u = usage as Record<string, unknown>;
  if (
    typeof u["prompt_tokens"] !== "number" ||
    typeof u["completion_tokens"] !== "number" ||
    typeof u["total_tokens"] !== "number"
  )
    return undefined;
  return {
    promptTokens: u["prompt_tokens"] as number,
    completionTokens: u["completion_tokens"] as number,
    totalTokens: u["total_tokens"] as number,
  };
}
