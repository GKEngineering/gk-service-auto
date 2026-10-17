import type { PhotoLocale } from "./types";

/** crypto.randomUUID n'existe pas hors HTTPS (ex. test sur le réseau local). */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function dessiner(img: HTMLImageElement, max: number): HTMLCanvasElement {
  const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function versBlob(canvas: HTMLCanvasElement, qualite: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression impossible"))), "image/jpeg", qualite),
  );
}

/** Réduit la photo de l'appareil (souvent 4-12 Mo) pour le stockage et le PDF. */
export async function preparerPhoto(fichier: Blob): Promise<PhotoLocale> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const grande = dessiner(img, 1600);
    const blob = await versBlob(grande, 0.8);
    const petite = dessiner(img, 900);

    return {
      id: uid(),
      blob,
      pdfDataUrl: petite.toDataURL("image/jpeg", 0.7),
      pdfLargeur: petite.width,
      pdfHauteur: petite.height,
      apercu: URL.createObjectURL(blob),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
