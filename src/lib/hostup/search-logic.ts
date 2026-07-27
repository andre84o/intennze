/**
 * Pure decision logic for domain search — no network, no server-only, injectable
 * randomness, so node --test covers period validation, the bulk-poll state
 * machine, and registry-requirement display normalization without a DB/network.
 */
import type { JobStatus, RegistryRequirement, RegistryRequirements } from "./search-types.ts";

// ── period validation (only registry-returned years are valid) ───────────────
export type PeriodValidation = { ok: true; year: number } | { ok: false; reason: string };

export function validatePeriod(year: unknown, supportedYears: number[]): PeriodValidation {
  if (typeof year !== "number" || !Number.isInteger(year) || year < 1) {
    return { ok: false, reason: "invalid_year" };
  }
  if (!Array.isArray(supportedYears) || supportedYears.length === 0) {
    return { ok: false, reason: "no_supported_years" };
  }
  if (!supportedYears.includes(year)) {
    return { ok: false, reason: "unsupported_year" };
  }
  return { ok: true, year };
}

// ── bulk-poll state machine (one step; timers/jitter injected for testability) ─
export type PollPhase = "completed" | "failed" | "timeout" | "processing" | "partial";
export type PollStep = { phase: PollPhase; shouldPoll: boolean; delayMs: number };

export type PollContext = {
  attempt: number; // 0-based
  elapsedMs: number;
  maxAttempts: number;
  maxElapsedMs: number;
  baseDelayMs: number;
  capMs: number;
  /** seconds from a Retry-After / rate-limit hint; the delay never goes below it. */
  minDelayMs?: number;
};

export function nextBulkPollStep(
  jobStatus: JobStatus,
  hasResults: boolean,
  ctx: PollContext,
  rng: () => number = Math.random
): PollStep {
  if (jobStatus === "completed") return { phase: "completed", shouldPoll: false, delayMs: 0 };
  if (jobStatus === "failed") return { phase: "failed", shouldPoll: false, delayMs: 0 };

  // Bounded: stop before exceeding attempt or wall-clock budget. Never infinite.
  if (ctx.attempt + 1 >= ctx.maxAttempts || ctx.elapsedMs >= ctx.maxElapsedMs) {
    return { phase: "timeout", shouldPoll: false, delayMs: 0 };
  }

  const expo = Math.min(ctx.capMs, ctx.baseDelayMs * 2 ** ctx.attempt);
  let delay = Math.floor(rng() * expo); // full jitter
  if (ctx.minDelayMs) delay = Math.max(delay, ctx.minDelayMs);
  // Never sleep past the remaining budget.
  delay = Math.min(delay, Math.max(0, ctx.maxElapsedMs - ctx.elapsedMs));

  return { phase: hasResults ? "partial" : "processing", shouldPoll: true, delayMs: delay };
}

// ── registry requirement display normalization (dynamic; no hardcoded TLDs) ──
// Keys that carry sensitive PII/secret data. Phase 3A DISPLAYS that these will be
// required but collects/stores/logs NONE of them.
const SENSITIVE_KEYS = new Set([
  "registrationidentifier",
  "identification",
  "personnummer",
  "personal_identity_number",
  "ssn",
  "orgnumber",
  "organizationnumber",
  "organisationnumber",
  "vatnumber",
  "eppcode",
  "authcode",
  "authorizationcode",
]);

export function isSensitiveRequirementKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[\s_-]+/g, ""));
}

export type RequirementDisplay = {
  key: string;
  label: string;
  required: boolean;
  reason: string | null;
  sensitive: boolean;
  allowedCountryCodes: string[] | null;
  allowedRegistrantTypes: string[] | null;
  alternativeRequirementKey: string | null;
  acceptedTermsKey: string | null;
};

/**
 * Flatten the registry requirements for one operation into a display list the UI
 * renders dynamically. Never invents rules — purely reflects what Hostup returned.
 */
export function requirementsForDisplay(
  reqs: RegistryRequirements | null,
  op: "register" | "transfer"
): RequirementDisplay[] {
  if (!reqs) return [];
  const list: RegistryRequirement[] = op === "transfer" ? reqs.transfer : reqs.registration;
  return list.map((r) => ({
    key: r.key,
    label: r.label ?? r.key,
    required: r.required,
    reason: r.reason,
    sensitive: isSensitiveRequirementKey(r.key),
    allowedCountryCodes: r.allowedCountryCodes,
    allowedRegistrantTypes: r.allowedRegistrantTypes,
    alternativeRequirementKey: r.alternativeRequirementKey,
    acceptedTermsKey: r.acceptedTermsKey,
  }));
}

/** True iff a state may be offered for registration purchase later (UI gating). */
export function isRegistrable(state: string): boolean {
  return state === "available";
}
