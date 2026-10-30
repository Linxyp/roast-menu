import type { ProductoDTO } from "./carta";
import { MAX_CANTIDAD, type LineaEnvio } from "./pedido";
import { cotizar, detallesLinea, normalizarSeleccion, tituloLinea, validarSeleccion, type Seleccion } from "./precios";

export interface LineaCarrito {
  /** Identifica la configuración: dos productos armados igual (con la misma nota) se suman. */
  id: string;
  productoId: string;
  seleccion: Seleccion;
  cantidad: number;
  nota: string;
}

export interface LineaDetallada {
  linea: LineaCarrito;
  producto: ProductoDTO;
  titulo: string;
  detalles: string[];
  precioUnitario: number;
  subtotal: number;
  /** Motivo si la línea ya no se puede pedir (producto agotado, topping retirado…). */
  problema: string | null;
}

export interface DetalleCarrito {
  lineas: LineaDetallada[];
  unidades: number;
  total: number;
  /** Se puede enviar: hay líneas y ninguna tiene problemas. */
  listo: boolean;
}

export function idLinea(productoId: string, seleccion: Seleccion, nota = ""): string {
  const opciones = Object.entries(seleccion.opciones)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([g, o]) => `${g}:${o}`)
    .join(",");
  return [productoId, opciones, [...seleccion.toppings].sort().join("+"), nota.trim().toLowerCase()].join("|");
}

const acotar = (n: number) => (Number.isFinite(n) ? Math.min(MAX_CANTIDAD, Math.max(0, Math.floor(n))) : 0);

export function agregarLinea(lineas: LineaCarrito[], productoId: string, seleccion: Seleccion, cantidad: number, nota = ""): LineaCarrito[] {
  const id = idLinea(productoId, seleccion, nota);
  if (lineas.some((l) => l.id === id)) {
    return lineas.map((l) => (l.id === id ? { ...l, cantidad: acotar(l.cantidad + cantidad) } : l));
  }
  const n = acotar(cantidad);
  return n ? [...lineas, { id, productoId, seleccion, cantidad: n, nota: nota.trim() }] : lineas;
}

export function cambiarCantidad(lineas: LineaCarrito[], id: string, cantidad: number): LineaCarrito[] {
  const n = acotar(cantidad);
  return n === 0 ? lineas.filter((l) => l.id !== id) : lineas.map((l) => (l.id === id ? { ...l, cantidad: n } : l));
}

export function quitarLinea(lineas: LineaCarrito[], id: string): LineaCarrito[] {
  return lineas.filter((l) => l.id !== id);
}

/** Edita una línea en su lugar; si queda igual a otra, se suman. */
export function reemplazarLinea(lineas: LineaCarrito[], id: string, seleccion: Seleccion, cantidad: number, nota = ""): LineaCarrito[] {
  const actual = lineas.find((l) => l.id === id);
  if (!actual) return lineas;
  const n = acotar(cantidad);
  if (n === 0) return quitarLinea(lineas, id);
  const nuevoId = idLinea(actual.productoId, seleccion, nota);
  if (nuevoId !== id && lineas.some((l) => l.id === nuevoId)) {
    return lineas.filter((l) => l.id !== id).map((l) => (l.id === nuevoId ? { ...l, cantidad: acotar(l.cantidad + n) } : l));
  }
  return lineas.map((l) => (l.id === id ? { id: nuevoId, productoId: l.productoId, seleccion, cantidad: n, nota: nota.trim() } : l));
}

/** Precios y textos con la carta vigente. Las líneas de productos que ya no existen se descartan. */
export function detallarCarrito(lineas: LineaCarrito[], productos: Map<string, ProductoDTO>): DetalleCarrito {
  const detalladas: LineaDetallada[] = [];
  for (const linea of lineas) {
    const producto = productos.get(linea.productoId);
    if (!producto) continue;
    const errores = validarSeleccion(producto, linea.seleccion);
    const cotizacion = cotizar(producto, linea.seleccion);
    detalladas.push({
      linea,
      producto,
      titulo: cotizacion ? tituloLinea(producto, cotizacion) : producto.nombre,
      detalles: cotizacion ? detallesLinea(producto, linea.seleccion, cotizacion) : [],
      precioUnitario: cotizacion?.precio ?? 0,
      subtotal: (cotizacion?.precio ?? 0) * linea.cantidad,
      problema: errores[0]?.mensaje ?? (cotizacion ? null : "Ya no está disponible."),
    });
  }
  return {
    lineas: detalladas,
    unidades: detalladas.reduce((s, l) => s + l.linea.cantidad, 0),
    total: detalladas.reduce((s, l) => s + l.subtotal, 0),
    listo: detalladas.length > 0 && detalladas.every((l) => !l.problema),
  };
}

/** Lo que se envía al servidor (que vuelve a validar y calcular todo). */
export function lineasParaEnviar(lineas: LineaCarrito[]): LineaEnvio[] {
  return lineas.map((l) => ({
    productoId: l.productoId,
    opciones: l.seleccion.opciones,
    toppings: l.seleccion.toppings,
    cantidad: l.cantidad,
    ...(l.nota ? { nota: l.nota } : {}),
  }));
}

/** Reconstruye el carrito guardado en el navegador descartando lo mal formado. */
export function restaurarCarrito(datos: unknown, productos: Map<string, ProductoDTO>): LineaCarrito[] {
  if (!Array.isArray(datos)) return [];
  let lineas: LineaCarrito[] = [];
  for (const crudo of datos) {
    if (!crudo || typeof crudo !== "object") continue;
    const { productoId, seleccion, cantidad, nota } = crudo as Record<string, unknown>;
    if (typeof productoId !== "string" || typeof cantidad !== "number" || !seleccion || typeof seleccion !== "object") continue;
    const producto = productos.get(productoId);
    if (!producto) continue;
    const { opciones, toppings } = seleccion as Record<string, unknown>;
    if (!Array.isArray(toppings) || !toppings.every((t) => typeof t === "string")) continue;
    if (!opciones || typeof opciones !== "object") continue;
    const limpia = normalizarSeleccion(producto, {
      opciones: Object.fromEntries(Object.entries(opciones).filter(([, v]) => typeof v === "string")) as Record<string, string>,
      toppings: toppings as string[],
    });
    lineas = agregarLinea(lineas, productoId, limpia, cantidad, typeof nota === "string" ? nota.slice(0, 120) : "");
  }
  return lineas;
}
