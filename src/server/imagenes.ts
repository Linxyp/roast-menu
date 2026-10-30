import "server-only";
import sharp, { type Sharp } from "sharp";
import type { ImagenDTO } from "@/lib/carta";
import { db, type Tx } from "./db";
import { ErrorNegocio } from "./errores";

export const MAX_FOTO_MB = 8;

/** Formatos aceptados según su firma de bytes (no según el nombre del archivo). */
function formatoFoto(bytes: Buffer): "jpeg" | "png" | "webp" | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/**
 * Guarda una foto ya lista para la web: corrige la orientación, quita metadatos (EXIF con
 * ubicación, cámara…), limita el tamaño y la convierte a WebP en dos tamaños.
 * `tal_cual` conserva el archivo original como versión grande (fotos ya optimizadas de los afiches).
 */
export async function guardarImagen(cliente: Tx, archivo: Buffer, opciones: { talCual?: boolean } = {}) {
  if (!formatoFoto(archivo)) throw new ErrorNegocio("Usa una foto JPG, PNG o WebP.");
  if (archivo.length > MAX_FOTO_MB * 1024 * 1024) throw new ErrorNegocio(`La foto supera ${MAX_FOTO_MB} MB.`);

  let entrada: Sharp;
  try {
    entrada = sharp(archivo, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
    await entrada.metadata();
  } catch {
    throw new ErrorNegocio("No se pudo leer la foto. Prueba con otra imagen.");
  }

  const grande = opciones.talCual
    ? { data: archivo, info: await sharp(archivo).metadata() }
    : await entrada
        .clone()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90 })
        .toBuffer({ resolveWithObject: true });
  const mini = await entrada
    .clone()
    .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 90 })
    .toBuffer();

  const estadisticas = await sharp(mini).stats();
  const { r, g, b } = estadisticas.dominant;
  const oscuro = (v: number) => Math.round(v * 0.55).toString(16).padStart(2, "0");
  const ancho = grande.info.width ?? 0;
  const alto = grande.info.height ?? 0;

  return cliente.imagen.create({
    data: {
      ancho,
      alto,
      color: `#${oscuro(r)}${oscuro(g)}${oscuro(b)}`,
      transparente: !estadisticas.isOpaque,
      grande: new Uint8Array(grande.data),
      mini: new Uint8Array(mini),
    },
    select: { id: true, ancho: true, alto: true, color: true, transparente: true },
  });
}

/** Foto subida desde el panel (campo de formulario). */
export async function guardarImagenSubida(archivo: unknown) {
  if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorNegocio("Elige una foto.");
  return guardarImagen(db, Buffer.from(await archivo.arrayBuffer()));
}

export function imagenDTO(imagen: { id: string; ancho: number; alto: number; color: string; transparente: boolean } | null): ImagenDTO | null {
  if (!imagen) return null;
  return {
    id: imagen.id,
    url: `/fotos/${imagen.id}/grande.webp`,
    mini: `/fotos/${imagen.id}/mini.webp`,
    ancho: imagen.ancho,
    alto: imagen.alto,
    color: imagen.color,
    transparente: imagen.transparente,
  };
}

/** Campos de la imagen que necesita la carta (sin los bytes). */
export const SELECT_IMAGEN = { select: { id: true, ancho: true, alto: true, color: true, transparente: true } } as const;

/** Borra fotos que ya nadie usa (al reemplazar o borrar productos). */
export async function limpiarImagenesHuerfanas() {
  await db.imagen.deleteMany({
    where: { productos: { none: {} }, toppings: { none: {} }, opciones: { none: {} }, creadaEn: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
}
