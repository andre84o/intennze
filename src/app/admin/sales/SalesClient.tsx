"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import {
  getMyCommissionSummary,
  getMyCommissionBreakdown,
  getCompanyCommissionOverview,
  getSalespeopleCommission,
  getSalesTrend,
  approvePeriod,
  markPeriodPaid,
  createAdjustment,
  getInvoiceBacking,
  type CommissionFigures,
  type CommissionEntryItem,
  type CommissionAdjustmentItem,
  type CompanyCommissionOverviewResult,
  type SalespersonCommissionRow,
  type TrendPoint,
} from "./actions";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | null | undefined): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const hasOre = Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: hasOre ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPercent(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "–";
  return `${p.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} %`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "–";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("sv-SE");
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
}

function monthShort(month: string): string {
  const [y, m] = month.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString("sv-SE", { month: "short" }).replace(".", "");
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map((v) => parseInt(v, 10));
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Icons + tones (soft indigo/violet palette, matching the reference)
// ---------------------------------------------------------------------------

function Icon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d={path} />
    </svg>
  );
}

// Solid (filled) icons for a bolder, more designed look.
const ICONS = {
  revenue:
    "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a4.124 4.124 0 001.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 00-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z",
  tier: "M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z",
  earned:
    "M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z",
  paid: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z",
  unpaid:
    "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z",
  target:
    "M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z",
  users:
    "M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z",
} as const;

type Tone = "indigo" | "violet" | "emerald" | "amber" | "sky";

const TONE_CHIP: Record<Tone, string> = {
  indigo: "bg-gradient-to-br from-indigo-500 to-indigo-400 text-white shadow-sm shadow-indigo-500/30",
  violet: "bg-gradient-to-br from-violet-500 to-purple-400 text-white shadow-sm shadow-violet-500/30",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-sm shadow-emerald-500/30",
  amber: "bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-sm shadow-amber-500/30",
  sky: "bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-sm shadow-sky-500/30",
};

const TONE_STROKE: Record<Tone, string> = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
};

// ---------------------------------------------------------------------------
// Charts (inline SVG — no dependencies)
// ---------------------------------------------------------------------------

function Sparkline({ data, tone = "indigo", height = 44 }: { data: number[]; tone?: Tone; height?: number }) {
  const gid = useId();
  if (!data || data.length < 2) return <div style={{ height }} />;
  const w = 120;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - 4 - ((v - min) / range) * (height - 10);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const stroke = TONE_STROKE[tone];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="mt-3 w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function compactAmount(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}k`;
  return `${Math.round(v)}`;
}

