"use client";

import { useState, useTransition } from "react";
import { adminDomainDiagnostics } from "./actions";
import type { AdminAvailabilityDiagnostics } from "@/lib/domains/search-service";

const COMMON_TLDS = ["se", "nu", "com", "net", "org"];

export default function DomainDiagnosticsClient() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["se", "com"]));
  const [data, setData] = useState<AdminAvailabilityDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (t: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });

  const run = () => {
    const q = query.trim();
    if (!q) return setError("Ange en domän eller ett sökord.");
    startTransition(async () => {
      setError(null);
      const res = await adminDomainDiagnostics({ query: q, tlds: [...selected] });
      if (!res.ok) {
        setData(null);
        setError(res.error);
        return;
      }
      setData(res.data);
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="intenzze eller intenzze.se"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <button
            onClick={run}
            disabled={pending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Söker…" : "Slå upp"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMMON_TLDS.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selected.has(t)
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 text-gray-500 hover:bg-gray-50"
              }`}
            >
              .{t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <>
          {data.rateLimit && (
            <p className="text-xs text-gray-500">
              Hostup rate-limit: {data.rateLimit.remaining ?? "?"}/{data.rateLimit.limit ?? "?"}
              {data.rateLimit.reset ? ` (reset ${data.rateLimit.reset})` : ""}
            </p>
          )}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Domän</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">State</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Premium / avgift</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Perioder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.results.map((r) => (
                  <tr key={r.name}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{r.state}</span>
                      <div className="text-xs text-gray-400">
                        reg: {String(r.actions.canRegister.allowed)} / transfer:{" "}
                        {String(r.actions.canTransfer.allowed)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.premium ? "premium" : "nej"}
                      {r.requiresRegistrarFeeAcceptance ? " · registraravgift" : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.supportedRegisterYears.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            Tillgänglighetsdata från Hostup. Kundpris konfigureras under{" "}
            <a href="/admin/domaner/priser" className="underline hover:text-gray-600">
              Priser
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
