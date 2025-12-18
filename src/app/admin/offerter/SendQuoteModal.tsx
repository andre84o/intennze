"use client";

import { Quote } from "@/types/database";

interface Props {
  quote: Quote;
  onClose: () => void;
  onConfirm: () => void;
  isSending: boolean;
}

export default function SendQuoteModal({ quote, onClose, onConfirm, isSending }: Props) {
  if (!quote.customer?.email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">Skicka offert</h3>
          <p className="text-slate-400">
            Är du säker på att du vill skicka offerten till{" "}
            <span className="text-white font-medium">{quote.customer.email}</span>?
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={onConfirm}
              disabled={isSending}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-blue-400 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Skickar...
                </>
              ) : (
                "Skicka offert"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
