import "server-only";
import { cookies } from "next/headers";
import { huellaToken, tokenAleatorio } from "../crypto";
import { db } from "../db";

/**
 * Sesiones del panel guardadas en la base.
 *  · La cookie lleva un token aleatorio de 256 bits; la base guarda solo su HMAC.
 *  · Cookie HttpOnly + SameSite=Lax (+ Secure y prefijo __Host- en producción).
 *  · Vence por inactividad (3 días) y siempre a los 30 días: el panel vive en el
 *    computador o la tableta del restaurante y no debe pedir clave a cada rato.
 *  · Cambiar la contraseña o desactivar al usuario cierra sus sesiones.
 */
const produccion = process.env.NODE_ENV === "production";
export const COOKIE_SESION = produccion ? "__Host-roast_sesion" : "roast_sesion";

const HORA = 3600 * 1000;
const INACTIVIDAD = 72 * HORA;
const MAXIMO = 30 * 24 * HORA;
const REFRESCO = 10 * 60 * 1000;

export async function crearSesion(usuarioId: string): Promise<void> {
  const token = tokenAleatorio(32);
  await db.sesion.create({
    data: { id: huellaToken(token), usuarioId, expiraEn: new Date(Date.now() + INACTIVIDAD) },
  });
  const jar = await cookies();
  jar.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: produccion,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(MAXIMO / 1000),
  });
}

export async function leerSesion() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value;
  if (!token || !/^[A-Za-z0-9_-]{30,64}$/.test(token)) return null;
  const id = huellaToken(token);
  const sesion = await db.sesion.findUnique({ where: { id }, include: { usuario: true } });
  if (!sesion) return null;
  const ahora = Date.now();
  const fin = sesion.creadaEn.getTime() + MAXIMO;
  if (sesion.expiraEn.getTime() <= ahora || fin <= ahora || !sesion.usuario.activo) {
    await db.sesion.deleteMany({ where: { id } });
    return null;
  }
  if (ahora - sesion.vistaEn.getTime() > REFRESCO) {
    await db.sesion
      .update({ where: { id }, data: { vistaEn: new Date(ahora), expiraEn: new Date(Math.min(ahora + INACTIVIDAD, fin)) } })
      .catch(() => undefined);
  }
  return sesion;
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESION)?.value;
  if (token) await db.sesion.deleteMany({ where: { id: huellaToken(token) } });
  jar.delete(COOKIE_SESION);
}

export async function cerrarSesionesDe(usuarioId: string, salvoActual = false): Promise<void> {
  let excepto: string | undefined;
  if (salvoActual) {
    const token = (await cookies()).get(COOKIE_SESION)?.value;
    excepto = token ? huellaToken(token) : undefined;
  }
  await db.sesion.deleteMany({ where: { usuarioId, ...(excepto ? { id: { not: excepto } } : {}) } });
}
