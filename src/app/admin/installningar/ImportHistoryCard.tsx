"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface Batch {
  id: string;
  created_at: string;
  display_name: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  total_rows: number;
  imported_rows: number;
  duplicate_rows: number;
}

interface PreviewSummary {
  total: number;
  valid: number;
  missing_required: number;
  duplicates: number;
  to_import: number;
  display_name?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const TYPE_COLORS: Record<string, string> = {
  xlsx: "bg-green-50 text-green-700 border-green-200",
  csv: "bg-blue-50 text-blue-700 border-blue-200",
  xml: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function ImportHistoryCard() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessId, setReprocessId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ token: string; summary: PreviewSummary } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("lead_import_batches")
      .select("id, created_at, display_name, original_filename, file_type, file_size, storage_path, total_rows, imported_rows, duplicate_rows")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setBatches((data as Batch[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function handleReprocess(batchId: string) {
    setReprocessId(batchId);
    setPreview(null);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/import/leads/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json() as { error?: string; token?: string; summary?: PreviewSummary };
      if (!res.ok || data.error) {
        setError(data.error ?? "Fel vid förberedelse");
        setReprocessId(null);
        return;
      }
      setPreview({ token: data.token!, summary: data.summary! });
    } catch {
      setError("Nätverksfel — försök igen");
      setReprocessId(null);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/import/leads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: preview.token }),
      });
      const data = await res.json() as { error?: string; inserted?: number; skipped?: number };
      if (!res.ok || data.error) {
        setError(data.error ?? "Fel vid import");
        setConfirming(false);
        return;
      }
      setResult({ inserted: data.inserted ?? 0, skipped: data.skipped ?? 0 });
      setPreview(null);
      setReprocessId(null);
    } catch {
      setError("Nätverksfel — försök igen");
    }
    setConfirming(false);
  }

  function cancelReprocess() {
    setReprocessId(null);
    setPreview(null);
    setError(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/import/leads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: deleteTarget.id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok || data.error) {
        setDeleteTarget(null);
        setError(data.error ?? "Kunde inte radera importen — försök igen");
        setDeleting(false);
        return;
      }
      setBatches(prev => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteTarget(null);
      setError("Nätverksfel — försök igen");
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Importhistorik</h2>
        <p className="text-sm text-gray-400">Laddar...</p>
      </div>
    );
  }

  if (batches.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Importhistorik</h2>
      <p className="text-gray-500 text-sm mb-5">Tidigare importerade listor — importera samma fil igen med ny dubblettfiltrering.</p>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {result && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Importerade {result.inserted} leads{result.skipped > 0 ? `, ${result.skipped} dubletter hoppades över` : ""}.
        </div>
      )}

      <div className="space-y-3">
        {batches.map((batch) => {
          const isActive = reprocessId === batch.id;
          return (
            <div key={batch.id} className={`border rounded-xl transition-colors ${isActive ? "border-blue-200 bg-blue-50/30" : "border-gray-100"}`}>
              {/* Batch row */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{batch.display_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{formatDate(batch.created_at)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${TYPE_COLORS[batch.file_type] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {batch.file_type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">{formatBytes(batch.file_size)}</span>
                    <span className="text-xs text-gray-500">{batch.imported_rows} importerade</span>
                    {batch.duplicate_rows > 0 && (
                      <span className="text-xs text-gray-400">{batch.duplicate_rows} dubletter</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{batch.original_filename}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isActive ? (
                    <button
                      onClick={() => handleReprocess(batch.id)}
                      disabled={!!reprocessId || !batch.storage_path}
                      title={!batch.storage_path ? "Ingen fil sparad för denna import — ladda upp filen på nytt via Import leads" : undefined}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600"
                    >
                      Importera igen
                    </button>
                  ) : (
                    <button onClick={cancelReprocess} className="px-3 py-1.5 text-gray-400 hover:text-gray-600 rounded-lg text-xs transition-colors">
                      Avbryt
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(batch)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Radera import"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Inline preview */}
              {isActive && !preview && (
                <div className="px-4 pb-4 flex items-center gap-2 text-sm text-gray-500">
                  <svg className="animate-spin h-4 w-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Förbereder re-import...
                </div>
              )}

              {isActive && preview && (
                <div className="px-4 pb-4 space-y-3 border-t border-blue-100 pt-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Totalt rader</span><span className="font-medium">{preview.summary.total}</span></div>
                    {preview.summary.missing_required > 0 && (
                      <div className="flex justify-between"><span className="text-gray-500">Saknar obligatoriska fält</span><span className="font-medium text-amber-600">{preview.summary.missing_required}</span></div>
                    )}
                    {preview.summary.duplicates > 0 && (
                      <div className="flex justify-between"><span className="text-gray-500">Dubletter (hoppas över)</span><span className="font-medium text-gray-400">{preview.summary.duplicates}</span></div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-blue-100">
                      <span className="font-semibold text-gray-700">Importerar</span>
                      <span className="font-bold text-blue-600">{preview.summary.to_import} leads</span>
                    </div>
                  </div>

                  {preview.summary.to_import === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Inga nya leads — alla finns redan i systemet.
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {confirming ? "Importerar..." : `Importera ${preview.summary.to_import} leads`}
                      </button>
                      <button onClick={cancelReprocess} className="px-3 py-2 text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs transition-colors">
                        Avbryt
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* ── Delete confirmation modal ─────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Radera import?</h3>
                <p className="text-sm text-gray-500 mt-0.5">Denna åtgärd kan inte ångras.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-1">
              <span className="font-medium">{deleteTarget.display_name}</span>
            </p>
            <p className="text-xs text-gray-400 mb-5">
              Importerade leads påverkas inte — bara historikposten tas bort.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? "Raderar..." : "Radera"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
