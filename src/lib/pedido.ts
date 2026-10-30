// Tipos y reglas de los pedidos que comparten el panel, la página de la mesa y el servidor.

export type EstadoPedido = "NUEVO" | "PREPARANDO" | "LISTO" | "ENTREGADO" | "CANCELADO";

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
  mesaId: string | null;
  mesaNumero: number;
  cliente: string;
  nota: string | null;
  estado: EstadoPedido;
  total: number;
  metodoPago: string | null;
  creadoEn: string;
  pagadoEn: string | null;
  impresoEn: string | null;
  items: ItemPedidoDTO[];
}

/** Un pedido sigue abierto hasta que se entrega y se cobra (o se cancela). */
export function estaAbierto(pedido: Pick<PedidoDTO, "estado" | "pagadoEn">): boolean {
  return pedido.estado !== "CANCELADO" && !(pedido.estado === "ENTREGADO" && pedido.pagadoEn);
}

/** Lo que el cliente ve de su pedido desde la mesa. */
export interface PedidoClienteDTO {
  id: string;
  numero: number;
  mesaNumero: number;
  cliente: string;
  estado: EstadoPedido;
  total: number;
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

export const MAX_CANTIDAD = 20;
export const MAX_LINEAS = 30;
