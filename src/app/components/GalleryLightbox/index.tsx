"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

export type GalleryImage = { src: string; alt?: string };

type Props = {
  images: GalleryImage[];
  className?: string;
  columns?: 2 | 3 | 4;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function GalleryLightbox({ images, className, columns = 4 }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const colClass = useMemo(() => {
    switch (columns) {
      case 2:
        return "grid grid-cols-2 md:grid-cols-2 gap-4";
      case 3:
        return "grid grid-cols-2 md:grid-cols-3 gap-4";
      default:
        return "grid grid-cols-2 md:grid-cols-4 gap-4";
    }
  }, [columns]);

  const show = useCallback((i: number) => {
    setIndex(clamp(i, 0, images.length - 1));
    setOpen(true);
  }, [images.length]);

  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, next, prev]);

  return (
    <div className={className}>
      <div className={colClass}>
        {images.map((b, i) => (
          <button
            key={b.src}
            type="button"
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-black/10 bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
            onClick={() => show(i)}
            aria-label={`Visa bild ${i + 1}`}
          >
            <Image
              src={b.src}
              alt={b.alt || ""}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              sizes="(min-width: 768px) 25vw, 50vw"
            />
          </button>
        ))}
      </div>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={close}
        >
          <div className="relative mx-auto max-w-6xl w-[92vw] h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[index].src}
              alt={images[index].alt || ""}
              fill
              className="object-contain"
              sizes="92vw"
              priority
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md bg-white/90 px-3 py-1 text-sm font-medium text-black shadow-sm hover:bg-white"
                aria-label="Stäng"
              >
                Stäng
              </button>
              <div className="rounded-md bg-white/80 px-2 py-1 text-xs text-black shadow-sm">
                {index + 1} / {images.length}
              </div>
            </div>

            <button
              type="button"
              onClick={prev}
              aria-label="Föregående"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-black shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Nästa"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-black shadow hover:bg-white"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
