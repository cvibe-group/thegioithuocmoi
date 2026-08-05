/** Client-side image optimize → WebP before Supabase Storage upload. */

export type OptimizeImageOptions = {
  /** 0–1, default 0.82 */
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Force keep original format (e.g. favicon .ico/.png) */
  skip?: boolean;
};

function replaceExtension(filename: string, ext: string) {
  const base = filename.replace(/\.[^.]+$/, "") || "image";
  return `${base}.${ext}`;
}

function canvasSupportsWebp() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh"));
    };
    img.src = url;
  });
}

/**
 * Convert raster images to WebP (resize if oversized).
 * Skips SVG / GIF / ICO and when browser lacks WebP encode support.
 */
export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> {
  if (options.skip) return file;
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (
    file.type === "image/svg+xml" ||
    file.type === "image/gif" ||
    file.type === "image/x-icon" ||
    file.type === "image/vnd.microsoft.icon" ||
    /\.ico$/i.test(file.name)
  ) {
    return file;
  }
  if (!canvasSupportsWebp()) return file;

  const quality = options.quality ?? 0.82;
  const maxWidth = options.maxWidth ?? 1920;
  const maxHeight = options.maxHeight ?? 1920;

  try {
    const img = await loadImage(file);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    if (!width || !height) return file;

    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob || blob.size === 0) return file;

    // Keep original if WebP is not smaller (rare for JPEG; possible for tiny PNG)
    if (blob.size >= file.size * 0.98 && file.type === "image/webp") {
      return file;
    }
    if (blob.size >= file.size && file.type !== "image/jpeg") {
      // Prefer WebP for JPEG always; for PNG keep original if smaller
      if (file.type === "image/png" && blob.size > file.size) return file;
    }

    return new File([blob], replaceExtension(file.name, "webp"), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export function storageExtForFile(file: File, fallback = "jpeg") {
  if (file.type === "image/webp") return "webp";
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const fromType = file.type.split("/")[1];
  return fromType || fallback;
}
