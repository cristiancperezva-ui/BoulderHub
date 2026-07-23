// ─── Firebase Storage + WebP Conversion ───────────────────────────────────────

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
  * Redimensiona una imagen a un máximo de `maxWidth` px manteniendo aspect ratio,
  * luego la convierte a WebP con calidad `quality`.
  *
  * @param file Archivo original (File o Blob)
  * @param maxWidth Ancho máximo (default 1200px — ideal para mobile/web)
  * @param quality Calidad WebP 0-1 (default 0.7 — muy buen balance calidad/tamaño)
  * @returns Blob WebP redimensionado
 */
export async function resizeAndConvertToWebP(
  file: File | Blob,
  maxWidth = 1200,
  quality = 0.7,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calcular nuevas dimensiones manteniendo aspect ratio
      let { width, height } = img;
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No se pudo obtener el contexto 2D')); return; }

      // Suavizado para mejor calidad al redimensionar
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Fallo la conversión a WebP'));
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };

    img.src = url;
  });
}

/**
 * Sube una imagen a Firebase Storage: redimensiona → WebP → upload.
 *
 * @param file Archivo original
 * @param path Ruta en Storage (ej: 'blocks/{blockId}')
 * @param onProgress Callback opcional con progreso 0-1
 * @returns URL de descarga pública
 */
export async function uploadImageAsWebP(
  file: File | Blob,
  path: string,
  onProgress?: (pct: number, label: string) => void,
): Promise<string> {
  onProgress?.(0.1, 'Redimensionando imagen...');

  // 1) Redimensionar y convertir a WebP (en el cliente, rápido)
  const webpBlob = await resizeAndConvertToWebP(file);
  onProgress?.(0.4, 'Subiendo a la nube...');

  // 2) Subir a Firebase Storage
  const storageRef = ref(storage, `${path}.webp`);
  await uploadBytes(storageRef, webpBlob, {
    contentType: 'image/webp',
  });
  onProgress?.(0.8, 'Procesando...');

  // 3) Obtener URL pública
  const url = await getDownloadURL(storageRef);
  onProgress?.(1, '¡Listo!');
  return url;
}

/** Sube un archivo sin conversión (ej: PDFs, etc.). */
export async function uploadFile(
  file: File | Blob,
  path: string,
  contentType?: string,
): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType });
  return getDownloadURL(storageRef);
}

/** Eliminar un archivo de Storage */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}
