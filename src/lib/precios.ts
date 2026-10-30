import type { NivelDTO, ProductoDTO } from "./carta";
import { minusculaInicial, pesos, plural } from "./formato";

/** Lo que el cliente eligió al armar un producto. */
export interface Seleccion {
  /** Id del grupo → id de la opción elegida. */
  opciones: Record<string, string>;
  /** Ids de toppings, sin repetir. */
  toppings: string[];
}

export type ProductoPrecio = Pick<
  ProductoDTO,
  "niveles" | "precioToppingAdicional" | "maxToppings" | "grupos" | "toppings" | "agotado" | "nombre"
>;

export interface Cotizacion {
  nivel: NivelDTO;
  /** Toppings que se cobran como adicionales. */
  adicionales: number;
  precioAdicional: number;
  /** Suma de los recargos de las opciones elegidas. */
  extras: number;
  /** Precio de una unidad. */
  precio: number;
  /** Toppings incluidos que todavía se pueden elegir sin costo. */
  incluidosDisponibles: number;
}

/**
 * Precio de una unidad. Entre los niveles publicados se cobra SIEMPRE la combinación
 * más económica para el cliente (nivel + toppings adicionales). Con la hamburguesa:
 * 0 toppings = Sencilla $16.900; 1 o 2 = Con 2 toppings $19.900; 3 = $19.900 + $3.900.
 * Con la salchipapa: 1 topping = Sencilla $15.900 + $4.900 = $20.800 (más barato que
 * la de 2 toppings). Null si esa cantidad de toppings no se puede vender.
 */
export function cotizar(producto: ProductoPrecio, seleccion: Seleccion): Cotizacion | null {
  const n = seleccion.toppings.length;
  if (n < 0 || (producto.maxToppings != null && n > producto.maxToppings)) return null;
  const precioAdicional = producto.precioToppingAdicional;

  let mejor: { nivel: NivelDTO; adicionales: number; base: number } | null = null;
  for (const nivel of producto.niveles) {
    const adicionales = Math.max(0, n - nivel.toppingsIncluidos);
    if (adicionales > 0 && precioAdicional == null) continue;
    const base = nivel.precio + adicionales * (precioAdicional ?? 0);
    if (!mejor || base < mejor.base) mejor = { nivel, adicionales, base };
  }
  if (!mejor) return null;

  let extras = 0;
  for (const grupo of producto.grupos) {
    const opcion = grupo.opciones.find((o) => o.id === seleccion.opciones[grupo.id]);
    if (opcion) extras += opcion.precioExtra;
  }
  return {
    nivel: mejor.nivel,
    adicionales: mejor.adicionales,
    precioAdicional: precioAdicional ?? 0,
    extras,
    precio: mejor.base + extras,
    incluidosDisponibles: Math.max(0, mejor.nivel.toppingsIncluidos - n),
  };
}

export interface ErrorSeleccion {
  campo: string;
  mensaje: string;
}

export function validarSeleccion(producto: ProductoPrecio, seleccion: Seleccion): ErrorSeleccion[] {
  const errores: ErrorSeleccion[] = [];
  if (producto.agotado) errores.push({ campo: "producto", mensaje: "Agotado por hoy." });

  for (const grupo of producto.grupos) {
    const opcion = grupo.opciones.find((o) => o.id === seleccion.opciones[grupo.id]);
    if (!opcion) errores.push({ campo: grupo.id, mensaje: /[.?!]$/.test(grupo.titulo) ? grupo.titulo : `${grupo.titulo}.` });
    else if (!opcion.disponible) errores.push({ campo: grupo.id, mensaje: `${opcion.nombre} está agotado.` });
  }

  const elegidos = seleccion.toppings;
  if (new Set(elegidos).size !== elegidos.length) {
    errores.push({ campo: "toppings", mensaje: "Hay toppings repetidos." });
  }
  for (const id of elegidos) {
    const topping = producto.toppings.find((t) => t.id === id);
    if (!topping) errores.push({ campo: "toppings", mensaje: "Hay toppings que no están en la carta." });
    else if (!topping.disponible) errores.push({ campo: "toppings", mensaje: `${topping.nombre} está agotado.` });
  }
  if (cotizar(producto, seleccion) === null) {
    errores.push({
      campo: "toppings",
      mensaje:
        producto.maxToppings != null
          ? `Puedes elegir máximo ${producto.maxToppings} ${plural(producto.maxToppings, "topping", "toppings")}.`
          : "Esa cantidad de toppings no está disponible.",
    });
  }
  return errores;
}

