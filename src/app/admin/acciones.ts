"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Rol } from "@/generated/prisma/enums";
import type { ImagenDTO } from "@/lib/carta";
import type { EstadoPedido } from "@/lib/pedido";
import { cambiarRecepcion, guardarAjustes } from "@/server/ajustes";
import { requerirApi } from "@/server/auth/acceso";
import { igualarTiempo, verificarClave } from "@/server/auth/clave";
import { cerrarSesion, crearSesion } from "@/server/auth/sesion";
import * as carta from "@/server/carta-admin";
import { huellaIp } from "@/server/crypto";
import { db } from "@/server/db";
import { ErrorNegocio } from "@/server/errores";
import { guardarImagenSubida, imagenDTO } from "@/server/imagenes";
import { contarIntento, LIMITES, reiniciarLimite } from "@/server/limite";
import * as mesas from "@/server/mesas";
import * as pedidos from "@/server/pedidos";
import { ipCliente } from "@/server/solicitud";
import * as usuarios from "@/server/usuarios";

export type Resultado<T = null> =
  | { ok: true; datos: T; mensaje?: string }
  | { ok: false; error: string; campos?: Record<string, string> };

function fallo(error: unknown): { ok: false; error: string; campos?: Record<string, string> } {
  if (error instanceof ErrorNegocio) return { ok: false, error: error.message, campos: error.campos };
  console.error(error);
  return { ok: false, error: "Algo salió mal. Intenta de nuevo en un momento." };
}

/** Ejecuta una acción del panel con su permiso y deja el resultado listo para la interfaz. */
async function accion<T>(rol: Rol | undefined, rutas: string[], tarea: () => Promise<T>, mensaje?: string): Promise<Resultado<T>> {
  try {
    await requerirApi(rol);
    const datos = await tarea();
    for (const ruta of rutas) revalidatePath(ruta);
    return { ok: true, datos, mensaje };
  } catch (error) {
    return fallo(error);
  }
}

// ---------------------------------------------------------------------
// Ingreso
// ---------------------------------------------------------------------

export interface EstadoIngreso {
  error?: string;
}

function destinoSeguro(ruta: string): string {
  return ruta.startsWith("/admin") && !ruta.startsWith("//") && !ruta.startsWith("/admin/ingresar") ? ruta : "/admin";
}

export async function ingresar(_previo: EstadoIngreso, formulario: FormData): Promise<EstadoIngreso> {
  const usuario = String(formulario.get("usuario") ?? "").trim().toLowerCase().slice(0, 40);
  const clave = String(formulario.get("clave") ?? "").slice(0, 200);
  const ip = huellaIp(await ipCliente());
  const permitido =
    (await contarIntento(`ingreso:ip:${ip}`, LIMITES.ingresoPorIp)) &&
    (await contarIntento(`ingreso:usuario:${usuario}`, LIMITES.ingresoPorUsuario));
  if (!permitido) return { error: "Demasiados intentos seguidos. Espera 15 minutos e intenta de nuevo." };

  const registro = usuario ? await db.usuario.findUnique({ where: { usuario } }) : null;
  if (!registro || !registro.activo) {
    await igualarTiempo(clave);
    return { error: "Usuario o contraseña incorrectos." };
  }
  if (!(await verificarClave(clave, registro.claveHash))) return { error: "Usuario o contraseña incorrectos." };
  await reiniciarLimite(`ingreso:usuario:${usuario}`);
  await crearSesion(registro.id);
  redirect(destinoSeguro(String(formulario.get("siguiente") ?? "/admin")));
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin/ingresar");
}

// ---------------------------------------------------------------------
// Pedidos y cobros
// ---------------------------------------------------------------------

export async function cambiarEstadoPedido(id: string, destino: EstadoPedido) {
  return accion(undefined, ["/admin/mesas"], async () => {
    const usuario = await requerirApi();
    await pedidos.cambiarEstado(id, destino, usuario);
    return null;
  });
}

export async function cobrarPedidos(ids: string[], metodoPago: string) {
  return accion(undefined, ["/admin/mesas", "/admin/ventas"], () => pedidos.cobrarPedidos(ids, metodoPago));
}

export async function cobrarMesa(mesaId: string, metodoPago: string) {
  return accion(undefined, ["/admin/mesas", "/admin/ventas"], () => pedidos.cobrarMesa(mesaId, metodoPago));
}

export async function anularCobro(id: string) {
  return accion("ADMIN", ["/admin/mesas", "/admin/ventas"], async () => {
    await pedidos.anularCobro(id, await requerirApi("ADMIN"));
    return null;
  });
}

export async function marcarImpreso(id: string) {
  return accion(undefined, [], async () => {
    await pedidos.marcarImpreso(id);
    return null;
  });
}

export async function cambiarRecepcionPedidos(recibiendo: boolean) {
  return accion(undefined, ["/admin", "/admin/ajustes"], async () => {
    await cambiarRecepcion(recibiendo);
    return null;
  });
}

