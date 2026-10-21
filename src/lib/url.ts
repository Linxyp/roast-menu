/**
 * Deja la URL pública lista para el QR y las vistas previas: http(s), sin #fragmento ni ?parámetros
 * y con «/» final (https://ejemplo.com/menu → https://ejemplo.com/menu/). "" si no es válida.
 */
export function normalizarUrlPublica(valor: string | undefined): string {
  if (!valor?.trim()) return "";
  try {
    const url = new URL(valor.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    url.search = "";
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  } catch {
    return "";
  }
}
