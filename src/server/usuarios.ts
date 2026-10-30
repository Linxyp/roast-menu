import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { cifrarClave, problemasClave, verificarClave } from "./auth/clave";
import { cerrarSesionesDe } from "./auth/sesion";
import { db } from "./db";
import { ErrorNegocio, noEncontrado } from "./errores";

export async function listarUsuarios() {
  return db.usuario.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: { id: true, usuario: true, nombre: true, rol: true, activo: true, creadoEn: true },
  });
}

function validarClave(clave: string) {
  const problemas = problemasClave(clave);
  if (problemas.length) throw new ErrorNegocio(problemas.join(" "), 400, { clave: problemas.join(" ") });
}

function normalizarUsuario(usuario: string) {
  const limpio = usuario.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(limpio)) {
    throw new ErrorNegocio("El usuario debe tener de 3 a 30 letras, números, puntos o guiones (sin espacios).", 400, {
      usuario: "Usa de 3 a 30 letras o números, sin espacios.",
    });
  }
  return limpio;
}

export async function crearUsuario(datos: { usuario: string; nombre: string; rol: Rol; clave: string }) {
  const usuario = normalizarUsuario(datos.usuario);
  const nombre = datos.nombre.trim().slice(0, 60);
  if (!nombre) throw new ErrorNegocio("Escribe el nombre de la persona.", 400, { nombre: "Escribe el nombre." });
  validarClave(datos.clave);
  try {
    await db.usuario.create({ data: { usuario, nombre, rol: datos.rol, claveHash: await cifrarClave(datos.clave) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ErrorNegocio("Ese usuario ya existe.", 400, { usuario: "Ese usuario ya existe." });
    }
    throw error;
  }
}

/** Siempre debe quedar al menos un administrador activo. */
async function exigirOtroAdmin(id: string) {
  const otros = await db.usuario.count({ where: { rol: "ADMIN", activo: true, id: { not: id } } });
  if (otros === 0) throw new ErrorNegocio("Debe quedar al menos un administrador activo.", 409);
}

export async function actualizarUsuario(id: string, cambios: { nombre?: string; rol?: Rol; activo?: boolean }) {
  const actual = await db.usuario.findUnique({ where: { id } });
  if (!actual) throw noEncontrado("El usuario");
  const pierdeAdmin = actual.rol === "ADMIN" && actual.activo && (cambios.rol === "PERSONAL" || cambios.activo === false);
  if (pierdeAdmin) await exigirOtroAdmin(id);
  await db.usuario.update({
    where: { id },
    data: { nombre: cambios.nombre?.trim().slice(0, 60) || undefined, rol: cambios.rol, activo: cambios.activo },
  });
  if (cambios.activo === false) await cerrarSesionesDe(id);
}

export async function restablecerClave(id: string, clave: string) {
  validarClave(clave);
  await db.usuario.update({ where: { id }, data: { claveHash: await cifrarClave(clave) } });
  await cerrarSesionesDe(id);
}

export async function cambiarMiClave(usuarioId: string, actual: string, nueva: string) {
  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !(await verificarClave(actual, usuario.claveHash))) {
    throw new ErrorNegocio("La contraseña actual no es correcta.", 400, { actual: "No es correcta." });
  }
  validarClave(nueva);
  await db.usuario.update({ where: { id: usuarioId }, data: { claveHash: await cifrarClave(nueva) } });
  await cerrarSesionesDe(usuarioId, true);
}
