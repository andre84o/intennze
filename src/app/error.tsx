"use client";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GlobalError({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <main className="min-h-screen w-full">
          <section className="mx-auto max-w-3xl px-6 pt-24 md:pt-28 pb-16 text-center">
            <h1 className="text-4xl font-semibold">Ett fel uppstod</h1>
            <p className="mt-3 text-black/70">Förlåt, något gick fel. Försök igen.</p>
            <div className="mt-6 flex gap-3 justify-center">
              <button onClick={reset} className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-medium hover:bg-white/90">Försök igen</button>
              <Link href="/" className="inline-flex items-center rounded-full bg-rose-600 px-5 py-3 text-white text-sm font-medium shadow-sm hover:bg-rose-500">Till startsidan</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
