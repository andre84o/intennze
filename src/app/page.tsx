// Fil: app/page.tsx
import Image from "next/image";

export default function Home() {
  return (
    <>
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Image
          src="/bg-intennze-rosa.png"
          alt="Background"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          aria-hidden
        />
      </div>
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-10 items-center">
          <h1 className="text-5xl md:text-6xl font-medium leading-tight">
            Intennze{" "}
            <span className="font-extrabold">Struktur före glitter</span>
          </h1>
          <div className="relative w-[520px] aspect-square overflow-hidden rounded">
            <Image
              src="/home-pic.jpg"
              alt="Photo"
              fill
              priority
              className="object-cover"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)," +
                  "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
                WebkitMaskComposite: "source-in",
                maskImage:
                  "linear-gradient(to right, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)," +
                  "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
                maskComposite: "intersect",
              }}
            />
          </div>
        </div>
      </main>
    </>
  );
}
