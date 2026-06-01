"use client";

import { useState } from "react";

export interface EmailPreview {
  id: string;
  subject: string | null;
  body_text: string | null;
  from_email: string;
  to_email: string;
  email_date: string;
}

interface Props {
  interactionId: string;
  createdAt: string;
  description: string;
  email?: EmailPreview | null;
  formatDateTime: (dt: string) => string;
  onDelete?: () => void;
}

export function EmailInteractionItem({
  createdAt,
  description,
  email,
  formatDateTime,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div
        className={`flex gap-3 group ${email ? "cursor-pointer" : ""}`}
        onClick={() => { if (email) setExpanded(true); }}
        title={email ? "Klicka för att läsa hela mailet" : undefined}
      >
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">{formatDateTime(createdAt)}</p>
          {email ? (
            <>
              <p className="text-sm font-medium text-slate-700 truncate">
                {email.subject ?? description}
              </p>
              {email.body_text && (
                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                  {email.body_text}
                </p>
              )}
              <p className="text-xs text-blue-400 mt-0.5">Klicka för att läsa</p>
            </>
          ) : (
            <p className="text-sm text-slate-700">{description}</p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-slate-300 hover:text-rose-500 transition-all rounded"
            title="Radera"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {expanded && email && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {email.subject ?? "(Inget ämne)"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateTime(email.email_date)}
                </p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-slate-50 flex-shrink-0 space-y-0.5">
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">Från:</span> {email.from_email}
              </p>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">Till:</span> {email.to_email}
              </p>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {email.body_text ?? "(Inget innehåll)"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
