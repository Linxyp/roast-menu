import "server-only";
import type { PedidoDTO } from "@/lib/pedido";
import { db } from "./db";
import { pedidoDTO } from "./pedidos";

export interface ResumenVentas {
  desde: string;
  hasta: string;
  total: number;
  pedidos: number;
  promedio: number;
  porMetodo: { metodo: string; total: number; pedidos: number }[];
  porProducto: { nombre: string; unidades: number; total: number }[];
  porMesa: { mesa: number; total: number; pedidos: number }[];
  lista: PedidoDTO[];
}

/** 00:00 en Colombia (UTC-5, sin horario de verano) del día dado. */
const inicioDia = (dia: string) => new Date(`${dia}T00:00:00-05:00`);

/** Ventas cobradas entre dos días (incluidos), por hora de cobro en Colombia. */
export async function resumenVentas(desde: string, hasta: string): Promise<ResumenVentas> {
  const fin = inicioDia(hasta);
  fin.setUTCDate(fin.getUTCDate() + 1);
  const pedidos = await db.pedido.findMany({
    where: { estado: { not: "CANCELADO" }, pagadoEn: { gte: inicioDia(desde), lt: fin } },
    orderBy: { pagadoEn: "desc" },
    include: { items: { orderBy: { orden: "asc" } } },
  });

  const metodos = new Map<string, { total: number; pedidos: number }>();
  const productos = new Map<string, { unidades: number; total: number }>();
  const mesas = new Map<number, { total: number; pedidos: number }>();
  for (const p of pedidos) {
    const m = metodos.get(p.metodoPago ?? "Sin método") ?? { total: 0, pedidos: 0 };
    metodos.set(p.metodoPago ?? "Sin método", { total: m.total + p.total, pedidos: m.pedidos + 1 });
    const mesa = mesas.get(p.mesaNumero) ?? { total: 0, pedidos: 0 };
    mesas.set(p.mesaNumero, { total: mesa.total + p.total, pedidos: mesa.pedidos + 1 });
    for (const item of p.items) {
      const prod = productos.get(item.nombre) ?? { unidades: 0, total: 0 };
      productos.set(item.nombre, { unidades: prod.unidades + item.cantidad, total: prod.total + item.subtotal });
    }
  }
  const total = pedidos.reduce((suma, p) => suma + p.total, 0);
  return {
    desde,
    hasta,
    total,
    pedidos: pedidos.length,
    promedio: pedidos.length ? Math.round(total / pedidos.length) : 0,
    porMetodo: [...metodos].map(([metodo, v]) => ({ metodo, ...v })).sort((a, b) => b.total - a.total),
    porProducto: [...productos].map(([nombre, v]) => ({ nombre, ...v })).sort((a, b) => b.unidades - a.unidades),
    porMesa: [...mesas].map(([mesa, v]) => ({ mesa, ...v })).sort((a, b) => a.mesa - b.mesa),
    lista: pedidos.map(pedidoDTO),
  };
}
