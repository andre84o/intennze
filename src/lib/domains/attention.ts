/**
 * Central "does this domain need the customer's attention?" logic. PURE — no
 * server-only, no I/O, injectable clock — so the priority ordering is unit-tested
 * and the rules live in ONE place instead of being scattered/hardcoded in React.
 *
 * getDomainAttentionState evaluates a fixed, priority-ordered list of signals and
 * returns them highest-priority-first (plus the single `primary` signal that the
 * list/detail UI should surface). A healthy domain returns the "ok" signal.
 *
 * Priority (highest first):
 *   suspended → expired → expiring_soon → auto_renew_off → pending_registration
 *   → transfer_pending → sync_stale → unknown_status → no_provider_link → ok
 * `expiring_soon` deliberately outranks `auto_renew_off`: an imminent expiry is
 * more urgent than a disabled auto-renew far in the future.
 */
import { isDomainStatus } from "./types.ts";

export type AttentionLevel = "critical" | "warning" | "info" | "none";

export type AttentionKey =
  | "suspended"
  | "expired"
  | "expiring_soon"
  | "auto_renew_off"
  | "pending_registration"
  | "transfer_pending"
  | "sync_stale"
  | "unknown_status"
  | "no_provider_link"
  | "ok";

export type AttentionSignal = {
  key: AttentionKey;
  level: AttentionLevel;
  /** Short Swedish label (badge). */
  label: string;
  /** One-line plain-language explanation. */
  message: string;
  /** lucide-react icon name (text + icon, never colour alone). */
  icon: string;
};

/** The minimal domain shape the attention rules read (a subset of `Domain`). */
export type AttentionInput = {
  status: string;
  expires_at: string | null;
  auto_renew: boolean;
  last_synced_at: string | null;
  registrar: string;
  provider_domain_id: string | null;
};

export type AttentionOptions = {
  /** Injected clock (ms). Required — callers pass Date.now() (or a fixed test value). */
  nowMs: number;
  /** Days-before-expiry that count as "expiring soon". Default 30. */
  expiryWarningDays?: number;
  /** Hours after which a linked Hostup cache is considered stale. Default 48. */
  staleAfterHours?: number;
};

export type DomainAttention = {
  /** Highest-priority signal (never null; "ok" when healthy). */
  primary: AttentionSignal;
  /** All applicable signals, highest-priority first. */
  signals: AttentionSignal[];
  /** True when at least one non-"ok" signal applies. */
  needsAttention: boolean;
};

const OK_SIGNAL: AttentionSignal = {
  key: "ok",
  level: "none",
  label: "Allt ser bra ut",
  message: "Inga åtgärder krävs just nu.",
  icon: "CircleCheck",
};

const DAY_MS = 86_400_000;

function parseMs(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/**
 * Evaluate the attention signals for one domain, highest priority first. The
 * clock is injected (`nowMs`) so the result is deterministic and testable.
 */
export function getDomainAttentionState(
  domain: AttentionInput,
  opts: AttentionOptions
): DomainAttention {
  const nowMs = opts.nowMs;
  const warnDays = opts.expiryWarningDays ?? 30;
  const staleHours = opts.staleAfterHours ?? 48;
  const expiresMs = parseMs(domain.expires_at);
  const linked = domain.registrar === "hostup" && !!domain.provider_domain_id;

  const signals: AttentionSignal[] = [];

  // 1 · Spärrad (critical) — highest urgency.
  if (domain.status === "suspended") {
    signals.push({
      key: "suspended",
      level: "critical",
      label: "Spärrad",
      message: "Domänen är spärrad. Kontakta oss för att lösa detta.",
      icon: "ShieldAlert",
    });
  }

  // 2 · Utgången (critical) — status says expired, or the expiry date has passed.
  const isExpired =
    domain.status === "expired" || (expiresMs !== null && expiresMs <= nowMs);
  if (isExpired) {
    signals.push({
      key: "expired",
      level: "critical",
      label: "Utgången",
      message: "Domänen har gått ut och behöver förnyas.",
      icon: "TriangleAlert",
    });
  }

  // 3 · Går ut snart (warning) — within the window and still in the future.
  //     Outranks auto_renew_off. `<=` so exactly N days still counts.
  if (!isExpired && expiresMs !== null && expiresMs > nowMs && expiresMs - nowMs <= warnDays * DAY_MS) {
    const days = Math.ceil((expiresMs - nowMs) / DAY_MS);
    signals.push({
      key: "expiring_soon",
      level: "warning",
      label: "Går ut snart",
      message: `Domänen går ut om ${days} ${days === 1 ? "dag" : "dagar"}.`,
      icon: "CalendarClock",
    });
  }

  // 4 · Autoförnyelse av (warning) — only meaningful when not already expired.
  if (!isExpired && domain.auto_renew === false) {
    signals.push({
      key: "auto_renew_off",
      level: "warning",
      label: "Autoförnyelse av",
      message: "Automatisk förnyelse är avstängd — domänen förnyas inte automatiskt.",
      icon: "RefreshCwOff",
    });
  }

  // 5 · Registreras (info).
  if (domain.status === "pending") {
    signals.push({
      key: "pending_registration",
      level: "info",
      label: "Registreras",
      message: "Registreringen behandlas.",
      icon: "Clock",
    });
  }

  // 6 · Flytt pågår (info).
  if (domain.status === "transfer_pending") {
    signals.push({
      key: "transfer_pending",
      level: "info",
      label: "Flytt pågår",
      message: "En överföring av domänen pågår.",
      icon: "ArrowRightLeft",
    });
  }

  // 7 · Föråldrad status (info) — linked to Hostup but the cache is stale.
  if (linked) {
    const syncedMs = parseMs(domain.last_synced_at);
    const stale = syncedMs === null || nowMs - syncedMs > staleHours * 3_600_000;
    if (stale) {
      signals.push({
        key: "sync_stale",
        level: "info",
        label: "Uppdatera status",
        message: "Statusen kan vara inaktuell. Uppdatera för att hämta senaste läget.",
        icon: "RotateCw",
      });
    }
  }

  // 8 · Okänd status (info) — defensive: a value we cannot recognize.
  if (!isDomainStatus(domain.status)) {
    signals.push({
      key: "unknown_status",
      level: "info",
      label: "Okänt läge",
      message: "Vi kunde inte tolka domänens status.",
      icon: "CircleHelp",
    });
  }

  // 9 · Ingen live-koppling (info) — no Hostup link (manual/other), so no live data.
  if (!linked) {
    signals.push({
      key: "no_provider_link",
      level: "info",
      label: "Hanteras manuellt",
      message: "Domänen har ingen live-koppling; uppgifterna visas från vår senaste registrering.",
      icon: "Info",
    });
  }

  return {
    primary: signals[0] ?? OK_SIGNAL,
    signals: signals.length > 0 ? signals : [OK_SIGNAL],
    needsAttention: signals.some((s) => s.level !== "none" && s.key !== "ok"),
  };
}
