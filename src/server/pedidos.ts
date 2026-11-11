import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { diaColombia, fechaDia, pesos } from "@/lib/formato";
import {
  MAX_CANTIDAD,
  MAX_LINEAS,
  TRANSICIONES,
  esEfectivo,
  normalizarTelefono,
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

const esquemaDomicilio = esquemaPedido.extend({
  telefono: z
    .string()
    .max(25)
    .transform((texto, ctx) => {
      const telefono = normalizarTelefono(texto);
      if (!telefono) {
        ctx.addIssue({ code: "custom", message: "Escribe un celular de 10 dígitos, por ejemplo 3001234567." });
        return z.NEVER;
      }
      return telefono;
    }),
  direccion: z.string().trim().min(5, "Escribe la dirección completa (calle, número, casa o apartamento).").max(120, "La dirección es muy larga."),
  barrio: z.string().trim().min(2, "Escribe el barrio.").max(60, "El nombre del barrio es muy largo."),
  referencia: z.string().trim().max(160, "La referencia es muy larga.").optional(),
  pago: z.string().trim().min(1, "Elige cómo vas a pagar.").max(30),
  pagaCon: z.number().int().min(1).max(10_000_000).optional(),
});

const INCLUIR_ITEMS = { items: { orderBy: { orden: "asc" } } } as const;
type PedidoConItems = Prisma.PedidoGetPayload<{ include: typeof INCLUIR_ITEMS }>;

export function pedidoDTO(p: PedidoConItems): PedidoDTO {
  return {
    id: p.id,
    numero: p.numero,
    tipo: p.tipo,
    mesaId: p.mesaId,
    mesaNumero: p.mesaNumero,
    cliente: p.cliente,
    nota: p.nota,
    telefono: p.telefono,
    direccion: p.direccion,
    barrio: p.barrio,
    referencia: p.referencia,
    pagoPreferido: p.pagoPreferido,
    pagaCon: p.pagaCon,
    costoEnvio: p.costoEnvio,
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
 * Valida cada línea contra la carta actual y calcula todos los precios: lo que diga el
 * navegador sobre precios no cuenta.
 */
async function cotizarLineas(items: z.output<typeof esquemaPedido>["items"]) {
  const productos = await productosParaPedido([...new Set(items.map((item) => item.productoId))]);
  const lineas = items.map((item, orden) => {
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
  return { lineas, subtotal: lineas.reduce((suma, linea) => suma + linea.subtotal, 0) };
}

type DatosPedido = Omit<Prisma.PedidoUncheckedCreateInput, "fecha" | "numero" | "items">;
type Linea = Awaited<ReturnType<typeof cotizarLineas>>["lineas"][number];

/** Guarda el pedido con el consecutivo del día y avisa al panel en vivo. */
async function guardarPedido(datos: DatosPedido, lineas: Linea[]) {
  const dia = diaColombia();
  const pedido = await db.$transaction(async (tx) => {
    // Consecutivo del día: una sola sentencia atómica, sin choques entre pedidos simultáneos.
    const filas = await tx.$queryRaw<{ ultimo: number }[]>`
      INSERT INTO "ContadorPedidos" ("fecha", "ultimo") VALUES (${dia}::date, 1)
      ON CONFLICT ("fecha") DO UPDATE SET "ultimo" = "ContadorPedidos"."ultimo" + 1
      RETURNING "ultimo"`;
    return tx.pedido.create({
      data: { ...datos, fecha: fechaDia(dia), numero: filas[0].ultimo, items: { create: lineas } },
      select: { id: true, numero: true, total: true, estado: true, tipo: true, mesaNumero: true },
    });
  });
  avisarPedido({ tipo: "creado", pedidoId: pedido.id, numero: pedido.numero, mesaNumero: pedido.mesaNumero, estado: pedido.estado });
  return pedido;
}

/** Pedido desde el QR de una mesa. */
export async function crearPedido(codigo: string, entrada: unknown) {
  const datos = esquemaPedido.safeParse(entrada);
  if (!datos.success) throw new ErrorNegocio(datos.error.issues[0]?.message ?? "Revisa tu pedido.");

  const mesa = await db.mesa.findUnique({ where: { codigo } });
  if (!mesa || !mesa.activa) throw new ErrorNegocio("Este código QR ya no está activo. Pide ayuda al personal.", 404);
  const ajustes = await leerAjustes();
  if (!ajustes.recibiendoPedidos) {
    throw new ErrorNegocio("En este momento no estamos recibiendo pedidos por el QR. Pide ayuda al personal.", 409);
  }
  const { lineas, subtotal } = await cotizarLineas(datos.data.items);
  return guardarPedido(
    { tipo: "MESA", mesaId: mesa.id, mesaNumero: mesa.numero, cliente: datos.data.cliente, nota: datos.data.nota || null, total: subtotal },
    lineas,
  );
}

/**
 * Pedido a domicilio desde el QR de domicilios. El valor del domicilio sale de Ajustes; si no
 * está definido queda «por confirmar» y el panel lo fija antes de cobrar.
 */
export async function crearDomicilio(entrada: unknown) {
  const datos = esquemaDomicilio.safeParse(entrada);
  if (!datos.success) throw new ErrorNegocio(datos.error.issues[0]?.message ?? "Revisa tus datos.");
  const d = datos.data;

  const ajustes = await leerAjustes();
  if (!ajustes.recibiendoPedidos || !ajustes.domiciliosActivos) {
    throw new ErrorNegocio("En este momento no estamos tomando domicilios. Intenta de nuevo más tarde.", 409);
  }
  if (!ajustes.metodosPago.includes(d.pago)) throw new ErrorNegocio("Elige cómo vas a pagar.");

  const { lineas, subtotal } = await cotizarLineas(d.items);
  if (subtotal < ajustes.pedidoMinimoDomicilio) {
    throw new ErrorNegocio(`El pedido mínimo para domicilio es ${pesos(ajustes.pedidoMinimoDomicilio)}.`, 409);
  }
  const costoEnvio = ajustes.costoDomicilio;
  const total = subtotal + (costoEnvio ?? 0);
  const pagaCon = esEfectivo(d.pago) ? (d.pagaCon ?? null) : null;
  if (pagaCon !== null && pagaCon < total) {
    throw new ErrorNegocio(`Con ${pesos(pagaCon)} no alcanza: el total es ${pesos(total)}.`);
  }
  return guardarPedido(
    {
      tipo: "DOMICILIO",
      cliente: d.cliente,
      nota: d.nota || null,
      telefono: d.telefono,
      direccion: d.direccion,
      barrio: d.barrio,
      referencia: d.referencia || null,
      pagoPreferido: d.pago,
      pagaCon,
      costoEnvio,
      total,
    },
    lineas,
  );
}

function pedidoClienteDTO(pedido: PedidoConItems): PedidoClienteDTO {
  return {
    id: pedido.id,
    numero: pedido.numero,
    tipo: pedido.tipo,
    mesaNumero: pedido.mesaNumero,
    cliente: pedido.cliente,
    estado: pedido.estado,
    total: pedido.total,
    costoEnvio: pedido.costoEnvio,
    pagado: pedido.pagadoEn !== null,
    creadoEn: pedido.creadoEn.toISOString(),
    items: pedido.items.map(({ nombre, detalles, cantidad, subtotal, nota }) => ({ nombre, detalles, cantidad, subtotal, nota })),
  };
}

/** El pedido tal como lo sigue el cliente (solo si es de esa mesa). */
export async function pedidoDeMesa(codigo: string, id: string): Promise<PedidoClienteDTO> {
  const pedido = await db.pedido.findFirst({ where: { id, mesa: { codigo } }, include: INCLUIR_ITEMS });
  if (!pedido) throw noEncontrado("El pedido");
  return pedidoClienteDTO(pedido);
}

/** Un domicilio tal como lo sigue el cliente desde su casa (sin su teléfono ni su dirección). */
export async function pedidoDomicilio(id: string): Promise<PedidoClienteDTO> {
  const pedido = await db.pedido.findFirst({ where: { id, tipo: "DOMICILIO" }, include: INCLUIR_ITEMS });
  if (!pedido) throw noEncontrado("El pedido");
  return pedidoClienteDTO(pedido);
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
    select: { id: true, total: true, numero: true, tipo: true, costoEnvio: true },
  });
  if (cobrables.length === 0) throw new ErrorNegocio("No hay pedidos pendientes por cobrar.", 409);
  const sinValor = cobrables.find((p) => p.tipo === "DOMICILIO" && p.costoEnvio === null);
  if (sinValor) throw new ErrorNegocio(`Fija el valor del domicilio del pedido #${sinValor.numero} antes de cobrarlo.`, 409);
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

/**
 * Fija (o corrige) el valor del domicilio de un pedido antes de cobrarlo; el total se recalcula
 * con los productos más el domicilio.
 */
export async function fijarCostoEnvio(id: string, valor: number) {
  if (!Number.isInteger(valor) || valor < 0 || valor > 1_000_000) {
    throw new ErrorNegocio("Escribe el valor del domicilio en pesos, sin puntos (0 si es gratis).");
  }
  const pedido = await db.pedido.findUnique({ where: { id }, select: { tipo: true, total: true, costoEnvio: true, pagadoEn: true } });
  if (!pedido || pedido.tipo !== "DOMICILIO") throw noEncontrado("El domicilio");
  if (pedido.pagadoEn) throw new ErrorNegocio("Este domicilio ya está cobrado: anula el cobro para cambiar el valor.", 409);
  const productos = pedido.total - (pedido.costoEnvio ?? 0);
  // Solo cambia si nadie lo tocó entretanto (dos personas en el panel a la vez).
  const { count } = await db.pedido.updateMany({
    where: { id, pagadoEn: null, costoEnvio: pedido.costoEnvio },
    data: { costoEnvio: valor, total: productos + valor },
  });
  if (count === 0) throw new ErrorNegocio("Otra persona acaba de cambiar este pedido. Actualiza la página.", 409);
  await avisar(id);
}

export async function marcarImpreso(id: string) {
  await db.pedido.update({ where: { id }, data: { impresoEn: new Date() } }).catch(() => {
    throw noEncontrado("El pedido");
  });
}

