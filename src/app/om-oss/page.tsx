import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0 bg-gradient-to-t from-white/85 via-white/40 to-transparent"
          aria-hidden
        />
      </div>
      <main className="min-h-screen w-full">
        <section className="mx-auto max-w-7xl px-6 pt-24 md:pt-28">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                Om oss
              </h1>
              <p className="mt-5 text-lg text-black/70 max-w-prose">
                Intennze bygger hemsidor som är snygga, snabba och lätta att
                använda.
              </p>
              <p className="mt-3 text-black/70 max-w-prose">
                Vi har många års erfarenhet och har skapat flera lyckade sajter
                för små och stora företag. Du får en skräddarsydd hemsida som
                passar din verksamhet och dina mål. Vi lyssnar först och
                föreslår bara det du verkligen behöver.
              </p>
            </div>
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl shadow-sm">
              <Image
                src="/aboutpage.jpg"
                alt="Intennze studio"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 mt-14 md:mt-20">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-black/10 bg-white/80 p-6 backdrop-blur shadow-sm">
              <h2 className="text-xl font-semibold">Varför välja oss</h2>
              <ul className="mt-4 space-y-3 text-black/80">
                <li>
                  • Tydlig plan och tydliga leveranser så du vet vad som händer
                  i varje steg.
                </li>
                <li>• Texter och bilder optimeras så sidan laddar snabbt.</li>
                <li>
                  • Designen är enkel och klar så besökare hittar rätt direkt.
                </li>
                <li>
                  • Vi ser till att sidan fungerar på mobil, surfplatta och
                  dator.
                </li>
                <li>
                  • Grundläggande sökmotoroptimering ingår så du syns bättre på
                  Google.
                </li>
                <li>
                  • Vi kan koppla formulär, bokning, betalning och nyhetsbrev
                  när du vill.
                </li>
                <li>
                  • Du får utbildning som gör att du enkelt kan uppdatera själv.
                </li>
                <li>
                  • Support och uppdateringar finns när du behöver oss, så du
                  kan växa tryggt.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/80 p-6 backdrop-blur shadow-sm">
              <h2 className="text-xl font-semibold">Vårt arbetssätt</h2>
              <p className="mt-4 text-black/70">
                Vi prioriterar struktur före glitter. Det betyder fokus på
                prestanda, tillgänglighet och tydlighet – och först därefter
                animationer och effekter. På så sätt får du en webb som både
                känns modern och levererar resultat.
              </p>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 mt-14 md:mt-20">
          <h2 className="text-xl font-semibold">Bilder från vårt arbete</h2>
          <p className="mt-1 text-sm text-black/60">
            Lägg gärna upp fler bilder i mappen <code>/public</code>, så kopplar
            vi in dem här.
          </p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="relative aspect-[4/3] overflow-hidden rounded-lg border border-black/10 bg-white/70"
              >
                <div className="absolute inset-0 grid place-items-center text-black/40 text-sm">
                  Plats för bild {i}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-6 mt-16 md:mt-24 mb-20">
          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
            <div
              className="absolute inset-0 bg-gradient-to-r from-rose-100/60 via-white/0 to-fuchsia-100/60"
              aria-hidden
            />
            <div className="relative p-8 md:p-12 text-center md:text-left grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-2xl md:text-3xl font-semibold">
                  Redo att prata om din webb?
                </h3>
                <p className="mt-3 text-black/70 max-w-xl">
                  Vi lyssnar först och föreslår bara det du verkligen behöver.
                  Låt oss skapa något snabbt, tydligt och vackert – tillsammans.
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <Link
                  href="/kontakt"
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 px-6 py-3 text-white text-sm font-medium shadow-sm hover:from-rose-500 hover:to-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
                >
                  Kontakta oss
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}