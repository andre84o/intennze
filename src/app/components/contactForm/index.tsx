"use client";
import { useState } from "react";

type Props = {
  initialMessage?: string;
  onSent?: () => void;
};

const ContactForm = ({ initialMessage, onSent }: Props) => {
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
    <div className="w-full px-4">
      <form
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-2xl border border-black/10 bg-white/80 p-6 backdrop-blur shadow-sm"
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold">Kontakta oss</h2>
          <p className="mt-1 text-sm text-black/60">
            Vi återkommer så snart vi kan.
          </p>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-black/80"
          >
            Namn
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-black placeholder-black/40 shadow-inner outline-none ring-0 transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
            placeholder="Ditt namn"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-black/80"
          >
            E-post
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-black placeholder-black/40 shadow-inner outline-none transition focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-200"
            placeholder="namn@exempel.se"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-black/80"
          >
            Telefon
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            className="mt-1 w-full rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-black placeholder-black/40 shadow-inner outline-none ring-0 transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
            placeholder="Ditt telefonnummer"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-black/80"
          >
            Meddelande
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="mt-1 w-full rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-black placeholder-black/40 shadow-inner outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
            placeholder="Berätta kort vad du behöver hjälp med"
            defaultValue={initialMessage}
          />
        </div>

        <button
          type="submit"
          disabled={status === "sending"}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:from-rose-500 hover:to-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600 disabled:opacity-70"
        >
          {status === "sending"
            ? "Skickar…"
            : status === "sent"
              ? "Skickat!"
              : "Skicka"}
        </button>

        {status === "sent" && (
          <p className="text-center text-sm text-green-700">
            Tack! Ditt meddelande har skickats.
          </p>
        )}
        {status === "error" && (
          <p className="text-center text-sm text-red-700">
            Något gick fel. Försök igen.
          </p>
        )}
      </form>
    </div>
  );
};

export default ContactForm;
