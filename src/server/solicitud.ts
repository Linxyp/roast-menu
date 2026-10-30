import "server-only";
import { headers } from "next/headers";

/**
 * IP del cliente. Detrás del Caddy del servidor (TRUST_PROXY=1) se toma el primer
 * valor de X-Forwarded-For; sin proxy de confianza no se cree en esa cabecera.
 */
export async function ipCliente(): Promise<string | null> {
  const h = await headers();
  if (process.env.TRUST_PROXY === "1") {
    const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (reenviada) return reenviada;
  }
  return h.get("x-real-ip") ?? null;
}
