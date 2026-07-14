"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import {
  getMyCommissionSummary,
  getMyCommissionBreakdown,
  getSalesTrend,
  type CommissionFigures,
  type CommissionEntryItem,
  type TrendPoint,
} from "./actions";

// ---------------------------------------------------------------------------
// Design tokens (from design_handoff_mina_siffror/README.md). Kept as inline
// styles / constants so colors, radii and shadows stay pixel-exact.
// ---------------------------------------------------------------------------

const INK = { primary: "#211D33", secondary: "#67637E", mut: "#8A87A0", weak: "#B4B0C7", soft: "#A7A3BD" };
const ACCENT = { violet: "#6E5CF3", violetLight: "#9E8CFF", teal: "#14B8C4", purple: "#8B5CF6" };
const CARD_BORDER = "#ECE9F4";
const CARD_SHADOW = "0 1px 2px rgba(31,26,58,0.04), 0 20px 44px -26px rgba(74,58,130,0.3)";

const cardBase: CSSProperties = {
  background: "#fff",
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
};

const numberFont = "[font-family:var(--font-numbers)] tabular-nums";

// ---------------------------------------------------------------------------
// Formatting — currency uses a DOT thousands separator ("82.500 kr"), per spec.
// ---------------------------------------------------------------------------

function groupDots(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatKrInt(n: number | null | undefined): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  const neg = v < 0;
  return (neg ? "-" : "") + groupDots(String(Math.round(Math.abs(v))));
}

function krParts(n: number | null | undefined): { value: string; unit: string } {
  return { value: formatKrInt(n), unit: "kr" };
}

function formatKr(n: number | null | undefined): string {
  return `${formatKrInt(n)} kr`;
}

function pctParts(p: number | null | undefined): { value: string; unit: string } {
  if (p == null || !Number.isFinite(p)) return { value: "0", unit: "%" };
  const value = Number.isInteger(p) ? String(p) : p.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
  return { value, unit: "%" };
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map((v) => parseInt(v, 10));
  const label = new Date(y, m - 1, 1).toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthShort(month: string): string {
  const [y, m] = month.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, 1).toLocaleDateString("sv-SE", { month: "short" }).replace(".", "");
}

function dayMonth(d: string | null | undefined): string {
  if (!d) return "–";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }).replace(".", "");
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map((v) => parseInt(v, 10));
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Avatars + package chips — deterministic color by name hash.
// ---------------------------------------------------------------------------

const AVATAR_GRADS = [
  "linear-gradient(135deg,#6E5CF3,#9E8CFF)",
  "linear-gradient(135deg,#14B8C4,#3fd3d8)",
  "linear-gradient(135deg,#F59E0B,#ffbd47)",
  "linear-gradient(135deg,#10B981,#42d29d)",
  "linear-gradient(135deg,#8B5CF6,#c4b5fd)",
];

