const MAX_WIDTH = 1280;
const QUALITY = 0.8;

export async function resizeImage(file: File): Promise<Blob> {
  // Skip resize for small images (under 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // No resize needed if already within bounds
  if (width <= MAX_WIDTH) {
    bitmap.close();
    return file;
  }

  const scale = MAX_WIDTH / width;
  const targetWidth = MAX_WIDTH;
  const targetHeight = Math.round(height * scale);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const blob = await canvas.convertToBlob({
    type: "image/webp",
    quality: QUALITY,
  });

  return blob;
}
