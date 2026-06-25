// Canvas-based image compression — zero dependencies, runs in the browser.
// Used by the attachments uploader when the "compress" toggle is on.

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg";
}

export interface ImageResult {
  file: File;
  width: number;
  height: number;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Kunde inte läsa bilden"));
    img.src = src;
  });
}

// Returns the natural dimensions of an image file without resizing it.
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const img = await loadImage(await readAsDataURL(file));
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  }
}

// Compresses a raster image. Vector/animated formats (svg, gif) and
// non-images are returned untouched. If compression would not shrink the
// file, the original is kept.
export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<ImageResult> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8, mimeType = "image/webp" } = opts;

  const skip = !file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml";
  if (skip) {
    const dims = await getImageDimensions(file);
    return { file, width: dims?.width ?? 0, height: dims?.height ?? 0 };
  }

  const img = await loadImage(await readAsDataURL(file));
  const ratio = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const width = Math.round(img.naturalWidth * ratio);
  const height = Math.round(img.naturalHeight * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, width: img.naturalWidth, height: img.naturalHeight };
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mimeType, quality));
  if (!blob || blob.size >= file.size) {
    // Compression didn't help — keep the original file but report new dims if resized.
    return { file, width: img.naturalWidth, height: img.naturalHeight };
  }

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const newName = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return { file: new File([blob], newName, { type: mimeType }), width, height };
}
