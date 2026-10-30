import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { diaColombia, fechaDia } from "@/lib/formato";
import {
  MAX_CANTIDAD,
  MAX_LINEAS,
  TRANSICIONES,
  type EstadoPedido,
  type PedidoClienteDTO,
  type PedidoDTO,
} from "@/lib/pedido";
import { cotizar, detallesLinea, normalizarSeleccion, tituloLinea, validarSeleccion } from "@/lib/precios";
import { leerAjustes } from "./ajustes";
import type { UsuarioPanel } from "./auth/acceso";
import { productosParaPedido } from "./carta";
import { db } from "./db";
import { ErrorNegocio, noEncontrado } from "./errores";
import { avisarPedido } from "./eventos";

const esquemaPedido = z.object({
  cliente: z.string().trim().min(1, "Escribe tu nombre para saber de quién es el pedido.").max(40, "El nombre es muy largo."),
  nota: z.string().trim().max(200, "El comentario es muy largo.").optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1).max(40),
        opciones: z.record(z.string().max(40), z.string().max(40)).default({}),
        toppings: z.array(z.string().max(40)).max(40).default([]),
        cantidad: z.number().int().min(1, "La cantidad mínima es 1.").max(MAX_CANTIDAD, `Máximo ${MAX_CANTIDAD} unidades por producto.`),
        nota: z.string().trim().max(120, "Una indicación es muy larga.").optional(),
      }),
    )
    .min(1, "Tu pedido está vacío.")
    .max(MAX_LINEAS, "Son demasiados productos en un solo pedido."),
});

const INCLUIR_ITEMS = { items: { orderBy: { orden: "asc" } } } as const;
type PedidoConItems = Prisma.PedidoGetPayload<{ include: typeof INCLUIR_ITEMS }>;

export function pedidoDTO(p: PedidoConItems): PedidoDTO {
  return {
    id: p.id,
    numero: p.numero,
    mesaId: p.mesaId,
    mesaNumero: p.mesaNumero,
    cliente: p.cliente,
    nota: p.nota,
    estado: p.estado,
    total: p.total,
    metodoPago: p.metodoPago,
    creadoEn: p.creadoEn.toISOString(),
    pagadoEn: p.pagadoEn?.toISOString() ?? null,
    impresoEn: p.impresoEn?.toISOString() ?? null,
    items: p.items.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      detalles: i.detalles,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      subtotal: i.subtotal,
      nota: i.nota,
    })),
  };
}

/**
 * Pedido desde el QR de una mesa. El servidor valida cada línea contra la carta actual
 * y calcula todos los precios: lo que diga el navegador sobre precios no cuenta.
 */
export async function crearPedido(codigo: string, entrada: unknown) {
  const datos = esquemaPedido.safeParse(entrada);
  if (!datos.success) throw new ErrorNegocio(datos.error.issues[0]?.message ?? "Revisa tu pedido.");

  const mesa = await db.mesa.findUnique({ where: { codigo } });
  if (!mesa || !mesa.activa) throw new ErrorNegocio("Este código QR ya no está activo. Pide ayuda al personal.", 404);
  const ajustes = await leerAjustes();
  if (!ajustes.recibiendoPedidos) {
    throw new ErrorNegocio("En este momento no estamos recibiendo pedidos por el QR. Pide ayuda al personal.", 409);
  }

  const productos = await productosParaPedido([...new Set(datos.data.items.map((item) => item.productoId))]);
  const items = datos.data.items.map((item, orden) => {
    const producto = productos.get(item.productoId);
    if (!producto || !producto.visible) {
      throw new ErrorNegocio("Uno de los productos ya no está en la carta. Revisa tu pedido.", 409);
    }
    const errores = validarSeleccion(producto, { opciones: item.opciones, toppings: item.toppings });
    if (errores.length > 0) throw new ErrorNegocio(`${producto.nombre}: ${errores[0].mensaje}`, 409);
    const seleccion = normalizarSeleccion(producto, { opciones: item.opciones, toppings: item.toppings });
    const cotizacion = cotizar(producto, seleccion);
    if (!cotizacion) throw new ErrorNegocio(`${producto.nombre}: esa combinación no está disponible.`, 409);
    return {
      productoId: producto.id,
      nombre: tituloLinea(producto, cotizacion),
      detalles: detallesLinea(producto, seleccion, cotizacion),
      cantidad: item.cantidad,
      precioUnitario: cotizacion.precio,
      subtotal: cotizacion.precio * item.cantidad,
      nota: item.nota || null,
      orden,
    };
  });
  const total = items.reduce((suma, item) => suma + item.subtotal, 0);

  const dia = diaColombia();
  const pedido = await db.$transaction(async (tx) => {
    // Consecutivo del día: una sola sentencia atómica, sin choques entre pedidos simultáneos.
    const filas = await tx.$queryRaw<{ ultimo: number }[]>`
      INSERT INTO "ContadorPedidos" ("fecha", "ultimo") VALUES (${dia}::date, 1)
      ON CONFLICT ("fecha") DO UPDATE SET "ultimo" = "ContadorPedidos"."ultimo" + 1
      RETURNING "ultimo"`;
    return tx.pedido.create({
      data: {
        fecha: fechaDia(dia),
        numero: filas[0].ultimo,
        mesaId: mesa.id,
        mesaNumero: mesa.numero,
        cliente: datos.data.cliente,
        nota: datos.data.nota || null,
        total,
        items: { create: items },
      },
      select: { id: true, numero: true, total: true, estado: true },
    });
  });
  avisarPedido({ tipo: "creado", pedidoId: pedido.id, numero: pedido.numero, mesaNumero: mesa.numero, estado: pedido.estado });
  return { ...pedido, mesaNumero: mesa.numero };
}

