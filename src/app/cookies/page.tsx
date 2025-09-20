"use client";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "Cookies",
        description: "Information about the cookies used on intenzze.com.",
        alternates: { canonical: "/cookies" },
      }
    : {
        title: "Cookies",
        description: "Information om cookies som används på intenzze.com.",
        alternates: { canonical: "/cookies" },
      };
}
export default function CookiesPage() {
  return (
    <main className="min-h-screen w-full">
      <section className="mx-auto max-w-3xl px-6 pt-24 md:pt-28">
        <h1 className="text-3xl font-semibold">Cookies</h1>
        <p className="mt-4 text-black/70">
          Vi använder nödvändiga cookies för att sidan ska fungera och endast en
          val-cookie för att komma ihåg ditt samtycke. Vi använder inga
          tredjepartsspårare i nuläget.
        </p>

        <h2 className="mt-8 text-xl font-semibold">Vilka cookies använder vi?</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-white/70">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="bg-white/80">
                <th className="px-4 py-3 font-semibold">Namn</th>
                <th className="px-4 py-3 font-semibold">Syfte</th>
                <th className="px-4 py-3 font-semibold">Lagringstid</th>
                <th className="px-4 py-3 font-semibold">Leverantör</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-black/10">
                <td className="px-4 py-3 font-mono">intenzze</td>
                <td className="px-4 py-3">Sparar ditt val om cookies (acceptera/avvisa).</td>
                <td className="px-4 py-3">180 dagar</td>
                <td className="px-4 py-3">intenzze.se</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 text-xl font-semibold">Så hanterar du cookies</h2>
        <h3 className="mt-3 text-base font-semibold">Radera eller ändra samtycke</h3>
        <ul className="mt-3 list-disc pl-6 text-black/70">
          <li>Du kan radera cookies via din webbläsares inställningar.</li>
          <li>Vill du ändra samtycke? Rensa cookien <code className="font-mono">intenzze</code> så visas bannern igen.</li>
          <li>Efter rensning laddar du om sidan.</li>
        </ul>

        <p className="mt-8 pb-10 text-xs text-black/60">Senast uppdaterad: 2025-09-20</p>
      </section>
    </main>
  );
}
