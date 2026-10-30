import "server-only";
import { EventEmitter } from "node:events";

/**
 * Avisos en vivo para el panel (Server-Sent Events). La aplicación corre en un solo
 * proceso, así que basta un emisor en memoria; se guarda en globalThis para que las
 * rutas (empaquetadas por separado) compartan el mismo.
 */
export interface EventoPedido {
  tipo: "creado" | "actualizado";
  pedidoId: string;
  numero: number;
  mesaNumero: number;
  estado: string;
}

declare global {
  var __roastEventos: EventEmitter | undefined;
}

const bus = (globalThis.__roastEventos ??= new EventEmitter().setMaxListeners(200));

export function avisarPedido(evento: EventoPedido) {
  bus.emit("pedido", evento);
}

export function escucharPedidos(escucha: (evento: EventoPedido) => void): () => void {
  bus.on("pedido", escucha);
  return () => bus.off("pedido", escucha);
}
