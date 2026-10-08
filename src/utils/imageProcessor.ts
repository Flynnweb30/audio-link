/**
 * Strips EXIF metadata from image files by rendering to an HTML5 Canvas
 * and re-encoding to the requested/original MIME format.
 */
export async function processAndStripExif(file: File): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  const originalMime = file.type || 'image/jpeg';
  const originalExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';

  // SVG images are vector XML and do not use raster EXIF chunks
  if (originalMime === 'image/svg+xml' || originalExt === 'svg') {
    return { blob: file, mimeType: 'image/svg+xml', extension: 'svg' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ blob: file, mimeType: originalMime, extension: originalExt });
        return;
      }

      ctx.drawImage(img, 0, 0);

      const targetMime = originalMime === 'image/gif' ? 'image/png' : originalMime;
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve({ blob, mimeType: targetMime, extension: originalExt });
          } else {
            resolve({ blob: file, mimeType: originalMime, extension: originalExt });
          }
        },
        targetMime,
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, mimeType: originalMime, extension: originalExt });
    };

    img.src = objectUrl;
  });
}