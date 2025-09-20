import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full">
      <section className="mx-auto max-w-3xl px-6 pt-24 md:pt-28 pb-16 text-center">
        <h1 className="text-4xl font-semibold">Sidan kunde inte hittas</h1>
        <p className="mt-3 text-black/70">Länken kan vara fel eller sidan kan ha flyttats.</p>
        <div className="mt-6">
          <Link href="/" className="inline-flex items-center rounded-full bg-rose-600 px-5 py-3 text-white text-sm font-medium shadow-sm hover:bg-rose-500">Till startsidan</Link>
        </div>
      </section>
    </main>
  );
}
