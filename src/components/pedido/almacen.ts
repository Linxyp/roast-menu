"use client";

import { useSyncExternalStore } from "react";
import type { ProductoDTO } from "@/lib/carta";
import {
  agregarLinea,
  cambiarCantidad,
  quitarLinea,
  reemplazarLinea,
  restaurarCarrito,
  type LineaCarrito,
} from "@/lib/carrito";
import type { Seleccion } from "@/lib/precios";

/**
 * Carrito y pedidos enviados de UNA mesa, guardados en el navegador del cliente: si recarga
 * la página no pierde lo que lleva. El carrito se descarta tras 12 horas sin cambios.
 */
const CADUCIDAD_MS = 12 * 3600 * 1000;
const VACIO: LineaCarrito[] = [];
const SIN_PEDIDOS: PedidoEnviado[] = [];

export interface PedidoEnviado {
  id: string;
  numero: number;
  total: number;
  enviadoEn: number;
}

interface Estado {
  lineas: LineaCarrito[];
  pedidos: PedidoEnviado[];
}

const claves = (mesa: string) => ({ carrito: `roast:carrito:${mesa}`, pedidos: `roast:pedidos:${mesa}` });

function leerJson<T>(clave: string): T | null {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

function escribirJson(clave: string, valor: unknown) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Navegación privada o almacenamiento lleno: el carrito sigue funcionando en memoria.
  }
}

export function crearAlmacen(mesa: string, productos: Map<string, ProductoDTO>) {
  let estado: Estado = { lineas: VACIO, pedidos: SIN_PEDIDOS };
  const escuchas = new Set<() => void>();
  const k = claves(mesa);

  function emitir() {
    for (const escucha of escuchas) escucha();
  }

  function cargar() {
    const carrito = leerJson<{ guardado: number; lineas: unknown }>(k.carrito);
    const lineas =
      carrito && Date.now() - carrito.guardado < CADUCIDAD_MS ? restaurarCarrito(carrito.lineas, productos) : VACIO;
    const pedidos = (leerJson<PedidoEnviado[]>(k.pedidos) ?? []).filter(
      (p) => p && typeof p.id === "string" && Date.now() - p.enviadoEn < 18 * 3600 * 1000,
    );
    estado = { lineas, pedidos };
    emitir();
  }

  function fijarLineas(lineas: LineaCarrito[]) {
    estado = { ...estado, lineas };
    escribirJson(k.carrito, { guardado: Date.now(), lineas });
    emitir();
  }

  return {
    cargar,
    suscribir(escucha: () => void) {
      escuchas.add(escucha);
      const alCambiarOtraPestana = (e: StorageEvent) => {
        if (e.key === k.carrito || e.key === k.pedidos) cargar();
      };
      window.addEventListener("storage", alCambiarOtraPestana);
      return () => {
        escuchas.delete(escucha);
        window.removeEventListener("storage", alCambiarOtraPestana);
      };
    },
    leer: () => estado,
    agregar: (productoId: string, seleccion: Seleccion, cantidad: number, nota: string) =>
      fijarLineas(agregarLinea(estado.lineas, productoId, seleccion, cantidad, nota)),
    cambiarCantidad: (id: string, cantidad: number) => fijarLineas(cambiarCantidad(estado.lineas, id, cantidad)),
    quitar: (id: string) => fijarLineas(quitarLinea(estado.lineas, id)),
    reemplazar: (id: string, seleccion: Seleccion, cantidad: number, nota: string) =>
      fijarLineas(reemplazarLinea(estado.lineas, id, seleccion, cantidad, nota)),
    vaciar: () => fijarLineas(VACIO),
    registrarPedido(pedido: Omit<PedidoEnviado, "enviadoEn">) {
      const pedidos = [{ ...pedido, enviadoEn: Date.now() }, ...estado.pedidos].slice(0, 20);
      estado = { ...estado, pedidos };
      escribirJson(k.pedidos, pedidos);
      emitir();
    },
  };
}

export type Almacen = ReturnType<typeof crearAlmacen>;

const SERVIDOR: Estado = { lineas: VACIO, pedidos: SIN_PEDIDOS };

export function useAlmacen(almacen: Almacen): Estado {
  return useSyncExternalStore(almacen.suscribir, almacen.leer, () => SERVIDOR);
}
