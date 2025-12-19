"use client";

import { Quote } from "@/types/database";

interface Props {
  quote: Quote;
  onClose: () => void;
  onConfirm: (email: string, message: string) => void;
  isSending: boolean;
}

export default function SendQuoteModal({ quote, onClose, onConfirm, isSending }: Props) {
  if (!quote.customer?.email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Skicka offert</h3>
          <p className="text-gray-500">
            Är du säker på att du vill skicka offerten till{" "}
            <span className="text-gray-900 font-medium">{quote.customer.email}</span>?
          </p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={() => onConfirm(quote.customer!.email!, "")}
              disabled={isSending}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
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