function BarChart({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="flex h-52 items-end gap-2">
      {points.map((p, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center">
          <div className="flex w-full flex-1 flex-col items-center justify-end">
            {p.value > 0 && (
              <span className="mb-1.5 text-[10px] font-semibold tabular-nums text-slate-600">
                {compactAmount(p.value)}
              </span>
            )}
            <div
              className="w-full max-w-[26px] rounded-lg bg-gradient-to-t from-indigo-200 to-violet-500"
              style={{ height: `${Math.max((p.value / max) * 86, p.value > 0 ? 4 : 1)}%` }}
              title={`${p.label}: ${formatCurrency(p.value)}`}
            />
          </div>
          <span className="mt-2 text-[10px] font-medium capitalize text-slate-400">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ paid, unpaid }: { paid: number; unpaid: number }) {
  const gid = useId();
  const total = paid + unpaid;
  const pct = total > 0 ? paid / total : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const dash = pct * c;
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2ff" strokeWidth="12" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-bold tabular-nums text-slate-900">{Math.round(pct * 100)}%</p>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">utbetalt</p>
      </div>
    </div>
  );
}

function TrendBadge({ series }: { series: number[] }) {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const pct = prev > 0 ? ((last - prev) / prev) * 100 : last > 0 ? 100 : 0;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        up ? "bg-indigo-50 text-indigo-500" : "bg-rose-50 text-rose-500"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  iconPath,
  tone = "indigo",
  right,
  children,
}: {
  label: string;
  value: string;
  iconPath: string;
  tone?: Tone;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE_CHIP[tone]}`}>
          <Icon path={iconPath} />
        </span>
        {right}
      </div>
      <p className="mt-4 text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

const STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  open: { label: "Öppen", className: "bg-amber-50 text-amber-600 ring-amber-100", dot: "bg-amber-500" },
  approved: { label: "Godkänd", className: "bg-indigo-50 text-indigo-600 ring-indigo-100", dot: "bg-indigo-500" },
  paid: { label: "Utbetald", className: "bg-emerald-50 text-emerald-600 ring-emerald-100", dot: "bg-emerald-500" },
};

const ADJUSTMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "refund", label: "Återbetalning" },
  { value: "credit", label: "Kreditering" },
  { value: "correction", label: "Korrigering" },
  { value: "bonus", label: "Bonus" },
  { value: "other", label: "Övrigt" },
];

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared modal shell
// ---------------------------------------------------------------------------

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex flex-none items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex flex-none justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month selector
// ---------------------------------------------------------------------------

function MonthSelector({ month, onChange }: { month: string; onChange: (next: string) => void }) {
  const chevron = (dir: "l" | "r") => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={dir === "l" ? "M15.75 19.5L8.25 12l7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"}
      />
    </svg>
  );
  return (
    <div className="inline-flex items-center rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-slate-100">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        aria-label="Föregående månad"
      >
        {chevron("l")}
      </button>
      <span className="min-w-[7rem] text-center text-sm font-medium capitalize text-slate-700">
        {monthLabel(month)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        aria-label="Nästa månad"
      >
        {chevron("r")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Mina siffror"
// ---------------------------------------------------------------------------

function MyNumbersSection({ month, monthControl }: { month: string; monthControl?: React.ReactNode }) {
  const [figures, setFigures] = useState<CommissionFigures | null>(null);
  const [entries, setEntries] = useState<CommissionEntryItem[]>([]);
  const [adjustments, setAdjustments] = useState<CommissionAdjustmentItem[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      const [summary, breakdown, tr] = await Promise.all([
        getMyCommissionSummary(month),
        getMyCommissionBreakdown(month),
        getSalesTrend("me", month, 8),
      ]);
      if (!active) return;
      if (!summary.ok) setError(summary.error ?? "Kunde inte hämta dina siffror");
      else setFigures(summary.figures ?? null);
      if (breakdown.ok) {
        setEntries(breakdown.entries ?? []);
        setAdjustments(breakdown.adjustments ?? []);
      }
      if (tr.ok) setTrend(tr.points ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [month]);

  const revSeries = trend.map((p) => p.revenue);
  const commSeries = trend.map((p) => p.commission);
  const bars = trend.map((p) => ({ label: monthShort(p.month), value: p.commission }));

  const nextTierPct = (() => {
    if (!figures || figures.kvarTillNastaNiva == null) return 100;
    const rev = figures.revenueExVat ?? 0;
    const target = rev + figures.kvarTillNastaNiva;
    return target > 0 ? (rev / target) * 100 : 0;
  })();

  return (
    <section className="mb-12">
      <SectionHeader
        title="Mina siffror"
        right={
          <div className="flex items-center gap-3">
            {figures && figures.periodExists && <StatusBadge status={figures.status} />}
            {figures && figures.periodExists && figures.dynamic && (
              <span className="hidden text-xs text-slate-400 sm:inline">Preliminärt</span>
            )}
            {monthControl}
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 ring-1 ring-slate-100">Laddar…</div>
      ) : !figures || !figures.periodExists ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          Ingen period ännu för {monthLabel(month)}.
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Betald omsättning ex moms"
              value={formatCurrency(figures.revenueExVat)}
              iconPath={ICONS.revenue}
              tone="indigo"
              right={<TrendBadge series={revSeries} />}
            >
              <Sparkline data={revSeries} tone="indigo" />
            </StatCard>
            <StatCard
              label="Intjänad provision"
              value={formatCurrency(figures.earnedCommission)}
              iconPath={ICONS.earned}
              tone="violet"
              right={<TrendBadge series={commSeries} />}
            >
              <Sparkline data={commSeries} tone="violet" />
            </StatCard>
            <StatCard
              label="Aktuell provisionsnivå"
              value={formatPercent(figures.tierRatePercent)}
              iconPath={ICONS.tier}
              tone="sky"
            >
              <p className="mt-3 text-xs text-slate-400">
                {figures.kvarTillNastaNiva == null
                  ? "Högsta nivån uppnådd"
                  : `${formatCurrency(figures.kvarTillNastaNiva)} till nästa nivå`}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500" style={{ width: `${nextTierPct}%` }} />
              </div>
            </StatCard>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Utbetald provision" value={formatCurrency(figures.paidCommission)} iconPath={ICONS.paid} tone="emerald" />
            <StatCard label="Ej utbetald provision" value={formatCurrency(figures.unpaidCommission)} iconPath={ICONS.unpaid} tone="amber" />
            <StatCard
              label="Kvar till nästa nivå"
              value={figures.kvarTillNastaNiva == null ? "Högsta nivån" : formatCurrency(figures.kvarTillNastaNiva)}
              iconPath={ICONS.target}
              tone="indigo"
            />
          </div>

          {trend.some((p) => p.commission > 0) && (
            <div className="mb-6">
              <ChartCard title="Provision per månad" subtitle="Senaste 8 månaderna">
                <BarChart points={bars} />
              </ChartCard>
            </div>
          )}

          <IncludedInvoicesTable entries={entries} />
          <AdjustmentsTable adjustments={adjustments} />
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function CardTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function IncludedInvoicesTable({ entries }: { entries: CommissionEntryItem[] }) {
  return (
    <CardTable title="Inkluderade fakturor">
      {entries.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">Inga fakturor denna period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 text-left">Faktura #</th>
                <th className="px-5 py-2.5 text-left">Betald</th>
                <th className="px-5 py-2.5 text-right">Ex moms</th>
                <th className="px-5 py-2.5 text-right">Moms</th>
                <th className="px-5 py-2.5 text-right">Totalt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map((e) => (
                <tr key={e.invoiceId} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-mono text-sm text-slate-500">
                    {e.invoiceNumber != null ? `#${e.invoiceNumber}` : "–"}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">{formatDate(e.paidAt)}</td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-900">{formatCurrency(e.amountExVat)}</td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-400">{formatCurrency(e.vatAmount)}</td>
                  <td className="px-5 py-3 text-right text-sm font-medium tabular-nums text-slate-900">{formatCurrency(e.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardTable>
  );
}

function AdjustmentsTable({ adjustments }: { adjustments: CommissionAdjustmentItem[] }) {
  if (adjustments.length === 0) return null;
  const typeLabel = (t: string | null) => ADJUSTMENT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t ?? "–";
  return (
    <CardTable title="Justeringar">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5 text-left">Typ</th>
              <th className="px-5 py-2.5 text-left">Anledning</th>
              <th className="px-5 py-2.5 text-left">Datum</th>
              <th className="px-5 py-2.5 text-right">Belopp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {adjustments.map((a, i) => (
              <tr key={i} className="transition-colors hover:bg-slate-50/60">
                <td className="px-5 py-3 text-sm text-slate-700">{typeLabel(a.adjustmentType)}</td>
                <td className="px-5 py-3 text-sm text-slate-500">{a.reason ?? "–"}</td>
                <td className="px-5 py-3 text-sm text-slate-400">{formatDate(a.createdAt)}</td>
                <td className={`px-5 py-3 text-right text-sm font-medium tabular-nums ${a.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatCurrency(a.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardTable>
  );
}

// ---------------------------------------------------------------------------
// Company overview (admin only)
// ---------------------------------------------------------------------------

function CompanySection({
  month,
  onToast,
  monthControl,
}: {
  month: string;
  onToast: (type: "success" | "error", msg: string) => void;
  monthControl?: React.ReactNode;
}) {
  const [overview, setOverview] = useState<CompanyCommissionOverviewResult | null>(null);
  const [rows, setRows] = useState<SalespersonCommissionRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [adjustFor, setAdjustFor] = useState<SalespersonCommissionRow | null>(null);
  const [backingFor, setBackingFor] = useState<SalespersonCommissionRow | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ov, list, tr] = await Promise.all([
      getCompanyCommissionOverview(month),
      getSalespeopleCommission(month),
      getSalesTrend("company", month, 8),
    ]);
    if (!ov.ok) setError(ov.error ?? "Kunde inte hämta företagsöversikt");
    else setOverview(ov);
    if (list.ok) setRows(list.rows ?? []);
    if (tr.ok) setTrend(tr.points ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    let active = true;
    (async () => {
      await reload();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const runAction = (fn: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return onToast("error", res.error ?? "Åtgärden misslyckades");
      onToast("success", successMsg);
      await reload();
    });

  const paid = overview?.totalPaidCommission ?? 0;
  const unpaid = overview?.totalUnpaidCommission ?? 0;
  const commSeries = trend.map((p) => p.commission);
  const bars = trend.map((p) => ({ label: monthShort(p.month), value: p.commission }));

  return (
    <section className="mb-12">
      <SectionHeader title="Företagsöversikt" subtitle="Alla säljare denna period" right={monthControl} />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 ring-1 ring-slate-100">Laddar…</div>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Omsättning ex moms" value={formatCurrency(overview?.totalRevenueExVat)} iconPath={ICONS.revenue} tone="indigo" />
            <StatCard
              label="Intjänad provision"
              value={formatCurrency(overview?.totalFinalCommission)}
              iconPath={ICONS.earned}
              tone="violet"
              right={<TrendBadge series={commSeries} />}
            >
              <Sparkline data={commSeries} tone="violet" />
            </StatCard>
            <StatCard label="Utbetald" value={formatCurrency(overview?.totalPaidCommission)} iconPath={ICONS.paid} tone="emerald" />
            <StatCard label="Ej utbetald" value={formatCurrency(overview?.totalUnpaidCommission)} iconPath={ICONS.unpaid} tone="amber" />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <ChartCard title="Utbetalning" subtitle="Utbetalt vs ej utbetalt">
              {paid + unpaid > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <Donut paid={paid} unpaid={unpaid} />
                  <div className="flex w-full justify-center gap-5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" /> Utbetald {formatCurrency(paid)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-200" /> Ej {formatCurrency(unpaid)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-slate-400">Ingen provision denna period.</div>
              )}
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard title="Provision per månad" subtitle="Hela företaget, senaste 8 månaderna">
                <BarChart points={bars} />
              </ChartCard>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/30">
                <Icon path={ICONS.users} className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-700">Säljare</h3>
            </div>
            {rows.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Ingen period ännu för {monthLabel(month)}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-2.5 text-left">Säljare</th>
                      <th className="px-5 py-2.5 text-left">Status</th>
                      <th className="px-5 py-2.5 text-right">Omsättning</th>
                      <th className="px-5 py-2.5 text-right">Nivå</th>
                      <th className="px-5 py-2.5 text-right">Provision</th>
                      <th className="px-5 py-2.5 text-right">Ej utbetald</th>
                      <th className="px-5 py-2.5 text-right">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((r) => (
                      <tr key={r.userId} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-semibold text-white">
                              {(r.name || "?").slice(0, 2).toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-slate-900">{r.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-700">{formatCurrency(r.revenueExVat)}</td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-400">{formatPercent(r.tierRatePercent)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(r.finalCommission)}</td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums text-amber-600">{formatCurrency(r.unpaidCommission)}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              onClick={() => r.periodId && runAction(() => approvePeriod(r.periodId as string), "Perioden godkändes")}
                              disabled={pending || !r.periodId || r.status !== "open"}
                              className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Godkänn
                            </button>
                            <button
                              onClick={() => r.periodId && runAction(() => markPeriodPaid(r.periodId as string), "Perioden markerades som utbetald")}
                              disabled={pending || !r.periodId || r.status !== "approved"}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Betala
                            </button>
                            <button
                              onClick={() => setBackingFor(r)}
                              disabled={!r.periodId}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
                            >
                              Fakturor
                            </button>
                            <button
                              onClick={() => setAdjustFor(r)}
                              disabled={!r.periodId}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
                            >
                              Justera
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {adjustFor && adjustFor.periodId && (
        <AdjustmentModal
          seller={adjustFor}
          onClose={() => setAdjustFor(null)}
          onDone={async () => {
            setAdjustFor(null);
            onToast("success", "Justering skapad");
            await reload();
          }}
          onError={(msg) => onToast("error", msg)}
        />
      )}

      {backingFor && backingFor.periodId && <BackingModal seller={backingFor} onClose={() => setBackingFor(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Adjustment modal (admin)
// ---------------------------------------------------------------------------

function AdjustmentModal({
  seller,
  onClose,
  onDone,
  onError,
}: {
  seller: SalespersonCommissionRow;
  onClose: () => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState<string>("correction");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 transition-shadow focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

  const submit = () =>
    startTransition(async () => {
      setErr(null);
      const amt = parseFloat(amount.replace(",", "."));
      if (!Number.isFinite(amt) || amt === 0) return setErr("Ange ett belopp (skilt från noll).");
      if (!reason.trim()) return setErr("Ange en anledning.");
      const res = await createAdjustment({
        userId: seller.userId,
        periodId: seller.periodId as string,
        amount: amt,
        reason: reason.trim(),
        adjustmentType: type as "refund" | "credit" | "correction" | "bonus" | "other",
      });
      if (!res.ok) {
        setErr(res.error ?? "Kunde inte skapa justering.");
        onError(res.error ?? "Kunde inte skapa justering.");
        return;
      }
      onDone();
    });

  return (
    <ModalShell
      title={`Justera provision — ${seller.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-lg px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100">
            Avbryt
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Skapa justering"}
          </button>
        </>
      }
    >
      {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{err}</div>}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Typ</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {ADJUSTMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Belopp (kr, negativt för avdrag)</label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="t.ex. -500"
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Anledning</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputClass} />
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Backing modal (admin)
// ---------------------------------------------------------------------------

function BackingModal({ seller, onClose }: { seller: SalespersonCommissionRow; onClose: () => void }) {
  const [entries, setEntries] = useState<CommissionEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getInvoiceBacking(seller.periodId as string);
      if (!active) return;
      if (!res.ok) setError(res.error ?? "Kunde inte hämta fakturor");
      else setEntries(res.entries ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [seller.periodId]);

  return (
    <ModalShell
      title={`Fakturor — ${seller.name}`}
      onClose={onClose}
      footer={
        <button onClick={onClose} className="rounded-lg px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100">
          Stäng
        </button>
      }
    >
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {loading ? <div className="p-4 text-center text-slate-400">Laddar…</div> : <IncludedInvoicesTable entries={entries} />}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ toast, onClose }: { toast: { type: "success" | "error"; msg: string }; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        }`}
      >
        <span>{toast.msg}</span>
        <button onClick={onClose} className="opacity-80 transition-opacity hover:opacity-100">
          ✕
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/**
 * "Mina siffror" — the logged-in user's OWN commission panel. Exported so it can
 * be embedded on the /admin Dashboard for any commission-eligible user (staff or
 * admin). Self-contained: manages its own month + fetches its own (self-scoped) data.
 */
export function MyCommission({ initialMonth }: { initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  return <MyNumbersSection month={month} monthControl={<MonthSelector month={month} onChange={setMonth} />} />;
}

/**
 * Sales page root — ADMIN company overview only. Individual figures live on the
 * Dashboard via <MyCommission />.
 */
export default function SalesClient({ isAdmin, initialMonth }: { isAdmin: boolean; initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="-m-4 min-h-full bg-[#f6f5fb] p-4 pt-6 text-slate-900 sm:-m-6 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {isAdmin && (
          <CompanySection
            month={month}
            onToast={showToast}
            monthControl={<MonthSelector month={month} onChange={setMonth} />}
          />
        )}

        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
