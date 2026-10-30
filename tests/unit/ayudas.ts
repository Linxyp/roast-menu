import { CATEGORIAS, LISTAS } from "../../prisma/datos-iniciales";
import type { ProductoDTO } from "../../src/lib/carta";

/** Convierte un producto de la carta inicial en el formato que usa el motor de precios. */
export function producto(nombre: string): ProductoDTO {
  for (const categoria of CATEGORIAS) {
    const p = categoria.productos.find((x) => x.nombre === nombre);
    if (!p) continue;
    return {
      id: nombre,
      categoriaId: categoria.nombre,
      nombre: p.nombre,
      descripcion: p.descripcion ?? null,
      imagen: null,
      agotado: false,
      nota: p.nota ?? null,
      niveles: p.niveles.map((n, i) => ({
        id: `n${i}`,
        nombre: n.nombre,
        detalle: n.detalle ?? null,
        precio: n.precio,
        toppingsIncluidos: n.toppingsIncluidos ?? 0,
      })),
      grupos: (p.grupos ?? []).map((g, i) => ({
        id: `g${i}`,
        titulo: g.titulo,
        etiqueta: g.etiqueta,
        opciones: g.opciones.map((o) => ({ id: o.nombre.toLowerCase(), nombre: o.nombre, precioExtra: 0, disponible: true, imagen: null })),
      })),
      toppings: p.lista
        ? LISTAS[p.lista].toppings.map((t) => ({ id: t.nombre.toLowerCase(), nombre: t.nombre, disponible: true, imagen: null }))
        : [],
      precioToppingAdicional: p.precioToppingAdicional ?? null,
      maxToppings: p.maxToppings ?? null,
    };
  }
  throw new Error(`No existe «${nombre}» en la carta inicial`);
}

/** Selección con los primeros `n` toppings del producto y la primera opción de cada elección. */
export function con(p: ProductoDTO, n: number, opciones?: Record<string, string>) {
  return {
    opciones: opciones ?? Object.fromEntries(p.grupos.map((g) => [g.id, g.opciones[0].id])),
    toppings: p.toppings.slice(0, n).map((t) => t.id),
  };
}
