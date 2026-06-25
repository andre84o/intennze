"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import type { Attachment, AttachmentKind } from "@/types/database";
import { compressImage, getImageDimensions } from "@/lib/attachments/compressImage";
import {
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_SIZE,
  fileExt,
  formatBytes,
  isAllowedUpload,
  isImageMime,
  stripExt,
} from "@/lib/attachments/constants";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

interface AttachmentUploaderProps {
  entityType: string;
  entityId: string;
  onUploaded: (attachment: Attachment) => void;
  className?: string;
  title?: string;
}

interface PendingFile {
  file: File;
  kind: AttachmentKind;
  name: string;
  previewUrl?: string;
}

const COMPRESS_PREF_KEY = "attachments:compress";

/**
 * Reusable upload control: a small icon button that opens a modal.
 * - Compression toggle (Twitch-style switch): ON shrinks images, OFF keeps the original.
 * - Documents require a name before they can be saved.
 * Drop it anywhere you have an entity (entityType + entityId) to attach files to.
 */
export function AttachmentUploader({
  entityType,
  entityId,
  onUploaded,
  className,
  title = "Ladda upp bild eller dokument",
}: AttachmentUploaderProps) {
  const [open, setOpen] = useState(false);
  const [compress, setCompress] = useState(true);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Portal target is only available on the client.
  useEffect(() => setMounted(true), []);

  // Remember the compression preference globally.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(COMPRESS_PREF_KEY) : null;
    if (stored !== null) setCompress(stored === "true");
  }, []);

  const updateCompress = (value: boolean) => {
    setCompress(value);
    if (typeof window !== "undefined") window.localStorage.setItem(COMPRESS_PREF_KEY, String(value));
  };

  const reset = () => {
    pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    setPending([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const next: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setError(`"${file.name}" är för stor (max ${formatBytes(MAX_ATTACHMENT_SIZE)}).`);
        continue;
      }
      if (!isAllowedUpload(file.type, file.name)) {
        setError(`"${file.name}" är inte en tillåten filtyp.`);
        continue;
      }
      const kind: AttachmentKind = isImageMime(file.type) ? "image" : "document";
      next.push({
        file,
        kind,
        name: stripExt(file.name),
        previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
      });
    }
    setPending((prev) => [...prev, ...next]);
  };

  const removePending = (index: number) => {
    setPending((prev) => {
      const p = prev[index];
      if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const setName = (index: number, value: string) => {
    setPending((prev) => prev.map((p, i) => (i === index ? { ...p, name: value } : p)));
  };

  // Documents must have a name; images fall back to the file name.
  const missingDocName = pending.some((p) => p.kind === "document" && !p.name.trim());
  const canUpload = pending.length > 0 && !missingDocName && !uploading;

  const handleUpload = async () => {
    if (!canUpload) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    try {
      for (const item of pending) {
        let uploadFile = item.file;
        let width: number | null = null;
        let height: number | null = null;

        if (item.kind === "image") {
          if (compress) {
            const result = await compressImage(item.file);
            uploadFile = result.file;
            width = result.width || null;
            height = result.height || null;
          } else {
            const dims = await getImageDimensions(item.file);
            width = dims?.width ?? null;
            height = dims?.height ?? null;
          }
        }

        const ext = fileExt(uploadFile.name);
        const objectName = `${crypto.randomUUID()}${ext ? "." + ext : ""}`;
        const storagePath = `${entityType}/${entityId}/${objectName}`;

        const { error: uploadError } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .upload(storagePath, uploadFile, { contentType: uploadFile.type, upsert: false });
        if (uploadError) throw new Error(uploadError.message);

        const { data, error: insertError } = await supabase
          .from("attachments")
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            created_by: userId,
            kind: item.kind,
            name: item.name.trim() || item.file.name,
            file_name: item.file.name,
            mime_type: uploadFile.type,
            file_ext: ext,
            file_size: uploadFile.size,
            storage_path: storagePath,
            width,
            height,
          })
          .select()
          .single();

        if (insertError) {
          // Roll back the orphaned storage object on a failed DB insert.
          await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
          throw new Error(insertError.message);
        }
        if (data) onUploaded(data as Attachment);
      }
      close();
    } catch (e) {
      setError("Kunde inte ladda upp: " + (e instanceof Error ? e.message : "okänt fel"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"}
        title={title}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={close}>
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Ladda upp</h2>
                <button onClick={close} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Compression toggle */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Komprimera bilder</p>
                  <p className="text-[11px] text-gray-400">
                    {compress ? "Bilder förminskas innan uppladdning" : "Originalbilden laddas upp"}
                  </p>
                </div>
                <ToggleSwitch checked={compress} onChange={updateCompress} />
              </div>

              {/* Drop / choose */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 hover:bg-blue-50/40 transition-colors mb-4"
              >
                <svg className="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-gray-500">Klicka för att välja bilder eller dokument</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Max {formatBytes(MAX_ATTACHMENT_SIZE)} per fil</p>
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {/* Pending files */}
              {pending.length > 0 && (
                <div className="space-y-2 mb-4">
                  {pending.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                      {p.kind === "image" && p.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.previewUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {p.kind === "document" ? (
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => setName(i, e.target.value)}
                            placeholder="Dokumentnamn (obligatoriskt)"
                            className={`w-full px-2 py-1 text-sm bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                              p.name.trim() ? "border-gray-200" : "border-red-300"
                            }`}
                          />
                        ) : (
                          <p className="text-sm text-gray-700 truncate">{p.file.name}</p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {p.kind === "document" ? (fileExt(p.file.name)?.toUpperCase() || "FIL") + " · " : ""}
                          {formatBytes(p.file.size)}
                        </p>
                      </div>
                      <button onClick={() => removePending(i)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {missingDocName && (
                <p className="text-[11px] text-red-500 mb-3">Dokument måste ha ett namn innan de kan sparas.</p>
              )}
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={close} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                  Avbryt
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="px-5 py-1.5 text-sm bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Laddar upp..." : "Spara"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
