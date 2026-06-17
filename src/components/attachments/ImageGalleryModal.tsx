"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Attachment } from "@/types/database";
import { getSignedUrls, deleteAttachment } from "@/lib/attachments/storage";
import { formatBytes } from "@/lib/attachments/constants";

interface ImageGalleryModalProps {
  images: Attachment[];
  open: boolean;
  onClose: () => void;
  onDeleted?: (attachment: Attachment) => void;
}

/** Reusable image gallery modal with a lightbox and per-image delete. */
export function ImageGalleryModal({ images, open, onClose, onDeleted }: ImageGalleryModalProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [active, setActive] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || images.length === 0) return;
    let cancelled = false;
    getSignedUrls(images.map((i) => i.storage_path)).then((map) => {
      if (!cancelled) setUrls(map);
    });
    return () => {
      cancelled = true;
    };
  }, [open, images]);

  if (!open || !mounted) return null;

  const handleDelete = async (att: Attachment) => {
    const err = await deleteAttachment(att);
    if (!err) {
      setActive(null);
      onDeleted?.(att);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Bilder ({images.length})</h2>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {images.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Inga bilder ännu.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActive(i)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group"
                >
                  {urls[img.storage_path] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[img.storage_path]} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  ) : (
                    <div className="w-full h-full animate-pulse bg-gray-200" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {active !== null && images[active] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/80" onClick={() => setActive(null)}>
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {urls[images[active].storage_path] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[images[active].storage_path]} alt={images[active].name} className="max-w-full max-h-[80vh] rounded-xl object-contain" />
            )}
            <div className="flex items-center justify-between mt-3 text-white/80 text-sm">
              <span className="truncate">
                {images[active].name}
                {images[active].width ? ` · ${images[active].width}×${images[active].height}` : ""} · {formatBytes(images[active].file_size)}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={urls[images[active].storage_path]}
                  download={images[active].file_name}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Ladda ner
                </a>
                <button
                  onClick={() => handleDelete(images[active])}
                  className="px-3 py-1 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"
                >
                  Ta bort
                </button>
                <button onClick={() => setActive(null)} className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  Stäng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
