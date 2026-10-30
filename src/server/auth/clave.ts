import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";

/**
 * Contraseñas con scrypt (incluido en Node, resistente a ataques con hardware dedicado).
 * Parámetros según OWASP: N=2^15, r=8, p=3. El formato guarda los parámetros para
 * poder endurecerlos sin invalidar contraseñas existentes.
 */
const scrypt = promisify(crypto.scrypt) as (
  clave: crypto.BinaryLike,
  sal: crypto.BinaryLike,
  largo: number,
  opciones: crypto.ScryptOptions,
) => Promise<Buffer>;

const LARGO = 64;
const PRODUCCION = { N: 2 ** 15, r: 8, p: 3 };
const PRUEBAS = { N: 2 ** 12, r: 8, p: 1 };

const parametros = () => (process.env.NODE_ENV === "test" ? PRUEBAS : PRODUCCION);
const memoria = (N: number, r: number, p: number) => 128 * N * r * p + 16 * 1024 * 1024;

export async function cifrarClave(clave: string): Promise<string> {
  const { N, r, p } = parametros();
  const sal = crypto.randomBytes(16);
  const llave = await scrypt(clave.normalize("NFKC"), sal, LARGO, { N, r, p, maxmem: memoria(N, r, p) });
  return ["scrypt", N, r, p, sal.toString("base64"), llave.toString("base64")].join("$");
}

export async function verificarClave(clave: string, guardada: string): Promise<boolean> {
  const partes = guardada.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [N, r, p] = partes.slice(1, 4).map(Number);
  if (![N, r, p].every((v) => Number.isInteger(v) && v > 0)) return false;
  const sal = Buffer.from(partes[4], "base64");
  const esperada = Buffer.from(partes[5], "base64");
  const real = await scrypt(clave.normalize("NFKC"), sal, esperada.length, { N, r, p, maxmem: memoria(N, r, p) });
  return real.length === esperada.length && crypto.timingSafeEqual(real, esperada);
}

let hashFicticio: Promise<string> | null = null;

/** Gasta el mismo tiempo cuando el usuario no existe: la respuesta no revela qué usuarios hay. */
export async function igualarTiempo(clave: string) {
  hashFicticio ??= cifrarClave("clave-ficticia-para-igualar-tiempos");
  await verificarClave(clave, await hashFicticio);
}

/** Problemas de una contraseña nueva (lista vacía si sirve). */
export function problemasClave(clave: string): string[] {
  const problemas: string[] = [];
  if (clave.length < 8) problemas.push("Usa al menos 8 caracteres.");
  if (clave.length > 128) problemas.push("Usa como máximo 128 caracteres.");
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/\d/.test(clave)) problemas.push("Combina letras y números.");
  if (["12345678", "contraseña1", "password1", "roast1234", "admin1234"].includes(clave.toLowerCase())) {
    problemas.push("Es una contraseña demasiado común.");
  }
  return problemas;
}
