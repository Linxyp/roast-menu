import "server-only";
import crypto from "node:crypto";

/** Token aleatorio seguro para URL (sesiones, códigos de mesa). */
export function tokenAleatorio(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

function secreto(): string {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 32) {
    throw new Error("AUTH_SECRET no está configurado (mínimo 32 caracteres). Revisa el archivo .env");
  }
  return valor;
}

function hmac(valor: string): string {
  return crypto.createHmac("sha256", secreto()).update(valor).digest("hex");
}

/** Huella de un token: en la base solo se guarda esto, nunca el token. */
export function huellaToken(token: string): string {
  return hmac(`token:${token}`);
}

/** Huella no reversible de una IP (límites de intentos sin guardar la IP). */
export function huellaIp(ip: string | null | undefined): string {
  return ip ? hmac(`ip:${ip}`).slice(0, 24) : "sin-ip";
}

/** Código corto y legible para el QR de una mesa (sin letras que se confundan: 0/O, 1/l/I). */
export function codigoMesa(largo = 8): string {
  const alfabeto = "23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = crypto.randomBytes(largo);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}
