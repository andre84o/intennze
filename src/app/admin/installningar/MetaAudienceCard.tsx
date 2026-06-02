"use client";

import { useEffect, useState } from "react";

// Predefined CRM funnel segments that map to Meta Custom Audiences. The status
// arrays mirror the server-side allowlist in /api/meta/audience/sync.
const SEGMENTS = [
  { key: "leads", label: "Leads (nya)", statuses: ["lead"] },
  { key: "contacted", label: "Kontaktade", statuses: ["contacted"] },
  { key: "negotiating", label: "Förhandling", statuses: ["negotiating"] },
  { key: "active", label: "Aktiva leads (lead + kontaktade + förhandling)", statuses: ["lead", "contacted", "negotiating"] },
  { key: "customers", label: "Kunder", statuses: ["customer"] },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

interface StoredAudience {
  audienceId: string;
  name: string;
}

interface SyncResult {
  success: boolean;
  audienceId?: string;
  created?: boolean;
  segmentSize?: number;
  matched?: number;
  numReceived?: number;
  numInvalid?: number;
  error?: string;
}

function storageKey(key: SegmentKey) {
  return `meta_audience_${key}`;
}

export default function MetaAudienceCard() {
  const [segment, setSegment] = useState<SegmentKey>("active");
  const [name, setName] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [stored, setStored] = useState<StoredAudience | null>(null);

  // Load any previously created audience for the selected segment.
  useEffect(() => {
    setMessage(null);
    try {
      const raw = localStorage.getItem(storageKey(segment));
      setStored(raw ? (JSON.parse(raw) as StoredAudience) : null);
    } catch {
      setStored(null);
    }
  }, [segment]);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);

    const seg = SEGMENTS.find((s) => s.key === segment)!;
    const audienceName = name.trim() || `CRM: ${seg.label}`;

    try {
      const response = await fetch("/api/meta/audience/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statuses: seg.statuses,
          name: audienceName,
          audienceId: stored?.audienceId, // re-sync updates the same audience
        }),
      });
      const data: SyncResult = await response.json();

      if (!data.success) {
        setMessage({ type: "error", text: data.error || "Synkningen misslyckades" });
        return;
      }

      if (data.audienceId) {
        const toStore: StoredAudience = { audienceId: data.audienceId, name: audienceName };
        localStorage.setItem(storageKey(segment), JSON.stringify(toStore));
        setStored(toStore);
      }

      const verb = data.created ? "Skapade och synkade" : "Uppdaterade";
      setMessage({
        type: "success",
        text: `${verb} publik – ${data.matched} av ${data.segmentSize} kunder matchningsbara, ${data.numReceived} mottagna av Meta.`,
      });
      setName("");
    } catch {
      setMessage({ type: "error", text: "Nätverksfel – försök igen" });
    } finally {
      setSyncing(false);
    }
  };

  const handleForget = () => {
    localStorage.removeItem(storageKey(segment));
    setStored(null);
    setMessage(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Meta Custom Audiences</h2>
      <p className="text-gray-500 text-sm mb-6">
        Synka ett CRM-segment till en Custom Audience i Meta Ads för retargeting och lookalikes.
        Kunduppgifter hashas på servern innan de skickas.
      </p>

      {message && (
        <div
          className={`p-3 rounded-lg mb-4 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1 font-medium">Segment</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as SegmentKey)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SEGMENTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {stored ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm">
            <div>
              <p className="text-gray-900 font-medium">Kopplad publik: {stored.name}</p>
              <p className="text-gray-500">ID: {stored.audienceId} · synkning uppdaterar denna publik</p>
            </div>
            <button onClick={handleForget} className="text-gray-500 hover:text-red-600 underline">
              Koppla bort
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-gray-700 mb-1 font-medium">Namn på ny publik</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`CRM: ${SEGMENTS.find((s) => s.key === segment)?.label ?? ""}`}
            />
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium shadow-sm"
        >
          {syncing ? "Synkar..." : stored ? "Synka igen" : "Skapa & synka publik"}
        </button>
      </div>
    </div>
  );
}
