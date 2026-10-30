import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Rol } from "@/generated/prisma/enums";
import { ErrorNegocio } from "../errores";
import { leerSesion } from "./sesion";

export interface UsuarioPanel {
  id: string;
  usuario: string;
  nombre: string;
  rol: Rol;
}

/** Usuario de la petición actual (se resuelve una vez por petición y siempre contra la base). */
export const usuarioActual = cache(async (): Promise<UsuarioPanel | null> => {
  const sesion = await leerSesion();
  if (!sesion) return null;
  const { id, usuario, nombre, rol } = sesion.usuario;
  return { id, usuario, nombre, rol };
});

/** Para páginas del panel: sin sesión lleva a ingresar; sin permiso, al tablero. */
export async function requerirPagina(rol?: Rol): Promise<UsuarioPanel> {
  const usuario = await usuarioActual();
  if (!usuario) {
    const ruta = (await headers()).get("x-ruta-actual") ?? "/admin";
    redirect(`/admin/ingresar?siguiente=${encodeURIComponent(ruta)}`);
  }
  if (rol === "ADMIN" && usuario.rol !== "ADMIN") redirect("/admin?aviso=permiso");
  return usuario;
}

/** Para rutas de API y acciones del panel. */
export async function requerirApi(rol?: Rol): Promise<UsuarioPanel> {
  const usuario = await usuarioActual();
  if (!usuario) throw new ErrorNegocio("Tu sesión terminó. Vuelve a ingresar.", 401);
  if (rol === "ADMIN" && usuario.rol !== "ADMIN") throw new ErrorNegocio("Solo un administrador puede hacer esto.", 403);
  return usuario;
}
