/**
 * Strips EXIF metadata by re-encoding via HTML5 Canvas and preserves requested format.
 */
export async function processImageFile(file: File, quality = 0.92): Promise<{ blob: Blob; mimeType: string }> {
  // If not an image or SVG, return as-is
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return { blob: file, mimeType: file.type };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ blob: file, mimeType: file.type });
          return;
        }

        ctx.drawImage(img, 0, 0);

        const targetMime = file.type || 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, mimeType: targetMime });
            } else {
              resolve({ blob: file, mimeType: file.type });
            }
          },
          targetMime,
          quality
        );
      };
      img.onerror = () => resolve({ blob: file, mimeType: file.type });
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ blob: file, mimeType: file.type });
    reader.readAsDataURL(file);
  });
}