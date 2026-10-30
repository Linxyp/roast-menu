import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CartaDTO, CategoriaDTO, ProductoDTO } from "@/lib/carta";
import { leerAjustes } from "./ajustes";
import { db } from "./db";
import { imagenDTO, SELECT_IMAGEN } from "./imagenes";

/** Todo lo que hace falta para mostrar y cotizar un producto. */
export const INCLUIR_PRODUCTO = {
  imagen: SELECT_IMAGEN,
  niveles: { orderBy: { orden: "asc" } },
  grupos: {
    orderBy: { orden: "asc" },
    include: { opciones: { orderBy: { orden: "asc" }, include: { imagen: SELECT_IMAGEN } } },
  },
  listaToppings: {
    include: { toppings: { orderBy: { orden: "asc" }, include: { imagen: SELECT_IMAGEN } } },
  },
} as const;

export type ProductoConTodo = Prisma.ProductoGetPayload<{ include: typeof INCLUIR_PRODUCTO }>;

export function productoDTO(p: ProductoConTodo): ProductoDTO {
  return {
    id: p.id,
    categoriaId: p.categoriaId,
    nombre: p.nombre,
    descripcion: p.descripcion,
    imagen: imagenDTO(p.imagen),
    agotado: p.agotado,
    nota: p.nota,
    niveles: p.niveles.map((n) => ({
      id: n.id,
      nombre: n.nombre,
      detalle: n.detalle,
      precio: n.precio,
      toppingsIncluidos: n.toppingsIncluidos,
    })),
    grupos: p.grupos
      .filter((g) => g.opciones.length > 0)
      .map((g) => ({
        id: g.id,
        titulo: g.titulo,
        etiqueta: g.etiqueta,
        opciones: g.opciones.map((o) => ({
          id: o.id,
          nombre: o.nombre,
          precioExtra: o.precioExtra,
          disponible: o.disponible,
          imagen: imagenDTO(o.imagen),
        })),
      })),
    toppings: (p.listaToppings?.toppings ?? []).map((t) => ({
      id: t.id,
      nombre: t.nombre,
      disponible: t.disponible,
      imagen: imagenDTO(t.imagen),
    })),
    precioToppingAdicional: p.precioToppingAdicional,
    maxToppings: p.maxToppings,
  };
}

/** Carta pública: categorías y productos visibles, en su orden. */
export async function cargarCarta(): Promise<CartaDTO> {
  const [categorias, ajustes] = await Promise.all([
    db.categoria.findMany({
      where: { visible: true },
      orderBy: { orden: "asc" },
      include: {
        productos: {
          where: { visible: true, niveles: { some: {} } },
          orderBy: { orden: "asc" },
          include: INCLUIR_PRODUCTO,
        },
      },
    }),
    leerAjustes(),
  ]);
  const visibles: CategoriaDTO[] = categorias
    .filter((c) => c.productos.length > 0)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      tituloPrincipal: c.tituloPrincipal,
      tituloPincel: c.tituloPincel,
      pincelPrimero: c.pincelPrimero,
      lema: c.lema,
      productos: c.productos.map(productoDTO),
    }));
  return {
    categorias: visibles,
    negocio: {
      nombre: ajustes.nombreNegocio,
      recibiendoPedidos: ajustes.recibiendoPedidos,
      direccion: ajustes.direccion,
      horario: ajustes.horario,
      instagram: ajustes.instagram,
    },
  };
}

/** Productos pedibles por id (para validar y cotizar un pedido en el servidor). */
export async function productosParaPedido(ids: string[]): Promise<Map<string, ProductoDTO & { visible: boolean }>> {
  const productos = await db.producto.findMany({
    where: { id: { in: ids } },
    include: { ...INCLUIR_PRODUCTO, categoria: { select: { visible: true } } },
  });
  return new Map(productos.map((p) => [p.id, { ...productoDTO(p), visible: p.visible && p.categoria.visible }]));
}
