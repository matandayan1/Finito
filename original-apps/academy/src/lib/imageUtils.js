/**
 * Compress and resize an image before uploading.
 * Reduces file size by ~70-90% with minimal visual quality loss.
 * Outputs WebP format (falls back to JPEG) at max 800px wide.
 */

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.78; // 0-1, good balance between size and quality

export async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate target dimensions
      let { width, height } = img;
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fallback to JPEG
      const mimeType = supportsWebP() ? 'image/webp' : 'image/jpeg';
      const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Only use compressed if it's actually smaller
          if (blob.size < file.size) {
            const compressed = new File([blob], `img.${ext}`, { type: mimeType });
            resolve(compressed);
          } else {
            resolve(file);
          }
        },
        mimeType,
        QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original
    };

    img.src = url;
  });
}

function supportsWebP() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}