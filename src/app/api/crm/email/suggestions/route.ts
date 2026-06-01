export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateText, AIError } from "@/lib/ai/client";
import type { AIGenerateResponse } from "@/lib/ai/client";
import { crmEmailSuggestionsLimiter, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";

type ProviderLabel = "DeepSeek" | "Claude";

interface Suggestion {
  tone: string;
  subject: string;
  message: string;
  provider: ProviderLabel;
}

function validateSuggestions(raw: unknown, provider: ProviderLabel): Suggestion[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw new Error("expected exactly 3 suggestions");
  }
  return raw.map((s: unknown, i: number) => {
    if (typeof s !== "object" || s === null)
      throw new Error(`suggestion ${i}: not an object`);
    const obj = s as Record<string, unknown>;
    if (typeof obj["tone"] !== "string" || !String(obj["tone"]).trim())
      throw new Error(`suggestion ${i}: missing tone`);
    if (typeof obj["subject"] !== "string" || !String(obj["subject"]).trim())
      throw new Error(`suggestion ${i}: missing subject`);
    if (typeof obj["message"] !== "string" || !String(obj["message"]).trim())
      throw new Error(`suggestion ${i}: missing message`);
    if (String(obj["subject"]).length > 255)
      throw new Error(`suggestion ${i}: subject too long`);
    if (String(obj["message"]).length > 10_000)
      throw new Error(`suggestion ${i}: message too long`);
    return {
      tone: String(obj["tone"]).trim(),
      subject: String(obj["subject"]).trim(),
      message: String(obj["message"]).trim(),
      provider,
    };
  });
}

function parseResult(
  result: PromiseSettledResult<AIGenerateResponse>,
  provider: ProviderLabel
): Suggestion[] | null {
  if (result.status === "rejected") {
    const err = result.reason;
    // Log only error code — never prompt, customer data, or response body
    if (err instanceof AIError) {
      console.error(`[crm/email/suggestions] ${provider} error:`, err.code);
    } else {
      console.error(`[crm/email/suggestions] ${provider} failed`);
    }
    return null;
  }
  try {
    const cleaned = result.value.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return validateSuggestions(parsed["suggestions"], provider);
  } catch {
    console.error(`[crm/email/suggestions] ${provider} invalid response format`);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitResult = await tryLimit(crmEmailSuggestionsLimiter, user.id);
    if (limitResult && !limitResult.success) {
      return NextResponse.json(
        { error: "För många förfrågningar. Vänta en stund och försök igen." },
        { status: 429, headers: rateLimitHeaders(limitResult) }
      );
    }

    const body = await req.json() as Record<string, unknown>;
    const { customerId, draftMessage, subject } = body;

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ error: "customerId krävs" }, { status: 400 });
    }
    if (!draftMessage || typeof draftMessage !== "string" || !String(draftMessage).trim()) {
      return NextResponse.json({ error: "draftMessage krävs" }, { status: 400 });
    }
    if (String(draftMessage).trim().length > 3000) {
      return NextResponse.json(
        { error: "draftMessage får max vara 3 000 tecken" },
        { status: 400 }
      );
    }
    if (subject !== undefined && subject !== null && typeof subject !== "string") {
      return NextResponse.json({ error: "subject måste vara en sträng" }, { status: 400 });
    }
    if (typeof subject === "string" && subject.length > 255) {
      return NextResponse.json(
        { error: "subject får max vara 255 tecken" },
        { status: 400 }
      );
    }

    // Fetch only non-PII customer fields — never send email/name/phone to AI
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, company_name, category")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Kunden hittades inte" }, { status: 404 });
    }

    const contextParts: string[] = [];
    if (customer.company_name) contextParts.push(`Företag: ${customer.company_name}`);
    if (customer.category) contextParts.push(`Kategori: ${customer.category}`);
    if (typeof subject === "string" && subject.trim()) {
      contextParts.push(`Nuvarande ämnesrad: ${subject.trim()}`);
    }

    const context = contextParts.length > 0
      ? `\n\nKundkontext:\n${contextParts.join("\n")}`
      : "";

    const systemPrompt = `Du är en professionell e-postassistent för ett B2B-företag. Generera exakt 3 e-postförslag baserat på admins utkast. Varje förslag ska ha en egen ton. Svara ENBART med giltig JSON i exakt detta format — ingen annan text, inga kommentarer, ingen markdown:
{"suggestions":[{"tone":"Professional","subject":"...","message":"..."},{"tone":"Friendly","subject":"...","message":"..."},{"tone":"Short/Direct","subject":"...","message":"..."}]}

Regler:
- subject max 255 tecken per förslag
- message max 2000 tecken per förslag
- Skriv på svenska
- Returnera ENBART JSON`;

    const prompt = `Utkast: ${String(draftMessage).trim()}${context}`;

    const sharedOptions = {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30_000,
    };

    // Call both providers in parallel — Promise.allSettled so one failure
    // never blocks the other's results from reaching the user
    const [deepseekResult, claudeResult] = await Promise.allSettled([
      generateText(prompt, { ...sharedOptions, provider: "deepseek" }),
      generateText(prompt, { ...sharedOptions, provider: "anthropic" }),
    ]);

    const deepseekSuggestions = parseResult(deepseekResult, "DeepSeek");
    const claudeSuggestions = parseResult(claudeResult, "Claude");

    const suggestions: Suggestion[] = [
      ...(deepseekSuggestions ?? []),
      ...(claudeSuggestions ?? []),
    ];

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "Kunde inte generera förslag, försök igen" },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestions });
  } catch {
    console.error("[crm/email/suggestions] Unexpected error");
    return NextResponse.json({ error: "Något gick fel" }, { status: 500 });
  }
}
