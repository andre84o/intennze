"use client";
import { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";
import { trackContact } from "@/utils/metaPixel";

type Props = {
  initialMessage?: string;
  onSent?: () => void;
};

const ContactForm = ({ initialMessage, onSent }: Props) => {
  const { lang } = useLanguage();
  const t = (k: string) => dict[lang][k];
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const res = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      form.reset();
      if (onSent) onSent();
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl"
      >
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold">{t("contact_title")}</h2>
          <p className="mt-1 text-slate-400">{t("contact_subtitle")}</p>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            {t("name_label")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder={t("name_placeholder")}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            {t("email_label")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            placeholder={t("email_placeholder")}
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            {t("phone_label")}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            placeholder={t("phone_placeholder")}
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            {t("message_label")}
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
            placeholder={t("message_placeholder")}
            defaultValue={initialMessage}
          />
        </div>

        <button
          type="submit"
          onClick={trackContact}
          disabled={status === "sending"}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-70 disabled:hover:scale-100"
        >
          {status === "sending" ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t("sending")}
            </>
          ) : status === "sent" ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t("sent")}
            </>
          ) : (
            <>
              {t("submit")}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        {status === "sent" && (
          <p className="text-center text-sm text-emerald-400">{t("sent_msg")}</p>
        )}
        {status === "error" && (
          <p className="text-center text-sm text-red-400">{t("error_msg")}</p>
        )}
      </form>
    </div>
  );
};

export default ContactForm;
