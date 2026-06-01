export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateText, AIError } from "@/lib/ai/client";
import { crmEmailSuggestionsLimiter, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";

interface Suggestion {
  tone: string;
  subject: string;
  message: string;
}

function validateSuggestions(raw: unknown): Suggestion[] {
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
    };
  });
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

    let suggestions: Suggestion[];
    try {
      const response = await generateText(prompt, {
        provider: "deepseek",
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30_000,
      });

      // Strip markdown code fences if AI wraps JSON in ```json ... ```
      const cleaned = response.text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error("invalid JSON from AI");
      }

      const data = parsed as Record<string, unknown>;
      suggestions = validateSuggestions(data["suggestions"]);
    } catch (err) {
      if (err instanceof AIError) {
        console.error("[crm/email/suggestions] AI error code:", err.code);
        if (err.code === "TIMEOUT") {
          return NextResponse.json(
            { error: "AI-tjänsten svarade inte i tid, försök igen" },
            { status: 504 }
          );
        }
        if (err.code === "RATE_LIMITED") {
          return NextResponse.json(
            { error: "AI-tjänsten är tillfälligt överbelastad, försök igen" },
            { status: 503 }
          );
        }
      }
      // Never log prompt, customer data, or AI response body
      console.error("[crm/email/suggestions] Failed to generate or validate suggestions");
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
