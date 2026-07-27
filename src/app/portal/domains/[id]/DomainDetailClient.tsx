"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { refreshDomainStatus } from "../actions";
import { formatMinor } from "@/lib/domains/money";
import { DomainIcon, statusBadgeClass, attentionBadgeClass, formatDate } from "../ui";
import type { CustomerDomainDetail } from "@/lib/domains/portal-service";
import type { DomainStatusPresentation } from "@/lib/domains/status-presenter";
import type { AttentionSignal } from "@/lib/domains/attention";
import type { CustomerPriceView } from "@/lib/domains/pricing-service";

/** Live (refreshable) subset of the detail view. */
type LiveState = {
  status: DomainStatusPresentation;
  attentionPrimary: AttentionSignal | null;
  needsAttention: boolean;
  expiresAt: string | null;
  autoRenew: boolean;
  nameservers: string[];
  source: "live" | "cache";
  liveUnavailable: boolean;
  refreshedAt: string | null;
};

function priceLine(view: CustomerPriceView, currency: string): string {
  if (view.premiumRequiresManualPrice) return "Premium – bekräftas manuellt";
  if (view.priceConfigured && view.net) {
    return `${formatMinor(view.net.netAmountMinor, currency)} exkl. moms (${formatMinor(
      view.net.grossAmountMinor,
      currency
    )} inkl. moms)`;
  }
  return "Pris ej konfigurerat";
}

export default function DomainDetailClient({ detail }: { detail: CustomerDomainDetail }) {
  const [live, setLive] = useState<LiveState>({
    status: detail.status,
    attentionPrimary: detail.attention.needsAttention ? detail.attention.primary : null,
    needsAttention: detail.attention.needsAttention,
    expiresAt: detail.expiresAt,
    autoRenew: detail.autoRenew,
    nameservers: detail.nameservers,
    source: detail.source,
    liveUnavailable: detail.liveUnavailable,
    refreshedAt: null,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onRefresh = () => {
    startTransition(async () => {
      setMessage(null);
      const res = await refreshDomainStatus(detail.id);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      const d = res.data;
      setLive({
        status: d.status,
        attentionPrimary: d.needsAttention ? d.attentionPrimary : null,
        needsAttention: d.needsAttention,
        expiresAt: d.expiresAt,
        autoRenew: d.autoRenew,
        nameservers: d.nameservers,
        source: d.source,
        liveUnavailable: d.liveUnavailable,
        refreshedAt: d.refreshedAt,
      });
      setMessage(
        d.liveUnavailable
          ? "Kunde inte nå leverantören — visar senast kända uppgifter."
          : "Statusen är uppdaterad."
      );
    });
  };

  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">{detail.name}</h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
              live.status.tone
            )}`}
          >
            <DomainIcon name={live.status.icon} className="h-3.5 w-3.5" />
            {live.status.label}
          </span>
          <p className="text-sm text-slate-500">{live.status.description}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {detail.hostupLinked ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
              {pending ? "Uppdaterar…" : "Uppdatera status"}
            </button>
          ) : null}
          <p className="text-xs text-slate-400">
            {live.source === "live"
              ? "Live från leverantören"
              : "Senast kända uppgifter"}
          </p>
        </div>
      </div>

      {/* Refresh feedback (announced to screen readers) */}
      <div aria-live="polite" className="min-h-0">
        {message && (
          <p
            className={`rounded-lg border px-4 py-2 text-sm ${
              live.liveUnavailable
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {/* Attention */}
      {live.needsAttention && live.attentionPrimary && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${attentionBadgeClass(
            live.attentionPrimary.level
          )}`}
        >
          <DomainIcon name={live.attentionPrimary.icon} className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">{live.attentionPrimary.label}.</span>{" "}
            {live.attentionPrimary.message}
          </span>
        </div>
      )}

      {/* Facts */}
      <div className={card}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Uppgifter</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <Fact label="Registrerad" value={formatDate(detail.registeredAt)} />
          <Fact label="Går ut" value={formatDate(live.expiresAt)} />
          <Fact label="Autoförnyelse" value={live.autoRenew ? "På" : "Av"} />
          <Fact label="Låst (transferskydd)" value={detail.locked ? "Ja" : "Nej"} />
        </dl>
      </div>

      {/* Nameservers */}
      <div className={card}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Nameservrar</h2>
        {live.nameservers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Inga nameservrar registrerade.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {live.nameservers.map((ns) => (
              <li key={ns} className="font-mono">{ns}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Pricing */}
      <div className={card}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Pris</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-slate-500">Förnyelse</dt>
            <dd className="text-slate-900">{priceLine(detail.pricing.renewal, detail.currencyCode)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Registrering</dt>
            <dd className="text-slate-700">{priceLine(detail.pricing.registration, detail.currencyCode)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-400">Priser visas exklusive och inklusive moms.</p>
      </div>

      {/* Registrant (PII-safe) */}
      {detail.registrant.present && (
        <div className={card}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Ägaruppgifter</h2>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <Fact label="Organisation" value={detail.registrant.organization ?? "—"} />
            <Fact label="Land" value={detail.registrant.countryCode ?? "—"} />
            <Fact label="E-post" value={detail.registrant.maskedEmail ?? "—"} />
          </dl>
          <p className="mt-2 text-xs text-slate-400">
            Kontaktuppgifter visas maskerat av integritetsskäl.
          </p>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}
