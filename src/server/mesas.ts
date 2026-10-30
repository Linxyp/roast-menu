import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { PedidoDTO } from "@/lib/pedido";
import { codigoMesa } from "./crypto";
import { db } from "./db";
import { ErrorNegocio, noEncontrado } from "./errores";
import { ABIERTO, pedidoDTO } from "./pedidos";

export interface MesaResumen {
  id: string;
  numero: number;
  nombre: string | null;
  codigo: string;
  activa: boolean;
  /** Pedidos abiertos (sin entregar o sin cobrar). */
  abiertos: number;
  /** Suma de lo que falta por cobrar. */
  porCobrar: number;
  /** Algún pedido todavía sin entregar. */
  enCocina: boolean;
}

/** Dirección que va dentro del QR de la mesa. */
export function urlMesa(codigo: string): string {
  const base = (process.env.APP_URL || "http://localhost:3520").replace(/\/+$/, "");
  return `${base}/m/${codigo}`;
}

export async function listarMesas(): Promise<MesaResumen[]> {
  const mesas = await db.mesa.findMany({
    orderBy: { numero: "asc" },
    include: { pedidos: { where: ABIERTO, select: { total: true, pagadoEn: true, estado: true } } },
  });
  return mesas.map((m) => ({
    id: m.id,
    numero: m.numero,
    nombre: m.nombre,
    codigo: m.codigo,
    activa: m.activa,
    abiertos: m.pedidos.length,
    porCobrar: m.pedidos.filter((p) => !p.pagadoEn).reduce((suma, p) => suma + p.total, 0),
    enCocina: m.pedidos.some((p) => p.estado !== "ENTREGADO"),
  }));
}

export async function mesaPorCodigo(codigo: string) {
  if (!/^[a-z0-9]{6,16}$/.test(codigo)) return null;
  return db.mesa.findUnique({ where: { codigo }, select: { id: true, numero: true, nombre: true, codigo: true, activa: true } });
}

/** Cuenta de la mesa: lo pendiente por cobrar y lo ya cobrado hoy. */
export async function cuentaMesa(mesaId: string): Promise<{ mesa: MesaResumen; pendientes: PedidoDTO[]; cobradosHoy: PedidoDTO[] }> {
  const mesa = (await listarMesas()).find((m) => m.id === mesaId);
  if (!mesa) throw noEncontrado("La mesa");
  const desde = new Date(Date.now() - 18 * 3600 * 1000);
  const [pendientes, cobrados] = await Promise.all([
    db.pedido.findMany({
      where: { mesaId, estado: { not: "CANCELADO" }, pagadoEn: null },
      orderBy: { creadoEn: "asc" },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
    db.pedido.findMany({
      where: { mesaId, estado: { not: "CANCELADO" }, pagadoEn: { gte: desde } },
      orderBy: { pagadoEn: "desc" },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
  ]);
  return { mesa, pendientes: pendientes.map(pedidoDTO), cobradosHoy: cobrados.map(pedidoDTO) };
}

export async function agregarMesas(cantidad: number) {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) throw new ErrorNegocio("Agrega entre 1 y 50 mesas a la vez.");
  const { _max } = await db.mesa.aggregate({ _max: { numero: true } });
  let numero = (_max.numero ?? 0) + 1;
  for (let i = 0; i < cantidad; i++, numero++) {
    await db.mesa.create({ data: { numero, codigo: codigoMesa() } });
  }
}

export async function actualizarMesa(id: string, cambios: { nombre?: string | null; activa?: boolean; numero?: number }) {
  const nombre = cambios.nombre === undefined ? undefined : cambios.nombre?.trim().slice(0, 30) || null;
  if (cambios.numero !== undefined && (!Number.isInteger(cambios.numero) || cambios.numero < 1 || cambios.numero > 999)) {
    throw new ErrorNegocio("El número de mesa debe estar entre 1 y 999.");
  }
  try {
    await db.mesa.update({ where: { id }, data: { nombre, activa: cambios.activa, numero: cambios.numero } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ErrorNegocio("Ya existe una mesa con ese número.");
    }
    throw noEncontrado("La mesa");
  }
}

/** Código nuevo para el QR: el QR viejo de esa mesa deja de servir. */
export async function cambiarCodigo(id: string) {
  await db.mesa.update({ where: { id }, data: { codigo: codigoMesa() } });
}

/** Borra la mesa; si ya tiene pedidos (historial de ventas), solo la desactiva. */
export async function eliminarMesa(id: string): Promise<"eliminada" | "desactivada"> {
  const abiertos = await db.pedido.count({ where: { mesaId: id, ...ABIERTO } });
  if (abiertos > 0) throw new ErrorNegocio("La mesa tiene pedidos abiertos: entrégalos y cóbralos primero.", 409);
  const conHistorial = await db.pedido.count({ where: { mesaId: id } });
  if (conHistorial > 0) {
    await db.mesa.update({ where: { id }, data: { activa: false } });
    return "desactivada";
  }
  await db.mesa.delete({ where: { id } });
  return "eliminada";
}