const PKG_TONES = [
  { color: "#6E5CF3", bg: "#F2EFFE" },
  { color: "#0E8A94", bg: "#E6FBFC" },
  { color: "#B87708", bg: "#FEF4E3" },
  { color: "#0B8F63", bg: "#E9FBF2" },
  { color: "#8250DF", bg: "#F3EEFF" },
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return mod > 0 ? h % mod : 0;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "–";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Derived series helpers
// ---------------------------------------------------------------------------

function computeDelta(series: number[]): { up: boolean; pct: number } | null {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (prev === 0 && last === 0) return null;
  const pct = prev > 0 ? ((last - prev) / prev) * 100 : last > 0 ? 100 : 0;
  return { up: pct >= 0, pct: Math.abs(pct) };
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function DeltaBadge({ delta, size = "md" }: { delta: { up: boolean; pct: number } | null; size?: "md" | "sm" }) {
  if (!delta) return null;
  const style: CSSProperties = delta.up
    ? { color: "#0E9E63", background: "#EAFBF3" }
    : { color: "#C05470", background: "#FBEEF1" };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[9px] font-bold ${
        size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-2.5 py-1.5 text-[11.5px]"
      } ${numberFont}`}
      style={style}
    >
      {delta.up ? "▲" : "▼"} {delta.pct.toFixed(0)}%
    </span>
  );
}

function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  // Design shows a green "Godkänd" pill; open falls back to amber.
  const map: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    approved: { label: "Godkänd", color: "#0E9E63", bg: "#E9FBF2", border: "#D6F5E5", dot: "#12b371" },
    paid: { label: "Utbetald", color: "#0E9E63", bg: "#E9FBF2", border: "#D6F5E5", dot: "#12b371" },
    open: { label: "Öppen", color: "#B87708", bg: "#FEF4E3", border: "#F6E7C6", dot: "#F59E0B" },
  };
  const m = map[status] ?? map.open;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[20px] px-3 py-1.5 text-[11.5px] font-bold ${className}`}
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function Chevron({ dir }: { dir: "l" | "r" }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === "l" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="#6A6683"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonthPill({ month, onChange }: { month: string; onChange: (next: string) => void }) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-[13px] bg-white p-[5px]"
      style={{ border: "1px solid #ECEAF5", boxShadow: "0 6px 16px -10px rgba(60,50,120,0.28)" }}
    >
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Föregående månad"
        className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors hover:bg-[#F5F4FB]"
      >
        <Chevron dir="l" />
      </button>
      <span className="min-w-[82px] px-2 text-center text-[13.5px] font-bold" style={{ color: INK.primary }}>
        {monthLabel(month)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Nästa månad"
        className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors hover:bg-[#F5F4FB]"
      >
        <Chevron dir="r" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline (design version: double stroke — soft glow + crisp line)
// ---------------------------------------------------------------------------

function MiniSparkline({ values, accent }: { values: number[]; accent: string }) {
  if (!values || values.length < 2 || Math.max(...values) <= 0) {
    return <div style={{ height: 32, marginTop: 14 }} />;
  }
  const w = 200;
  const h = 40;
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const rng = mx - mn || 1;
  const sx = w / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * sx).toFixed(1)} ${(h - 4 - ((v - mn) / rng) * (h - 8)).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 200 40"
      width="100%"
      preserveAspectRatio="none"
      style={{ display: "block", height: 32, marginTop: 14, overflow: "visible" }}
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={accent} strokeOpacity="0.15" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

function BigValue({ value, unit, size = 28 }: { value: string; unit: string; size?: number }) {
  return (
    <div
      className={numberFont}
      style={{ fontSize: size, fontWeight: 800, color: INK.primary, letterSpacing: "-1.1px", marginTop: 3 }}
    >
      {value} <span style={{ fontSize: 16, fontWeight: 700, color: INK.weak }}>{unit}</span>
    </div>
  );
}

function KpiCard({
  label,
  parts,
  delta,
  spark,
}: {
  label: string;
  parts: { value: string; unit: string };
  delta?: { up: boolean; pct: number } | null;
  spark?: { values: number[]; accent: string };
}) {
  return (
    <div style={{ ...cardBase, padding: "22px 24px" }}>
      {delta !== undefined && (
        <div className="flex h-[26px] items-center justify-end">
          <DeltaBadge delta={delta ?? null} />
        </div>
      )}
      <div style={{ fontSize: 12.5, fontWeight: 600, color: INK.mut, marginTop: 16 }}>{label}</div>
      <BigValue value={parts.value} unit={parts.unit} />
      {spark && <MiniSparkline values={spark.values} accent={spark.accent} />}
    </div>
  );
}

function NextTierCard({ figures }: { figures: SafeFigures }) {
  const atTop = figures.kvarTillNastaNiva == null;
  const rev = figures.revenueExVat;
  const kvar = figures.kvarTillNastaNiva ?? 0;
  const target = rev + kvar;
  const pct = atTop ? 100 : target > 0 ? Math.min(100, Math.max(0, (rev / target) * 100)) : 0;
  const parts = atTop ? { value: "0", unit: "kr" } : krParts(kvar);
  return (
    <div
      style={{
        background: "linear-gradient(155deg,#F6F3FF 0%,#FFFFFF 60%)",
        border: "1px solid #E7E2F8",
        borderRadius: 24,
        padding: "22px 24px",
        boxShadow: "0 1px 2px rgba(31,26,58,0.04), 0 20px 44px -26px rgba(109,94,246,0.4)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: INK.mut, marginTop: 16 }}>Kvar till nästa nivå</div>
      <BigValue value={parts.value} unit={parts.unit} />
      <div style={{ position: "relative", height: 7, borderRadius: 7, background: "#EAE5FA", marginTop: 14 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 7,
            background: "linear-gradient(90deg,#6E5CF3,#9E8CFF)",
            boxShadow: "0 3px 8px -2px rgba(109,94,246,0.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            transform: "translate(-50%,-50%)",
            width: 13,
            height: 13,
            borderRadius: "50%",
            background: "#fff",
            border: "3px solid #6E5CF3",
            boxShadow: "0 2px 6px -1px rgba(109,94,246,0.6)",
          }}
        />
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: INK.soft, marginTop: 8 }}>
        {atTop ? "Högsta nivån uppnådd" : `${formatKr(rev)} av ${formatKr(target)} mål`}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

function AnnualSalesChart({ points }: { points: TrendPoint[] }) {
  const gid = useId();
  const W = 640;
  const H = 240;
  const pad = 14;
  const rev = points.map((p) => p.revenue);
  const total = rev.reduce((a, b) => a + b, 0);
  const max = Math.max(...rev, 1) * 1.12;
  const n = Math.max(points.length, 2);
  const stepX = W / (n - 1);
  const pts = (points.length ? rev : [0, 0]).map((v, i) => {
    const x = i * stepX;
    const y = H - pad - (v / max) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const curIdx = pts.length - 1;
  const delta = computeDelta(rev);

  return (
    <div style={{ ...cardBase, padding: "24px 26px" }}>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: INK.primary, letterSpacing: "-0.4px" }}>
            Årlig försäljning
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: INK.soft, marginTop: 3 }}>
            Omsättning ex moms · senaste 12 månaderna
          </div>
        </div>
        <div className="text-right">
          <div
            className={numberFont}
            style={{ fontSize: 21, fontWeight: 800, color: INK.primary, letterSpacing: "-0.6px" }}
          >
            {formatKr(total)}
          </div>
          {delta && (
            <div style={{ fontSize: 11.5, fontWeight: 700, color: delta.up ? "#0E9E63" : "#C05470", marginTop: 2 }}>
              {delta.up ? "▲" : "▼"} {delta.pct.toFixed(0)}% mot förra månaden
            </div>
          )}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="none"
        style={{ display: "block", height: 240, overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT.violet} stopOpacity="0.24" />
            <stop offset="100%" stopColor={ACCENT.violet} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="60" x2={W} y2="60" stroke="#F0EFF7" strokeWidth="1" strokeDasharray="2 6" />
        <line x1="0" y1="120" x2={W} y2="120" stroke="#F0EFF7" strokeWidth="1" strokeDasharray="2 6" />
        <line x1="0" y1="180" x2={W} y2="180" stroke="#F0EFF7" strokeWidth="1" strokeDasharray="2 6" />
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={ACCENT.violet} strokeOpacity="0.12" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={line} fill="none" stroke={ACCENT.violet} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {pts[curIdx] && (
          <>
            <circle cx={pts[curIdx][0]} cy={pts[curIdx][1]} r="10" fill={ACCENT.violet} fillOpacity="0.16" />
            <circle cx={pts[curIdx][0]} cy={pts[curIdx][1]} r="5" fill={ACCENT.violet} stroke="#fff" strokeWidth="2.5" />
          </>
        )}
      </svg>
      <div className="mt-2.5 flex justify-between">
        {points.map((p) => (
          <span key={p.month} style={{ fontSize: 10.5, fontWeight: 600, color: INK.weak }} className="capitalize">
            {monthShort(p.month)}
          </span>
        ))}
      </div>
    </div>
  );
}

function compactK(v: number): string {
  if (v <= 0) return "";
  return `${(v / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}k`;
}

function CommissionBarChart({ points, compact = false }: { points: TrendPoint[]; compact?: boolean }) {
  const max = Math.max(...points.map((p) => p.commission), 1);
  return (
    <div
      className="flex items-end justify-between"
      style={{ gap: compact ? 7 : 10, height: compact ? 130 : "100%", minHeight: compact ? undefined : 200, paddingTop: compact ? 16 : 24 }}
    >
      {points.map((p) => {
        const ratio = p.commission / max;
        const height = `${(compact ? 10 : 12) + ratio * (compact ? 90 : 88)}%`;
        return (
          <div key={p.month} className="flex h-full flex-1 flex-col items-center justify-end" style={{ gap: compact ? 7 : 9 }}>
            {!compact && (
              <span
                className={numberFont}
                style={{ fontSize: 10, fontWeight: 700, color: "#8578E8", minHeight: 12 }}
              >
                {compactK(p.commission)}
              </span>
            )}
            <div
              style={{
                width: "100%",
                maxWidth: compact ? 16 : 22,
                borderRadius: compact ? 8 : 11,
                background: "linear-gradient(180deg,#7c6cf8,#d7d1fb)",
                height,
                boxShadow: compact ? "0 6px 12px -6px rgba(109,94,246,0.4)" : "0 8px 16px -8px rgba(109,94,246,0.45)",
              }}
              title={`${monthShort(p.month)}: ${formatKr(p.commission)}`}
            />
            <span style={{ fontSize: compact ? 9 : 10, fontWeight: 600, color: INK.weak }} className="capitalize">
              {monthShort(p.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customer table (desktop)
// ---------------------------------------------------------------------------

const TABLE_COLS = "1.3fr 1.4fr 1.1fr 0.9fr 1fr";

function customerDisplay(e: CommissionEntryItem): { name: string; company: string; pkg: string } {
  const name = e.customerName || e.companyName || (e.invoiceNumber != null ? `Faktura #${e.invoiceNumber}` : "Kund");
  const company = e.companyName && e.customerName ? e.companyName : e.companyName ? "" : "—";
  const pkg = e.packageName || "—";
  return { name, company, pkg };
}

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 38 ? 12 : 11,
        background: AVATAR_GRADS[hashIndex(name, AVATAR_GRADS.length)],
        fontSize: size >= 38 ? 12 : 12,
        boxShadow: "0 6px 12px -6px rgba(60,50,120,0.4)",
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

function PackageChip({ label }: { label: string }) {
  const tone = PKG_TONES[hashIndex(label, PKG_TONES.length)];
  return (
    <span
      className="justify-self-start"
      style={{ fontSize: 11.5, fontWeight: 700, color: tone.color, background: tone.bg, padding: "5px 11px", borderRadius: 9 }}
    >
      {label}
    </span>
  );
}

function CustomersTable({ entries, month }: { entries: CommissionEntryItem[]; month: string }) {
  const total = entries.reduce((a, e) => a + e.amountExVat, 0);
  return (
    <div style={{ ...cardBase, overflow: "hidden" }}>
      <div className="flex items-center justify-between" style={{ padding: "22px 28px 16px" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: INK.primary, letterSpacing: "-0.4px" }}>
            Kunder denna månad
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: INK.soft, marginTop: 3 }}>
            Affärer avslutade i {monthLabel(month)}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT.violet, background: "#F2EFFE", padding: "7px 13px", borderRadius: 10 }}>
          {entries.length} {entries.length === 1 ? "affär" : "affärer"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: "10px 28px 28px", fontSize: 13, color: INK.mut }}>Inga affärer avslutade denna månad.</div>
      ) : (
        <>
          <div
            className="grid"
            style={{ gridTemplateColumns: TABLE_COLS, padding: "0 28px 10px", borderBottom: "1px solid #F1EFF8" }}
          >
            {["Kund", "Företag", "Paket", "Säljdatum"].map((h) => (
              <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: INK.weak, letterSpacing: "0.6px" }} className="uppercase">
                {h}
              </span>
            ))}
            <span style={{ fontSize: 10.5, fontWeight: 700, color: INK.weak, letterSpacing: "0.6px", textAlign: "right" }} className="uppercase">
              Belopp ex moms
            </span>
          </div>

          {entries.map((e, i) => {
            const d = customerDisplay(e);
            return (
              <div
                key={`${e.invoiceId}-${i}`}
                className="grid items-center transition-colors hover:bg-[#FBFAFE]"
                style={{ gridTemplateColumns: TABLE_COLS, padding: "15px 28px", borderBottom: "1px solid #F7F6FB" }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={d.name} size={34} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: INK.primary }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: INK.secondary }}>{d.company}</span>
                <PackageChip label={d.pkg} />
                <span className={numberFont} style={{ fontSize: 13, fontWeight: 500, color: INK.secondary }}>
                  {dayMonth(e.paidAt)}
                </span>
                <span className={numberFont} style={{ fontSize: 13.5, fontWeight: 700, color: INK.primary, textAlign: "right" }}>
                  {formatKr(e.amountExVat)}
                </span>
              </div>
            );
          })}

          <div
            className="grid items-center"
            style={{ gridTemplateColumns: TABLE_COLS, padding: "16px 28px", background: "linear-gradient(180deg,#FBFAFE,#F7F5FD)" }}
          >
            <span style={{ gridColumn: "1 / 4", fontSize: 12.5, fontWeight: 700, color: INK.mut }}>Totalt</span>
            <span />
            <span
              className={numberFont}
              style={{ fontSize: 15.5, fontWeight: 800, color: ACCENT.violet, textAlign: "right", letterSpacing: "-0.3px" }}
            >
              {formatKr(total)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile view
// ---------------------------------------------------------------------------

function MobileView({
  figures,
  entries,
  bars,
  month,
  onMonth,
  heroDelta,
}: {
  figures: SafeFigures;
  entries: CommissionEntryItem[];
  bars: TrendPoint[];
  month: string;
  onMonth: (m: string) => void;
  heroDelta: { up: boolean; pct: number } | null;
}) {
  const atTop = figures.kvarTillNastaNiva == null;
  const rev = figures.revenueExVat;
  const kvar = figures.kvarTillNastaNiva ?? 0;
  const target = rev + kvar;
  const pct = atTop ? 100 : target > 0 ? Math.min(100, Math.max(0, (rev / target) * 100)) : 0;
  const revP = krParts(rev);

  const miniCards: { label: string; parts: { value: string; unit: string } }[] = [
    { label: "Intjänad provision", parts: krParts(figures.earnedCommission) },
    { label: "Provisionsnivå", parts: pctParts(figures.tierRatePercent) },
    { label: "Utbetald provision", parts: krParts(figures.paidCommission) },
    { label: "Ej utbetald provision", parts: krParts(figures.unpaidCommission) },
  ];

  return (
    <div className="lg:hidden" style={{ paddingBottom: 24 }}>
      {/* top bar */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK.mut }}>Välkommen tillbaka,</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: INK.primary, letterSpacing: "-0.6px" }}>Mina siffror</div>
        </div>
        {figures.periodExists && <StatusPill status={figures.status} />}
      </div>

      {/* month */}
      <div className="mb-4 flex items-center justify-end">
        <MonthPill month={month} onChange={onMonth} />
      </div>

      {/* hero card */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(150deg,#2E2748 0%,#453B72 100%)",
          borderRadius: 26,
          padding: 22,
          boxShadow: "0 24px 44px -20px rgba(60,50,120,0.75)",
          marginBottom: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -30,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "radial-gradient(circle,rgba(158,140,255,0.4),transparent 70%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#C6C0E4" }}>Betald omsättning ex moms</div>
          <div className={numberFont} style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-1.2px", marginTop: 5 }}>
            {revP.value} <span style={{ fontSize: 20, color: "#9d95cc" }}>{revP.unit}</span>
          </div>
          <div className="flex items-center gap-2" style={{ minHeight: 22, marginTop: 10 }}>
            {heroDelta && (
              <>
                <span
                  className={numberFont}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: heroDelta.up ? "#7BE8B3" : "#F6A6BC",
                    background: heroDelta.up ? "rgba(123,232,179,0.15)" : "rgba(246,166,188,0.15)",
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  {heroDelta.up ? "▲" : "▼"} {heroDelta.pct.toFixed(0)}%
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: "#9d95cc" }}>mot förra månaden</span>
              </>
            )}
          </div>
          <div style={{ position: "relative", height: 7, borderRadius: 7, background: "rgba(255,255,255,0.16)", marginTop: 8 }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 7, background: "linear-gradient(90deg,#9E8CFF,#d4ccff)" }} />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${pct}%`,
                transform: "translate(-50%,-50%)",
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}
            />
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#9d95cc", marginTop: 8 }}>
            {atTop ? "Högsta nivån uppnådd" : `${formatKr(kvar)} till nästa nivå`}
          </div>
        </div>
      </div>

      {/* 2x2 KPI */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {miniCards.map((c) => (
          <div key={c.label} style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 18, padding: 15, boxShadow: "0 1px 2px rgba(31,26,58,0.04), 0 14px 30px -22px rgba(74,58,130,0.3)" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: INK.mut }}>{c.label}</div>
            <div className={numberFont} style={{ fontSize: 19, fontWeight: 800, color: INK.primary, letterSpacing: "-0.5px" }}>
              {c.parts.value} {c.parts.unit}
            </div>
          </div>
        ))}
      </div>

      {/* commission chart */}
      <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: 18, marginBottom: 16, boxShadow: "0 1px 2px rgba(31,26,58,0.04), 0 14px 30px -22px rgba(74,58,130,0.3)" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: INK.primary }}>Provision per månad</div>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: INK.soft, marginBottom: 6 }}>Senaste 8 månaderna</div>
        <CommissionBarChart points={bars} compact />
      </div>

      {/* customers list */}
      <div style={{ background: "#fff", border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: 18, boxShadow: "0 1px 2px rgba(31,26,58,0.04), 0 14px 30px -22px rgba(74,58,130,0.3)" }}>
        <div className="mb-2.5 flex items-center justify-between">
          <div style={{ fontSize: 14, fontWeight: 800, color: INK.primary }}>Kunder denna månad</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT.violet, background: "#F2EFFE", padding: "5px 10px", borderRadius: 9 }}>
            {entries.length} {entries.length === 1 ? "affär" : "affärer"}
          </span>
        </div>
        {entries.length === 0 ? (
          <div style={{ fontSize: 12.5, color: INK.mut, padding: "8px 0" }}>Inga affärer avslutade denna månad.</div>
        ) : (
          entries.map((e, i) => {
            const d = customerDisplay(e);
            return (
              <div key={`${e.invoiceId}-${i}`} className="flex items-center gap-3" style={{ padding: "12px 0", borderTop: "1px solid #F5F4FB" }}>
                <Avatar name={d.name} size={38} />
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 13, fontWeight: 700, color: INK.primary }}>{d.name}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: INK.soft }} className="truncate">
                    {[d.company !== "—" ? d.company : null, d.pkg !== "—" ? d.pkg : null].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className={numberFont} style={{ fontSize: 13, fontWeight: 800, color: INK.primary }}>{formatKr(e.amountExVat)}</div>
                  <div className={numberFont} style={{ fontSize: 10.5, fontWeight: 500, color: INK.weak }}>{dayMonth(e.paidAt)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data shaping
// ---------------------------------------------------------------------------

type SafeFigures = CommissionFigures;

const ZERO_FIGURES: SafeFigures = {
  periodExists: false,
  periodId: null,
  status: "open",
  dynamic: true,
  revenueExVat: 0,
  tierRatePercent: 0,
  earnedCommission: 0,
  adjustments: 0,
  finalCommission: 0,
  paidCommission: 0,
  unpaidCommission: 0,
  kvarTillNastaNiva: null,
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/**
 * "Mina siffror" — the logged-in user's OWN commission panel, rebuilt from the
 * design_handoff_mina_siffror spec. Self-contained: owns its month + fetches
 * its own (self-scoped, RLS-guarded) data. Embedded on /admin for any
 * commission-eligible user.
 */
export function MyCommission({ initialMonth }: { initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [figures, setFigures] = useState<SafeFigures>(ZERO_FIGURES);
  const [entries, setEntries] = useState<CommissionEntryItem[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      const [summary, breakdown, tr] = await Promise.all([
        getMyCommissionSummary(month),
        getMyCommissionBreakdown(month),
        getSalesTrend("me", month, 12),
      ]);
      if (!active) return;
      if (!summary.ok) {
        setError(summary.error ?? "Kunde inte hämta dina siffror");
        setFigures(ZERO_FIGURES);
      } else {
        setFigures(summary.figures ?? ZERO_FIGURES);
      }
      setEntries(breakdown.ok ? breakdown.entries ?? [] : []);
      setTrend(tr.ok ? tr.points ?? [] : []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [month]);

  // Derived series
  const revSeries = trend.map((p) => p.revenue);
  const commSeries = trend.map((p) => p.commission);
  const rateSeries = trend.map((p) => (p.revenue > 0 ? (p.commission / p.revenue) * 100 : 0));
  const spark = (s: number[]) => s.slice(-8);
  const bars = trend.slice(-8);

  const monthControl = <MonthPill month={month} onChange={setMonth} />;

  return (
    <section className="[font-family:var(--font-jakarta)]" style={{ color: INK.primary }}>
      {/* ============ DESKTOP ============ */}
      <div className="hidden lg:block">
        {/* Header row */}
        <header className="mb-[30px] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: INK.primary, letterSpacing: "-0.9px" }}>
                Mina siffror
              </h1>
              {figures.periodExists && <StatusPill status={figures.status} />}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, fontWeight: 500, color: INK.mut }}>
              Din personliga försäljning &amp; provision
            </p>
          </div>
          {monthControl}
        </header>

        {error && (
          <div className="mb-5 rounded-2xl px-5 py-4 text-sm" style={{ background: "#FBEEF1", color: "#C05470", border: "1px solid #F5D7DE" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ ...cardBase, padding: 40 }} className="text-center text-[13.5px]" >
            <span style={{ color: INK.mut }}>Laddar…</span>
          </div>
        ) : (
          <>
            {/* KPI grid — 6 cards */}
            <div className="mb-[22px] grid gap-[22px]" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              <KpiCard
                label="Betald omsättning ex moms"
                parts={krParts(figures.revenueExVat)}
                delta={computeDelta(revSeries)}
                spark={{ values: spark(revSeries), accent: ACCENT.violet }}
              />
              <KpiCard
                label="Intjänad provision"
                parts={krParts(figures.earnedCommission)}
                delta={computeDelta(commSeries)}
                spark={{ values: spark(commSeries), accent: ACCENT.purple }}
              />
              <KpiCard
                label="Aktuell provisionsnivå"
                parts={pctParts(figures.tierRatePercent)}
                spark={{ values: spark(rateSeries), accent: ACCENT.teal }}
              />
              <KpiCard label="Utbetald provision" parts={krParts(figures.paidCommission)} />
              <KpiCard label="Ej utbetald provision" parts={krParts(figures.unpaidCommission)} />
              <NextTierCard figures={figures} />
            </div>

            {/* Charts row */}
            <div className="mb-[22px] grid gap-[22px]" style={{ gridTemplateColumns: "1.55fr 1fr" }}>
              <AnnualSalesChart points={trend} />
              <div style={{ ...cardBase, padding: "24px 26px", display: "flex", flexDirection: "column" }}>
                <div className="mb-1.5">
                  <div style={{ fontSize: 16, fontWeight: 800, color: INK.primary, letterSpacing: "-0.4px" }}>
                    Provision per månad
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: INK.soft, marginTop: 3 }}>Senaste 8 månaderna</div>
                </div>
                <div className="flex-1">
                  <CommissionBarChart points={bars} />
                </div>
              </div>
            </div>

            {/* Customers */}
            <CustomersTable entries={entries} month={month} />
          </>
        )}
      </div>

      {/* ============ MOBILE ============ */}
      {!loading && (
        <MobileView
          figures={figures}
          entries={entries}
          bars={bars}
          month={month}
          onMonth={setMonth}
          heroDelta={computeDelta(revSeries)}
        />
      )}
      {loading && (
        <div className="lg:hidden" style={{ ...cardBase, padding: 40, textAlign: "center" }}>
          <span style={{ color: INK.mut, fontSize: 13.5 }}>Laddar…</span>
        </div>
      )}
    </section>
  );
}