/** Selección en el orden de la carta y sin datos que no apliquen al producto. */
export function normalizarSeleccion(producto: ProductoPrecio, seleccion: Seleccion): Seleccion {
  const elegidos = new Set(seleccion.toppings);
  const opciones: Record<string, string> = {};
  for (const grupo of producto.grupos) {
    const id = seleccion.opciones[grupo.id];
    if (id) opciones[grupo.id] = id;
  }
  return { opciones, toppings: producto.toppings.filter((t) => elegidos.has(t.id)).map((t) => t.id) };
}

/** Nombre de la línea del pedido: «Hamburguesa con 2 toppings», «Perro sencillo», «Mazorcada». */
export function tituloLinea(producto: Pick<ProductoDTO, "nombre" | "niveles">, cotizacion: Cotizacion): string {
  return producto.niveles.length > 1 ? `${producto.nombre} ${minusculaInicial(cotizacion.nivel.nombre)}` : producto.nombre;
}

/** Detalle para el recibo y el carrito: carne, toppings, adicionales. */
export function detallesLinea(producto: ProductoPrecio, seleccion: Seleccion, cotizacion: Cotizacion): string[] {
  const detalles: string[] = [];
  for (const grupo of producto.grupos) {
    const opcion = grupo.opciones.find((o) => o.id === seleccion.opciones[grupo.id]);
    if (!opcion) continue;
    const extra = opcion.precioExtra ? ` (+${pesos(opcion.precioExtra)})` : "";
    detalles.push(`${grupo.etiqueta ? `${grupo.etiqueta}: ` : ""}${opcion.nombre}${extra}`);
  }
  const nombres = producto.toppings.filter((t) => seleccion.toppings.includes(t.id)).map((t) => t.nombre);
  if (nombres.length > 0) detalles.push(`Toppings: ${nombres.join(", ")}`);
  else if (cotizacion.nivel.toppingsIncluidos > 0) detalles.push("Sin toppings");
  if (cotizacion.adicionales > 0) {
    const n = cotizacion.adicionales;
    detalles.push(`${n} ${plural(n, "topping adicional", "toppings adicionales")} (+${pesos(cotizacion.precioAdicional)} c/u)`);
  }
  return detalles;
}

/** Selección ficticia con `n` toppings: para el precio solo cuenta cuántos son. */
const conToppings = (n: number): Seleccion => ({ opciones: {}, toppings: Array.from({ length: n }, (_, i) => `t${i}`) });

/** Frase que acompaña la elección de toppings y explica cómo va el precio. */
export function ayudaToppings(producto: ProductoPrecio, cantidad: number): string {
  const actual = cotizar(producto, conToppings(cantidad));
  const { maxToppings, precioToppingAdicional } = producto;
  if (!actual) return `Puedes elegir máximo ${maxToppings} ${plural(maxToppings ?? 0, "topping", "toppings")}.`;
  if (maxToppings != null && cantidad >= maxToppings) {
    return `Listo: elegiste ${maxToppings} ${plural(maxToppings, "topping", "toppings")}, el máximo.`;
  }
  if (cantidad === 0) {
    const incluidos = actual.nivel.toppingsIncluidos;
    return incluidos > 0 ? `Incluye ${incluidos} ${plural(incluidos, "topping", "toppings")}.` : "Son opcionales: el precio se actualiza con cada uno.";
  }
  if (actual.incluidosDisponibles > 0) {
    const libres = actual.incluidosDisponibles;
    return `Te ${plural(libres, "queda", "quedan")} ${libres} ${plural(libres, "topping incluido", "toppings incluidos")}.`;
  }
  if (actual.adicionales > 0) {
    const incluidos = actual.nivel.toppingsIncluidos;
    const base = incluidos > 0 ? `${incluidos} ${plural(incluidos, "incluido", "incluidos")} + ` : "";
    return `${base}${actual.adicionales} ${plural(actual.adicionales, "adicional", "adicionales")} de ${pesos(actual.precioAdicional)}.`;
  }
  return precioToppingAdicional == null ? "" : `Cada topping extra: ${pesos(precioToppingAdicional)}.`;
}

/** Cuánto sube el precio si se elige un topping más (0 si va incluido; null si no se puede). */
export function siguienteSuma(producto: ProductoPrecio, cantidad: number): number | null {
  const ahora = cotizar(producto, conToppings(cantidad));
  const despues = cotizar(producto, conToppings(cantidad + 1));
  return ahora && despues ? despues.precio - ahora.precio : null;
}
