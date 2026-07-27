/**
 * Customer-facing domain status presentation. PURE — no server-only, no I/O — so
 * it is unit-tested and safe to import from client components.
 *
 * Maps the internal DomainStatus enum (and any unrecognized / raw provider
 * string) to a Swedish, customer-friendly label + severity tone + icon token.
 *
 * CRITICAL invariant: an UNRECOGNIZED or missing status is presented as "Okänt"
 * (unknown) — NEVER as "Utgången" (expired). We must never tell a customer their
 * domain has expired when we simply could not read its state.
 *
 * The presentation always carries BOTH a text label and an icon token, so the UI
 * can convey status without relying on colour alone (accessibility).
 */
import { isDomainStatus, type DomainStatus } from "./types.ts";

export type StatusTone = "positive" | "neutral" | "warning" | "critical" | "unknown";

export type DomainStatusPresentation = {
  /** Stable key (for tests/UI logic, not shown verbatim to the user). */
  key: DomainStatus | "unknown";
  /** Swedish, customer-friendly label. */
  label: string;
  /** Severity tone — pairs with the icon; the UI must never use colour alone. */
  tone: StatusTone;
  /** lucide-react icon name so the badge shows text + icon, not colour only. */
  icon: string;
  /** One-line plain-language explanation. */
  description: string;
};

const PRESENTATIONS: Record<DomainStatus, DomainStatusPresentation> = {
  active: {
    key: "active",
    label: "Aktiv",
    tone: "positive",
    icon: "CircleCheck",
    description: "Domänen är aktiv och registrerad.",
  },
  pending: {
    key: "pending",
    label: "Registreras",
    tone: "warning",
    icon: "Clock",
    description: "Registreringen behandlas just nu.",
  },
  transfer_pending: {
    key: "transfer_pending",
    label: "Flytt pågår",
    tone: "warning",
    icon: "ArrowRightLeft",
    description: "En överföring av domänen pågår.",
  },
  transferred_out: {
    key: "transferred_out",
    label: "Flyttad",
    tone: "neutral",
    icon: "LogOut",
    description: "Domänen har flyttats till en annan leverantör.",
  },
  expired: {
    key: "expired",
    label: "Utgången",
    tone: "critical",
    icon: "TriangleAlert",
    description: "Domänen har gått ut och behöver förnyas.",
  },
  suspended: {
    key: "suspended",
    label: "Spärrad",
    tone: "critical",
    icon: "ShieldAlert",
    description: "Domänen är tillfälligt spärrad.",
  },
  cancelled: {
    key: "cancelled",
    label: "Avslutad",
    tone: "neutral",
    icon: "CircleX",
    description: "Domänen är avslutad.",
  },
  failed: {
    key: "failed",
    label: "Fel uppstod",
    tone: "critical",
    icon: "TriangleAlert",
    description: "Något gick fel med domänen. Kontakta oss gärna.",
  },
};

/** The presentation used for any status we cannot confidently recognize. */
export const UNKNOWN_STATUS_PRESENTATION: DomainStatusPresentation = {
  key: "unknown",
  label: "Okänt",
  tone: "unknown",
  icon: "CircleHelp",
  description: "Vi kunde inte läsa domänens aktuella status just nu.",
};

/**
 * Map any status string to a customer-safe presentation. A recognized
 * DomainStatus maps to its entry; anything else (raw provider text, null,
 * garbage) maps to the neutral "Okänt" presentation — never "Utgången".
 */
export function mapDomainStatusForCustomer(
  status: string | null | undefined
): DomainStatusPresentation {
  if (isDomainStatus(status)) return PRESENTATIONS[status];
  return UNKNOWN_STATUS_PRESENTATION;
}