/** El pedido tal como lo sigue el cliente (solo si es de esa mesa). */
export async function pedidoDeMesa(codigo: string, id: string): Promise<PedidoClienteDTO> {
  const pedido = await db.pedido.findFirst({ where: { id, mesa: { codigo } }, include: INCLUIR_ITEMS });
  if (!pedido) throw noEncontrado("El pedido");
  return {
    id: pedido.id,
    numero: pedido.numero,
    mesaNumero: pedido.mesaNumero,
    cliente: pedido.cliente,
    estado: pedido.estado,
    total: pedido.total,
    pagado: pedido.pagadoEn !== null,
    creadoEn: pedido.creadoEn.toISOString(),
    items: pedido.items.map(({ nombre, detalles, cantidad, subtotal, nota }) => ({ nombre, detalles, cantidad, subtotal, nota })),
  };
}

/** Condición de «pedido abierto»: no cancelado y no (entregado y pagado). */
export const ABIERTO: Prisma.PedidoWhereInput = {
  estado: { not: "CANCELADO" },
  OR: [{ estado: { not: "ENTREGADO" } }, { pagadoEn: null }],
};

export async function pedidosAbiertos(): Promise<PedidoDTO[]> {
  const pedidos = await db.pedido.findMany({ where: ABIERTO, orderBy: { creadoEn: "asc" }, include: INCLUIR_ITEMS });
  return pedidos.map(pedidoDTO);
}

export async function pedidoPorId(id: string): Promise<PedidoDTO> {
  const pedido = await db.pedido.findUnique({ where: { id }, include: INCLUIR_ITEMS });
  if (!pedido) throw noEncontrado("El pedido");
  return pedidoDTO(pedido);
}

async function avisar(id: string) {
  const p = await db.pedido.findUnique({ where: { id }, select: { id: true, numero: true, mesaNumero: true, estado: true } });
  if (p) avisarPedido({ tipo: "actualizado", pedidoId: p.id, numero: p.numero, mesaNumero: p.mesaNumero, estado: p.estado });
}

/** Mueve un pedido en cocina/servicio. Solo un administrador cancela un pedido ya cobrado. */
export async function cambiarEstado(id: string, destino: EstadoPedido, usuario: UsuarioPanel) {
  const pedido = await db.pedido.findUnique({ where: { id }, select: { estado: true, pagadoEn: true } });
  if (!pedido) throw noEncontrado("El pedido");
  if (!TRANSICIONES[pedido.estado].includes(destino)) {
    throw new ErrorNegocio("Ese cambio no aplica al estado actual del pedido. Actualiza la página.", 409);
  }
  if (destino === "CANCELADO" && pedido.pagadoEn && usuario.rol !== "ADMIN") {
    throw new ErrorNegocio("Este pedido ya está cobrado: solo un administrador puede cancelarlo.", 403);
  }
  // Solo cambia si nadie lo movió entretanto (dos personas en el panel a la vez).
  const { count } = await db.pedido.updateMany({ where: { id, estado: pedido.estado }, data: { estado: destino } });
  if (count === 0) throw new ErrorNegocio("Otra persona acaba de cambiar este pedido. Actualiza la página.", 409);
  await avisar(id);
}

/** Registra el pago de uno o varios pedidos (los cancelados y ya cobrados se ignoran). */
export async function cobrarPedidos(ids: string[], metodoPago: string) {
  const ajustes = await leerAjustes();
  if (!ajustes.metodosPago.includes(metodoPago)) throw new ErrorNegocio("Elige un método de pago de la lista.");
  const cobrables = await db.pedido.findMany({
    where: { id: { in: ids }, estado: { not: "CANCELADO" }, pagadoEn: null },
    select: { id: true, total: true },
  });
  if (cobrables.length === 0) throw new ErrorNegocio("No hay pedidos pendientes por cobrar.", 409);
  await db.pedido.updateMany({
    where: { id: { in: cobrables.map((p) => p.id) }, pagadoEn: null },
    data: { pagadoEn: new Date(), metodoPago },
  });
  for (const { id } of cobrables) await avisar(id);
  return { pedidos: cobrables.length, total: cobrables.reduce((suma, p) => suma + p.total, 0) };
}

/** Cobra todo lo pendiente de una mesa. */
export async function cobrarMesa(mesaId: string, metodoPago: string) {
  const pendientes = await db.pedido.findMany({
    where: { mesaId, estado: { not: "CANCELADO" }, pagadoEn: null },
    select: { id: true },
  });
  return cobrarPedidos(
    pendientes.map((p) => p.id),
    metodoPago,
  );
}

/** Deshace un cobro registrado por error (solo administradores). */
export async function anularCobro(id: string, usuario: UsuarioPanel) {
  if (usuario.rol !== "ADMIN") throw new ErrorNegocio("Solo un administrador puede anular un cobro.", 403);
  const { count } = await db.pedido.updateMany({ where: { id, pagadoEn: { not: null } }, data: { pagadoEn: null, metodoPago: null } });
  if (count === 0) throw new ErrorNegocio("Ese pedido no tiene un cobro registrado.", 409);
  await avisar(id);
}

export async function marcarImpreso(id: string) {
  await db.pedido.update({ where: { id }, data: { impresoEn: new Date() } }).catch(() => {
    throw noEncontrado("El pedido");
  });
}

