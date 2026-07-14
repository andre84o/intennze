"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  getMyCommissionSummary,
  getMyCommissionBreakdown,
  getCompanyCommissionOverview,
  getSalespeopleCommission,
  approvePeriod,
  markPeriodPaid,
  createAdjustment,
  getInvoiceBacking,
  type CommissionFigures,
  type CommissionEntryItem,
  type CommissionAdjustmentItem,
  type CompanyCommissionOverviewResult,
  type SalespersonCommissionRow,
} from "./actions";

// ---------------------------------------------------------------------------
// Formatting (mirrors fakturering: integer-friendly SEK; commission may carry
// öre so we allow up to 2 decimals but drop them when whole).
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

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map((v) => parseInt(v, 10));
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  open: { label: "Öppen", className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Godkänd", className: "bg-blue-100 text-blue-700 border-blue-200" },
  paid: { label: "Utbetald", className: "bg-green-100 text-green-700 border-green-200" },
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared modal shell (StaffClient pattern, replicated locally).
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white shadow-xl flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-none">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-none">
          {footer}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month selector
// ---------------------------------------------------------------------------

function MonthSelector({
  month,
  onChange,
}: {
  month: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Föregående månad"
      >
        ◀
      </button>
      <span className="min-w-[9rem] text-center text-sm font-medium text-gray-900 capitalize">
        {monthLabel(month)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Nästa månad"
      >
        ▶
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

function Metric({
  label,
  value,
  accent = "gray",
}: {
  label: string;
  value: string;
  accent?: "gray" | "blue" | "green" | "amber" | "purple";
}) {
  const accents: Record<string, string> = {
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={`p-4 border rounded-xl shadow-sm ${accents[accent]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Mina siffror" — self-scoped section (staff + eligible admin)
// ---------------------------------------------------------------------------

function MyNumbersSection({ month }: { month: string }) {
  const [figures, setFigures] = useState<CommissionFigures | null>(null);
  const [entries, setEntries] = useState<CommissionEntryItem[]>([]);
  const [adjustments, setAdjustments] = useState<CommissionAdjustmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      const [summary, breakdown] = await Promise.all([
        getMyCommissionSummary(month),
        getMyCommissionBreakdown(month),
      ]);
      if (!active) return;
      if (!summary.ok) {
        setError(summary.error ?? "Kunde inte hämta dina siffror");
      } else {
        setFigures(summary.figures ?? null);
      }
      if (breakdown.ok) {
        setEntries(breakdown.entries ?? []);
        setAdjustments(breakdown.adjustments ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [month]);

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Mina siffror</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Laddar…</div>
      ) : !figures || !figures.periodExists ? (
        <div className="p-6 bg-white border border-gray-200 rounded-xl text-gray-500">
          Ingen period ännu för {monthLabel(month)}.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={figures.status} />
            {figures.dynamic && (
              <span className="text-xs text-gray-400">Preliminära siffror</span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Metric
              label="Betald omsättning ex moms"
              value={formatCurrency(figures.revenueExVat)}
              accent="blue"
            />
            <Metric label="Aktuell nivå" value={formatPercent(figures.tierRatePercent)} accent="purple" />
            <Metric
              label="Intjänad"
              value={formatCurrency(figures.earnedCommission)}
              accent="gray"
            />
            <Metric
              label="Utbetald"
              value={formatCurrency(figures.paidCommission)}
              accent="green"
            />
            <Metric
              label="Ej utbetald"
              value={formatCurrency(figures.unpaidCommission)}
              accent="amber"
            />
            <Metric
              label="Kvar till nästa nivå"
              value={
                figures.kvarTillNastaNiva == null
                  ? "Högsta nivån"
                  : formatCurrency(figures.kvarTillNastaNiva)
              }
              accent="gray"
            />
          </div>

          <IncludedInvoicesTable entries={entries} />
          <AdjustmentsTable adjustments={adjustments} />
        </>
      )}
    </section>
  );
}

function IncludedInvoicesTable({ entries }: { entries: CommissionEntryItem[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Inkluderade fakturor</h3>
      </div>
      {entries.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">Inga fakturor denna period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Faktura #</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Betald</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Ex moms</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Moms</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Totalt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.invoiceId}>
                  <td className="px-4 py-2 font-mono text-sm">
                    {e.invoiceNumber != null ? `#${e.invoiceNumber}` : "–"}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">{formatDate(e.paidAt)}</td>
                  <td className="px-4 py-2 text-sm text-right">{formatCurrency(e.amountExVat)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-500">
                    {formatCurrency(e.vatAmount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-medium">
                    {formatCurrency(e.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdjustmentsTable({ adjustments }: { adjustments: CommissionAdjustmentItem[] }) {
  if (adjustments.length === 0) return null;
  const typeLabel = (t: string | null) =>
    ADJUSTMENT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t ?? "–";
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Justeringar</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Typ</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Anledning</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Datum</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Belopp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {adjustments.map((a, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-sm">{typeLabel(a.adjustmentType)}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{a.reason ?? "–"}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{formatDate(a.createdAt)}</td>
                <td
                  className={`px-4 py-2 text-sm text-right font-medium ${
                    a.amount < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(a.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company overview (admin only)
// ---------------------------------------------------------------------------

function CompanySection({
  month,
  onToast,
}: {
  month: string;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const [overview, setOverview] = useState<CompanyCommissionOverviewResult | null>(null);
  const [rows, setRows] = useState<SalespersonCommissionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [adjustFor, setAdjustFor] = useState<SalespersonCommissionRow | null>(null);
  const [backingFor, setBackingFor] = useState<SalespersonCommissionRow | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ov, list] = await Promise.all([
      getCompanyCommissionOverview(month),
      getSalespeopleCommission(month),
    ]);
    if (!ov.ok) setError(ov.error ?? "Kunde inte hämta företagsöversikt");
    else setOverview(ov);
    if (list.ok) setRows(list.rows ?? []);
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
      if (!res.ok) {
        onToast("error", res.error ?? "Åtgärden misslyckades");
        return;
      }
      onToast("success", successMsg);
      await reload();
    });

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Företagsöversikt</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Laddar…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Metric
              label="Omsättning ex moms"
              value={formatCurrency(overview?.totalRevenueExVat)}
              accent="blue"
            />
            <Metric
              label="Intjänad provision"
              value={formatCurrency(overview?.totalFinalCommission)}
              accent="purple"
            />
            <Metric
              label="Utbetald"
              value={formatCurrency(overview?.totalPaidCommission)}
              accent="green"
            />
            <Metric
              label="Ej utbetald"
              value={formatCurrency(overview?.totalUnpaidCommission)}
              accent="amber"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">Säljare</h3>
            </div>
            {rows.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Ingen period ännu för {monthLabel(month)}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Säljare</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Omsättning</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Nivå</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Provision</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Ej utbetald</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r) => (
                      <tr key={r.userId}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{r.name}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {formatCurrency(r.revenueExVat)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-500">
                          {formatPercent(r.tierRatePercent)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {formatCurrency(r.finalCommission)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-amber-700">
                          {formatCurrency(r.unpaidCommission)}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() =>
                                r.periodId &&
                                runAction(
                                  () => approvePeriod(r.periodId as string),
                                  "Perioden godkändes"
                                )
                              }
                              disabled={pending || !r.periodId || r.status !== "open"}
                              className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Godkänn
                            </button>
                            <button
                              onClick={() =>
                                r.periodId &&
                                runAction(
                                  () => markPeriodPaid(r.periodId as string),
                                  "Perioden markerades som utbetald"
                                )
                              }
                              disabled={pending || !r.periodId || r.status !== "approved"}
                              className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Betala
                            </button>
                            <button
                              onClick={() => setBackingFor(r)}
                              disabled={!r.periodId}
                              className="px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                            >
                              Fakturor
                            </button>
                            <button
                              onClick={() => setAdjustFor(r)}
                              disabled={!r.periodId}
                              className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-40"
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

      {backingFor && backingFor.periodId && (
        <BackingModal seller={backingFor} onClose={() => setBackingFor(null)} />
      )}
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
          >
            Avbryt
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Skapa justering"}
          </button>
        </>
      }
    >
      {err && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {err}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ADJUSTMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Belopp (kr, negativt för avdrag)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="t.ex. -500"
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Anledning</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Backing (included invoices) modal (admin)
// ---------------------------------------------------------------------------

function BackingModal({
  seller,
  onClose,
}: {
  seller: SalespersonCommissionRow;
  onClose: () => void;
}) {
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
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
        >
          Stäng
        </button>
      }
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <div className="p-4 text-center text-gray-500">Laddar…</div>
      ) : (
        <IncludedInvoicesTable entries={entries} />
      )}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({
  toast,
  onClose,
}: {
  toast: { type: "success" | "error"; msg: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 ${
          toast.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        <span>{toast.msg}</span>
        <button onClick={onClose} className="opacity-80 hover:opacity-100">
          ✕
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function ProvisionClient({
  isAdmin,
  showMyNumbers,
  initialMonth,
}: {
  isAdmin: boolean;
  showMyNumbers: boolean;
  initialMonth: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className="text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 mt-1">Provision per månad</p>
        </div>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      {showMyNumbers && <MyNumbersSection month={month} />}

      {isAdmin && <CompanySection month={month} onToast={showToast} />}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
