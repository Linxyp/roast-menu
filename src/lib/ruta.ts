const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Antepone la subcarpeta del sitio (GitHub Pages la necesita) a una ruta de public/. */
export function ruta(camino: string): string {
  return `${BASE}${camino}`;
}
