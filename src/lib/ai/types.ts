export interface AIGenerateOptions {
  /** Override AI_PROVIDER env for this specific call. */
  provider?: AIProviderName;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIGenerateResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AIErrorCode =
  | "INVALID_CONFIG"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "INVALID_MODEL"
  | "API_ERROR"
  | "UNKNOWN";

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "AIError";
  }
}

export type AIProviderName = "openai" | "deepseek" | "anthropic";

export interface Provider {
  generateText(
    prompt: string,
    options?: AIGenerateOptions
  ): Promise<AIGenerateResponse>;
}
