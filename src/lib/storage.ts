// ─── Firebase Storage + WebP Conversion ───────────────────────────────────────

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Convierte un File/Blob de imagen a WebP usando canvas API en el cliente.
 * @param file Archivo de imagen original
 * @param quality Calidad WebP (0-1), default 0.8
 * @returns Promise<Blob> con la imagen en formato WebP
 */
export async function convertToWebP(file: File | Blob, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No se pudo obtener el contexto 2D')); return; }
      ctx.drawImage(img, 0, 0);
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
      reject(new Error('No se pudo cargar la imagen para conversión'));
    };

    img.src = url;
  });
}

/**
 * Sube una imagen a Firebase Storage como WebP.
 * @param file Archivo de imagen original
 * @param path Ruta en Storage (ej: 'blocks/{blockId}')
 * @returns URL de descarga pública
 */
export async function uploadImageAsWebP(
  file: File | Blob,
  path: string,
): Promise<string> {
  const webpBlob = await convertToWebP(file);
  const storageRef = ref(storage, `${path}.webp`);
  await uploadBytes(storageRef, webpBlob, {
    contentType: 'image/webp',
  });
  return getDownloadURL(storageRef);
}

/**
 * Sube un archivo sin conversión (ej: para archivos que ya son WebP).
 */
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
