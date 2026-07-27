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
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
  unknown: "border-slate-200 bg-slate-100 text-slate-600",
};

export function statusBadgeClass(tone: StatusTone): string {
  return TONE_BADGE[tone];
}

const LEVEL_BADGE: Record<AttentionLevel, string> = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-slate-200 bg-slate-100 text-slate-600",
  none: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
