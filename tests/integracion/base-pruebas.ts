import { existsSync } from "node:fs";
import path from "node:path";

export const RAIZ = path.resolve(import.meta.dirname, "../..");

/**
 * Carga .env (sin pisar variables ya definidas) y devuelve DATABASE_URL_TEST.
 * Las pruebas vacían esa base, así que solo se acepta una cuyo nombre termine en «_test».
 */
export function urlBasePruebas(): string {
  const archivo = path.join(RAIZ, ".env");
  if (existsSync(archivo)) process.loadEnvFile(archivo);
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("Falta DATABASE_URL_TEST (ver .env.example).");
  const base = new URL(url).pathname.slice(1);
  if (!base.endsWith("_test")) {
    throw new Error(`DATABASE_URL_TEST debe apuntar a una base «…_test» (es «${base}»): las pruebas borran sus datos.`);
  }
  return url;
}
