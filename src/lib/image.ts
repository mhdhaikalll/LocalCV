"use client";

/**
 * Read an image file and return a downscaled JPEG data URL that preserves the
 * original aspect ratio.
 *
 * Aspect ratio is preserved (rather than cropping to a square) so the photo
 * templates can let the user pan and zoom within their circular/rounded frame.
 * We cap the longest edge so the stored data URL stays small enough for
 * localStorage autosave (typically 30-90 KB).
 */
export async function fileToPhotoDataUrl(file: File, maxEdge = 512): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process the image.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.85);
}
