"use client";

// Server-only packages (xlsx, fast-xml-parser) are intentionally NOT imported here.
// All file parsing happens in the API routes.

import { useState, useRef } from "react";

interface PreviewSummary {
  total: number;
  valid: number;
  missing_required: number;
  duplicates: number;
  to_import: number;
  display_name?: string;
}

interface ImportResult {
  inserted: number;
  skipped: number;
}

type Step = "idle" | "analyzing" | "preview" | "confirming" | "done" | "error";

const MAX_FILE_BYTES = 3 * 1024 * 1024;

interface ImportLeadsCardProps {
  onDone?: () => void;
}

export default function ImportLeadsCard({ onDone }: ImportLeadsCardProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [defaultCategory, setDefaultCategory] = useState<string>("");
  const [maxRows, setMaxRows] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setStep("idle");
    setError(null);
    setSummary(null);
    setToken(null);
    setResult(null);
    setDisplayName("");
    setDefaultCategory("");
    setMaxRows("");
    if (inputRef.current) inputRef.current.value = "";
  }

  // resetForNewFile resets analysis state but keeps displayName and the input's visual state
  function resetForNewFile() {
    setFile(null);
    setStep("idle");
    setError(null);
    setSummary(null);
    setToken(null);
    setResult(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    resetForNewFile();
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError("Filen är för stor (max 3 MB)");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(f);
  }

  async function handleAnalyze() {
    if (!file) return;
    setStep("analyzing");
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("displayName", displayName.trim());
    if (defaultCategory.trim()) fd.append("defaultCategory", defaultCategory.trim().slice(0, 100));
    if (maxRows.trim()) fd.append("maxRows", maxRows.trim());

    try {
      const res = await fetch("/api/import/leads/preview", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string; summary?: PreviewSummary; token?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Fel vid analys");
        setStep("error");
        return;
      }
      setSummary(data.summary!);
      setToken(data.token!);
      setStep("preview");
    } catch {
      setError("Nätverksfel — försök igen");
      setStep("error");
    }
  }

  async function handleConfirm() {
    if (!token) return;
    setStep("confirming");
    setError(null);

    try {
      const res = await fetch("/api/import/leads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { error?: string; inserted?: number; skipped?: number };
      if (!res.ok || data.error) {
        setError(data.error ?? "Fel vid import");
        setStep("error");
        return;
      }
      setResult({ inserted: data.inserted ?? 0, skipped: data.skipped ?? 0 });
      setStep("done");
      onDone?.();
    } catch {
      setError("Nätverksfel — försök igen");
      setStep("error");
    }
  }

  const isLoading = step === "analyzing" || step === "confirming";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Import leads</h2>
      <p className="text-gray-500 text-sm mb-5">
        Importera leads från fil direkt till CRM. Stödda format: XLSX, CSV, XML · Max 1 000 rader · Max 3 MB.
      </p>

      {/* ── Done state ──────────────────────────────────────────────────────── */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-green-800">Import klar</p>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Importerade leads</span>
                <span className="font-bold text-green-900">{result.inserted}</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Hoppade över (nya dubletter)</span>
                  <span className="font-medium text-green-700">{result.skipped}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
          >
            Importera fler
          </button>
        </div>
      )}

      {/* ── Active states ────────────────────────────────────────────────────── */}
      {step !== "done" && (
        <div className="space-y-4">
          {/* Import name */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">
              Importnamn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 100))}
              disabled={isLoading || step === "preview"}
              placeholder="t.ex. Bygg Leads Stockholm Maj 2026"
              maxLength={100}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{displayName.length}/100</p>
          </div>

          {/* Default category override */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">
              Kategori <span className="text-red-500">*</span>

            </label>
            <input
              type="text"
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value.slice(0, 100))}
              disabled={isLoading || step === "preview"}
              placeholder="t.ex. Herrfrisör, Restaurang, E-handel"
              maxLength={100}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            />
          </div>

          {/* Max rows limit */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">
              Max antal leads
              <span className="ml-1 text-gray-400 font-normal">— lämna tomt för hela listan</span>
            </label>
            <input
              type="number"
              value={maxRows}
              onChange={(e) => setMaxRows(e.target.value)}
              disabled={isLoading || step === "preview"}
              placeholder="t.ex. 50"
              min={1}
              max={1000}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            />
          </div>

          {/* File input */}
          <div>
            <label className="block text-sm text-gray-700 mb-1.5 font-medium">
              Välj fil
              <span className="ml-1 text-gray-400 font-normal">.xlsx · .csv · .xml</span>
            </label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,.xml"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-600
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 file:transition-colors
                disabled:opacity-50 cursor-pointer"
            />
          </div>

          {/* Analyse button */}
          {file && displayName.trim().length > 0 && defaultCategory.trim().length > 0 && (step === "idle" || step === "error") && (
            <button
              onClick={handleAnalyze}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Analysera fil
            </button>
          )}

          {/* Analyzing spinner */}
          {step === "analyzing" && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
              <svg className="animate-spin h-4 w-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyserar fil...
            </div>
          )}

          {/* Preview summary */}
          {step === "preview" && summary && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Förhandsvisning</p>
              {summary && summary.display_name && (
                <p className="text-xs text-blue-600 font-medium truncate -mt-1">{summary.display_name}</p>
              )}

              <div className="space-y-1.5 text-sm">
                <Row label="Totalt rader i fil" value={summary.total} />
                <Row label="Giltiga rader" value={summary.valid} color="text-gray-900" />
                {summary.missing_required > 0 && (
                  <Row label="Saknar obligatoriska fält" value={summary.missing_required} color="text-amber-600" />
                )}
                {summary.duplicates > 0 && (
                  <Row label="Dubletter (hoppas över)" value={summary.duplicates} color="text-slate-500" />
                )}
              </div>

              <div className="border-t border-gray-200 pt-3">
                {summary.to_import === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Inga nya leads att importera — alla är dubletter eller saknar obligatoriska fält.
                    </p>
                    <button
                      onClick={reset}
                      className="px-4 py-2 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                    >
                      Rensa
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-900">
                      Importerar{" "}
                      <span className="text-blue-600">{summary.to_import}</span> leads
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        Importera {summary.to_import} leads
                      </button>
                      <button
                        onClick={reset}
                        className="px-4 py-2 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirming spinner */}
          {step === "confirming" && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
              <svg className="animate-spin h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importerar leads...
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  color = "text-gray-600",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