// ---------------------------------------------------------------------
// Mesas
// ---------------------------------------------------------------------

export async function agregarMesas(cantidad: number) {
  return accion("ADMIN", ["/admin/mesas", "/admin/mesas/configurar"], async () => {
    await mesas.agregarMesas(cantidad);
    return null;
  });
}

export async function actualizarMesa(id: string, cambios: { nombre?: string | null; activa?: boolean; numero?: number }) {
  return accion("ADMIN", ["/admin/mesas", "/admin/mesas/configurar"], async () => {
    await mesas.actualizarMesa(id, cambios);
    return null;
  });
}

export async function cambiarCodigoMesa(id: string) {
  return accion("ADMIN", ["/admin/mesas/configurar"], async () => {
    await mesas.cambiarCodigo(id);
    return null;
  }, "Código nuevo listo: imprime otra vez el QR de esa mesa.");
}

export async function eliminarMesa(id: string) {
  return accion("ADMIN", ["/admin/mesas", "/admin/mesas/configurar"], () => mesas.eliminarMesa(id));
}

// ---------------------------------------------------------------------
// Carta
// ---------------------------------------------------------------------

const RUTAS_CARTA = ["/admin/carta", "/admin/carta/categorias", "/admin/carta/toppings"];

export async function subirFoto(formulario: FormData): Promise<Resultado<ImagenDTO>> {
  return accion("ADMIN", [], async () => imagenDTO(await guardarImagenSubida(formulario.get("foto")))!);
}

export async function guardarProducto(datos: carta.ProductoEditable) {
  return accion("ADMIN", RUTAS_CARTA, () => carta.guardarProducto(datos), "Producto guardado.");
}

export async function cambiarEstadoProducto(id: string, cambios: { visible?: boolean; agotado?: boolean }) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.cambiarEstadoProducto(id, cambios);
    return null;
  });
}

export async function moverProducto(id: string, direccion: -1 | 1) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.moverProducto(id, direccion);
    return null;
  });
}

export async function eliminarProducto(id: string) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.eliminarProducto(id);
    return null;
  });
}

export async function cambiarDisponibleOpcion(id: string, disponible: boolean) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.cambiarDisponibleOpcion(id, disponible);
    return null;
  });
}

export async function guardarCategoria(datos: unknown) {
  return accion("ADMIN", RUTAS_CARTA, () => carta.guardarCategoria(datos), "Categoría guardada.");
}

export async function moverCategoria(id: string, direccion: -1 | 1) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.moverCategoria(id, direccion);
    return null;
  });
}

export async function eliminarCategoria(id: string) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.eliminarCategoria(id);
    return null;
  });
}

export async function guardarLista(datos: unknown) {
  return accion("ADMIN", RUTAS_CARTA, () => carta.guardarLista(datos));
}

export async function eliminarLista(id: string) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.eliminarLista(id);
    return null;
  });
}

export async function guardarTopping(datos: unknown) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.guardarTopping(datos);
    return null;
  });
}

export async function cambiarDisponibleTopping(id: string, disponible: boolean) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.cambiarDisponibleTopping(id, disponible);
    return null;
  });
}

export async function moverTopping(id: string, direccion: -1 | 1) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.moverTopping(id, direccion);
    return null;
  });
}

export async function eliminarTopping(id: string) {
  return accion("ADMIN", RUTAS_CARTA, async () => {
    await carta.eliminarTopping(id);
    return null;
  });
}

// ---------------------------------------------------------------------
// Ajustes y usuarios
// ---------------------------------------------------------------------

export async function guardarAjustesNegocio(datos: unknown) {
  return accion("ADMIN", ["/admin/ajustes", "/admin"], async () => {
    await guardarAjustes(datos);
    return null;
  }, "Ajustes guardados.");
}

export async function crearUsuario(datos: { usuario: string; nombre: string; rol: Rol; clave: string }) {
  return accion("ADMIN", ["/admin/ajustes"], async () => {
    await usuarios.crearUsuario(datos);
    return null;
  }, "Usuario creado.");
}

export async function actualizarUsuario(id: string, cambios: { nombre?: string; rol?: Rol; activo?: boolean }) {
  return accion("ADMIN", ["/admin/ajustes"], async () => {
    await usuarios.actualizarUsuario(id, cambios);
    return null;
  });
}

export async function restablecerClave(id: string, clave: string) {
  return accion("ADMIN", ["/admin/ajustes"], async () => {
    await usuarios.restablecerClave(id, clave);
    return null;
  }, "Contraseña cambiada. Esa persona debe volver a ingresar.");
}

export async function cambiarMiClave(actual: string, nueva: string) {
  return accion(undefined, [], async () => {
    const yo = await requerirApi();
    await usuarios.cambiarMiClave(yo.id, actual, nueva);
    return null;
  }, "Tu contraseña quedó cambiada.");
}
