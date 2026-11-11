// Tipos y reglas de los pedidos que comparten el panel, la página de la mesa y el servidor.

export type EstadoPedido = "NUEVO" | "PREPARANDO" | "LISTO" | "ENTREGADO" | "CANCELADO";

/** De dónde viene el pedido: el QR de una mesa o el QR de domicilios. */
export type TipoPedido = "MESA" | "DOMICILIO";

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  NUEVO: "Nuevo",
  PREPARANDO: "En preparación",
  LISTO: "Listo",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

/** A qué estados puede pasar un pedido (el panel ofrece solo estos botones). */
export const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  NUEVO: ["PREPARANDO", "LISTO", "ENTREGADO", "CANCELADO"],
  PREPARANDO: ["NUEVO", "LISTO", "ENTREGADO", "CANCELADO"],
  LISTO: ["PREPARANDO", "ENTREGADO", "CANCELADO"],
  ENTREGADO: ["LISTO", "CANCELADO"],
  CANCELADO: ["NUEVO"],
};

export interface ItemPedidoDTO {
  id: string;
  nombre: string;
  detalles: string[];
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  nota: string | null;
}

export interface PedidoDTO {
  id: string;
  numero: number;
  tipo: TipoPedido;
  mesaId: string | null;
  /** null en los domicilios. */
  mesaNumero: number | null;
  cliente: string;
  nota: string | null;
  /** Datos de entrega: solo en los domicilios. */
  telefono: string | null;
  direccion: string | null;
  barrio: string | null;
  referencia: string | null;
  pagoPreferido: string | null;
  pagaCon: number | null;
  /** Valor del domicilio ya sumado al total; null = por confirmar. */
  costoEnvio: number | null;
  estado: EstadoPedido;
  total: number;
  metodoPago: string | null;
  creadoEn: string;
  pagadoEn: string | null;
  impresoEn: string | null;
  items: ItemPedidoDTO[];
}

/** «Mesa 4» o «Domicilio»: de dónde es el pedido, para el panel y los recibos. */
export function lugarPedido(pedido: { tipo: TipoPedido; mesaNumero: number | null }): string {
  return pedido.tipo === "DOMICILIO" ? "Domicilio" : `Mesa ${pedido.mesaNumero}`;
}

/** Un pedido sigue abierto hasta que se entrega y se cobra (o se cancela). */
export function estaAbierto(pedido: Pick<PedidoDTO, "estado" | "pagadoEn">): boolean {
  return pedido.estado !== "CANCELADO" && !(pedido.estado === "ENTREGADO" && pedido.pagadoEn);
}

/** Lo que el cliente ve de su pedido (desde la mesa o desde su casa): sin teléfono ni dirección. */
export interface PedidoClienteDTO {
  id: string;
  numero: number;
  tipo: TipoPedido;
  mesaNumero: number | null;
  cliente: string;
  estado: EstadoPedido;
  total: number;
  costoEnvio: number | null;
  pagado: boolean;
  creadoEn: string;
  items: Pick<ItemPedidoDTO, "nombre" | "detalles" | "cantidad" | "subtotal" | "nota">[];
}

/** Línea que envía la página de la mesa al servidor (el servidor calcula los precios). */
export interface LineaEnvio {
  productoId: string;
  opciones: Record<string, string>;
  toppings: string[];
  cantidad: number;
  nota?: string;
}

/** Datos de entrega que envía la página de domicilios junto con las líneas. */
export interface EntregaEnvio {
  telefono: string;
  direccion: string;
  barrio: string;
  referencia?: string;
  pago: string;
  pagaCon?: number;
}

/**
 * Celular o fijo colombiano en 10 dígitos («300 123 4567», «+57 3001234567», «604 1234567»).
 * Devuelve solo los dígitos, o null si no es un número válido.
 */
export function normalizarTelefono(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");
  if (digitos.length === 12 && digitos.startsWith("57")) digitos = digitos.slice(2);
  return /^(3\d{9}|60\d{8})$/.test(digitos) ? digitos : null;
}

/** ¿El método de pago es en efectivo? (entonces se pregunta con cuánto paga, para llevar el cambio). */
export function esEfectivo(metodo: string): boolean {
  return /efectivo/i.test(metodo);
}

export const MAX_CANTIDAD = 20;
export const MAX_LINEAS = 30;
