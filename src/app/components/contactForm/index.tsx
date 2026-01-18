"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";
import { trackLead } from "@/utils/metaPixel";

type DataLayerEvent = Record<string, unknown>;
type DataLayerWindow = Window & { dataLayer?: DataLayerEvent[] };

type Props = {
  initialMessage?: string;
  onSent?: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
};

const ContactForm = ({ initialMessage, onSent, title, subtitle, buttonText }: Props) => {
  const { lang } = useLanguage();
  const t = (k: string) => dict[lang][k];
  const sv = lang === "sv";

  const formTitle = title || t("contact_title");
  const formSubtitle = subtitle || t("contact_subtitle");
  const formButtonText = buttonText || t("submit");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  // Fire tracking event when form is successfully sent
  useEffect(() => {
    if (status === "sent" && typeof window !== "undefined") {
      // Google Ads Conversion
      if ((window as { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as { gtag: (...args: unknown[]) => void }).gtag('event', 'conversion', {
          'send_to': 'AW-17863845026/xm_vCN7IheAbEKLJksZC'
        });
      }

      // Google Tag Manager dataLayer push
      const dataLayer = (window as DataLayerWindow).dataLayer;
      if (Array.isArray(dataLayer)) {
        dataLayer.push({
          event: "form_submission",
          form_name: "contact_form",
        });
      }

      // Facebook Pixel
      if ((window as { fbq?: (action: string, event: string) => void }).fbq) {
        (window as { fbq: (action: string, event: string) => void }).fbq("track", "Lead");
      }
    }
  }, [status]);

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

      trackLead({ source: "contact_form" });
      setStatus("sent");
      form.reset();
      if (onSent) onSent();
    } catch {
      setStatus("error");
    }
  };

  // Success/Thank you state
  if (status === "sent") {
    return (
      <div className="w-full">
        <div
          className="flex flex-col items-center justify-center gap-6 p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl min-h-[400px]"
          data-conversion="success"
          data-form-submitted="true"
          id="contact-form-success"
        >
          {/* Success icon with animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                className="animate-[scale-in_0.3s_ease-out]"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          {/* Thank you message */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              {sv ? "Tack för ditt meddelande!" : "Thank you for your message!"}
            </h2>
            <p className="text-slate-400 max-w-sm">
              {sv
                ? "Vi återkommer inom 24 timmar."
                : "We'll get back to you within 24 hours."}
            </p>
          </div>

          {/* What happens next */}
          <div className="w-full mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <p className="text-sm text-slate-500 mb-3 font-medium">
              {sv ? "Vad händer nu?" : "What happens next?"}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 text-xs font-bold">1</span>
                </div>
                <p className="text-sm text-slate-400">
                  {sv ? "Vi granskar din förfrågan" : "We review your request"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 text-xs font-bold">2</span>
                </div>
                <p className="text-sm text-slate-400">
                  {sv ? "Vi kontaktar dig för att diskutera ditt projekt" : "We contact you to discuss your project"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-fuchsia-400 text-xs font-bold">3</span>
                </div>
                <p className="text-sm text-slate-400">
                  {sv ? "Du får en kostnadsfri offert" : "You receive a free quote"}
                </p>
              </div>
            </div>
          </div>

          {/* Send another message button */}
          <button
            onClick={() => setStatus("idle")}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4"
          >
            {sv ? "Skicka ett nytt meddelande" : "Send another message"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl"
      >
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold">{formTitle}</h2>
          <p className="mt-1 text-slate-400">{formSubtitle}</p>
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

        <div className="flex items-start gap-3">
          <input
            id="policy"
            name="policy"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800/50 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="policy" className="text-sm text-slate-400 cursor-pointer">
            {sv
              ? <>Jag godkänner <a href="/integritetspolicy" target="_blank" className="text-cyan-400 hover:underline">integritetspolicyn</a> och samtycker till att mina uppgifter behandlas.</>
              : <>I accept the <a href="/integritetspolicy" target="_blank" className="text-cyan-400 hover:underline">privacy policy</a> and consent to my data being processed.</>
            }
          </label>
        </div>

        <button
          type="submit"
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
          ) : (
            <>
              {formButtonText}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        {status === "error" && (
          <p className="text-center text-sm text-red-400">{t("error_msg")}</p>
        )}
      </form>
    </div>
  );
};

export default ContactForm;
