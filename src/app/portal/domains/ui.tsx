import {
  ArrowRightLeft,
  CalendarClock,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  Info,
  LogOut,
  RefreshCwOff,
  RotateCw,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { StatusTone } from "@/lib/domains/status-presenter";
import type { AttentionLevel } from "@/lib/domains/attention";

/**
 * Shared presentational helpers for the customer domain pages. Status and
 * attention are shown as TEXT + ICON (never colour alone) for accessibility;
 * tone/level drive the colour, the label carries the meaning, and the icon
 * reinforces it.
 */

const ICONS: Record<string, LucideIcon> = {
  ArrowRightLeft,
  CalendarClock,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  Info,
  LogOut,
  RefreshCwOff,
  RotateCw,
  ShieldAlert,
  TriangleAlert,
};

/** Render a lucide icon by name, defaulting to a neutral "unknown" glyph. */
export function DomainIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? CircleHelp;
  return <Icon className={className} aria-hidden="true" />;
}

const TONE_BADGE: Record<StatusTone, string> = {
  positive: "border-green-500/30 bg-green-500/15 text-green-300",
  neutral: "border-slate-600 bg-slate-700/40 text-slate-300",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  critical: "border-red-500/30 bg-red-500/15 text-red-300",
  unknown: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

export function statusBadgeClass(tone: StatusTone): string {
  return TONE_BADGE[tone];
}

const LEVEL_BADGE: Record<AttentionLevel, string> = {
  critical: "border-red-500/30 bg-red-500/15 text-red-300",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  info: "border-slate-600 bg-slate-700/40 text-slate-300",
  none: "border-green-500/30 bg-green-500/15 text-green-300",
};

export function attentionBadgeClass(level: AttentionLevel): string {
  return LEVEL_BADGE[level];
}

/** Format an ISO date as sv-SE (date only), or an em dash. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(new Date(t));
}
