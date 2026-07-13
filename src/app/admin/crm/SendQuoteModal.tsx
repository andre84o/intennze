"use client";

import { Quote } from "@/types/database";

interface Props {
  quote: Quote;
  email: string;
  onClose: () => void;
  onConfirm: () => void;
  isSending: boolean;
}

export default function SendQuoteModal({ quote, email, onClose, onConfirm, isSending }: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if (!isSending) onClose(); }} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Skicka offert #{quote.quote_number}</p>
            <p className="text-xs text-slate-400 truncate">Till {email}</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <p className="text-sm text-slate-500 mb-4">
            Kunden får offerten via e-post med en länk där de kan godkänna eller avböja.
          </p>
          <div className="flex gap-2">
            <button onClick={() => { if (!isSending) onClose(); }} disabled={isSending} className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-sm font-medium transition-colors">
              Avbryt
            </button>
            <button
              onClick={onConfirm}
              disabled={isSending}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isSending ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Skickar…
                </>
              ) : "Skicka"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
