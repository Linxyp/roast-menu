import "server-only";
import { z } from "zod";
import { precioDesde } from "@/lib/carta";
import { db, type Tx } from "./db";
import { ErrorNegocio, noEncontrado } from "./errores";
import { imagenDTO, limpiarImagenesHuerfanas, SELECT_IMAGEN } from "./imagenes";

function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.output<T> {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    const primero = resultado.error.issues[0];
    throw new ErrorNegocio(primero?.message ?? "Revisa los datos.", 400, { [String(primero?.path.join(".") ?? "")]: primero?.message ?? "" });
  }
  return resultado.data;
}

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .nullish()
    .transform((v) => v || null);

const pesosValidos = (mensaje: string) => z.number({ error: mensaje }).int(mensaje).min(0, mensaje).max(10_000_000, mensaje);

/** Mueve un elemento un puesto arriba o abajo entre sus hermanos y deja el orden en 0, 1, 2… */
async function reordenar(ids: string[], id: string, direccion: -1 | 1, guardar: (id: string, orden: number) => Promise<unknown>) {
  const i = ids.indexOf(id);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((cada, orden) => guardar(cada, orden)));
}

// ---------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------

const esquemaCategoria = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Escribe el nombre de la categoría.").max(40, "Máximo 40 caracteres."),
  tituloPrincipal: textoOpcional(40),
  tituloPincel: textoOpcional(40),
  pincelPrimero: z.boolean().default(false),
  lema: textoOpcional(160),
  visible: z.boolean().default(true),
});

export async function listarCategoriasAdmin() {
  return db.categoria.findMany({ orderBy: { orden: "asc" }, include: { _count: { select: { productos: true } } } });
}

export async function guardarCategoria(entrada: unknown) {
  const { id, ...datos } = validar(esquemaCategoria, entrada);
  if (!datos.tituloPrincipal && !datos.tituloPincel) datos.tituloPincel = datos.nombre;
  if (id) {
    await db.categoria.update({ where: { id }, data: datos }).catch(() => {
      throw noEncontrado("La categoría");
    });
    return id;
  }
  const { _max } = await db.categoria.aggregate({ _max: { orden: true } });
  const nueva = await db.categoria.create({ data: { ...datos, orden: (_max.orden ?? -1) + 1 } });
  return nueva.id;
}

export async function moverCategoria(id: string, direccion: -1 | 1) {
  const todas = await db.categoria.findMany({ orderBy: { orden: "asc" }, select: { id: true } });
  await reordenar(
    todas.map((c) => c.id),
    id,
    direccion,
    (cada, orden) => db.categoria.update({ where: { id: cada }, data: { orden } }),
  );
}

export async function eliminarCategoria(id: string) {
  const productos = await db.producto.count({ where: { categoriaId: id } });
  if (productos > 0) throw new ErrorNegocio("Primero mueve o elimina los productos de esta categoría.", 409);
  await db.categoria.delete({ where: { id } }).catch(() => {
    throw noEncontrado("La categoría");
  });
}

// ---------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------

const esquemaNivel = z.object({
  nombre: z.string().trim().min(1, "Cada precio necesita un nombre (p. ej. «Sencilla»).").max(40),
  detalle: textoOpcional(120),
  precio: pesosValidos("Escribe precios en pesos, sin puntos ni decimales."),
  toppingsIncluidos: z.number().int().min(0).max(20),
});

const esquemaOpcion = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Cada opción necesita un nombre.").max(40),
  precioExtra: pesosValidos("El recargo de una opción debe ser un valor en pesos."),
  imagenId: z.string().nullable().default(null),
  disponible: z.boolean().default(true),
});

const esquemaGrupo = z.object({
  id: z.string().optional(),
  titulo: z.string().trim().min(1, "Cada elección necesita un título (p. ej. «Elige tu carne»).").max(60),
  etiqueta: z.string().trim().max(30).default(""),
  opciones: z.array(esquemaOpcion).min(2, "Cada elección necesita al menos 2 opciones.").max(20),
});

const esquemaProducto = z.object({
  id: z.string().optional(),
  categoriaId: z.string().min(1, "Elige la categoría."),
  nombre: z.string().trim().min(1, "Escribe el nombre del producto.").max(60, "Máximo 60 caracteres."),
  descripcion: textoOpcional(300),
  imagenId: z.string().nullable().default(null),
  visible: z.boolean().default(true),
  agotado: z.boolean().default(false),
  nota: textoOpcional(200),
  listaToppingsId: z.string().nullable().default(null),
  precioToppingAdicional: pesosValidos("El topping adicional debe ser un valor en pesos.").nullable().default(null),
  maxToppings: z.number().int().min(0).max(30).nullable().default(null),
  niveles: z.array(esquemaNivel).min(1, "Agrega al menos un precio.").max(6, "Máximo 6 precios por producto."),
  grupos: z.array(esquemaGrupo).max(5, "Máximo 5 elecciones por producto.").default([]),
});

export type ProductoEditable = z.input<typeof esquemaProducto>;

export async function listarProductosAdmin() {
  const categorias = await db.categoria.findMany({
    orderBy: { orden: "asc" },
    include: {
      productos: {
        orderBy: { orden: "asc" },
        include: { imagen: SELECT_IMAGEN, niveles: { select: { precio: true } }, listaToppings: { select: { nombre: true } } },
      },
    },
  });
  return categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    visible: c.visible,
    productos: c.productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      imagen: imagenDTO(p.imagen),
      visible: p.visible,
      agotado: p.agotado,
      desde: p.niveles.length ? precioDesde(p) : 0,
      precios: p.niveles.length,
      toppings: p.listaToppings?.nombre ?? null,
    })),
  }));
}

export async function productoParaEditar(id: string) {
  const p = await db.producto.findUnique({
    where: { id },
    include: {
      imagen: SELECT_IMAGEN,
      niveles: { orderBy: { orden: "asc" } },
      grupos: { orderBy: { orden: "asc" }, include: { opciones: { orderBy: { orden: "asc" }, include: { imagen: SELECT_IMAGEN } } } },
    },
  });
  if (!p) throw noEncontrado("El producto");
  return {
    id: p.id,
    categoriaId: p.categoriaId,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    imagen: imagenDTO(p.imagen),
    visible: p.visible,
    agotado: p.agotado,
    nota: p.nota ?? "",
    listaToppingsId: p.listaToppingsId,
    precioToppingAdicional: p.precioToppingAdicional,
    maxToppings: p.maxToppings,
    niveles: p.niveles.map((n) => ({
      nombre: n.nombre,
      detalle: n.detalle ?? "",
      precio: n.precio,
      toppingsIncluidos: n.toppingsIncluidos,
    })),
    grupos: p.grupos.map((g) => ({
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
  };
}

export type ProductoParaEditar = Awaited<ReturnType<typeof productoParaEditar>>;

/** Crea o actualiza un producto completo (precios, elecciones y opciones). Devuelve su id. */
export async function guardarProducto(entrada: unknown): Promise<string> {
  const datos = validar(esquemaProducto, entrada);
  const conToppings = Boolean(datos.listaToppingsId);
  const maxIncluidos = Math.max(...datos.niveles.map((n) => n.toppingsIncluidos));
  if (!conToppings && maxIncluidos > 0) {
    throw new ErrorNegocio("Un precio incluye toppings: elige qué lista de toppings lleva el producto.", 400, { listaToppingsId: "Elige la lista." });
  }
  if (conToppings && datos.maxToppings != null && maxIncluidos > datos.maxToppings) {
    throw new ErrorNegocio("Un precio incluye más toppings que el máximo permitido.", 400, { maxToppings: "Revisa el máximo." });
  }
  const categoria = await db.categoria.findUnique({ where: { id: datos.categoriaId }, select: { id: true } });
  if (!categoria) throw new ErrorNegocio("Elige una categoría válida.", 400, { categoriaId: "Elige la categoría." });

  const campos = {
    categoriaId: datos.categoriaId,
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    imagenId: datos.imagenId,
    visible: datos.visible,
    agotado: datos.agotado,
    nota: datos.nota,
    listaToppingsId: datos.listaToppingsId,
    precioToppingAdicional: conToppings ? datos.precioToppingAdicional : null,
    maxToppings: conToppings ? datos.maxToppings : null,
  };
  const niveles = datos.niveles.map((n, orden) => ({ ...n, toppingsIncluidos: conToppings ? n.toppingsIncluidos : 0, orden }));

  const id = await db.$transaction(async (tx) => {
    if (!datos.id) {
      const { _max } = await tx.producto.aggregate({ where: { categoriaId: datos.categoriaId }, _max: { orden: true } });
      const creado = await tx.producto.create({
        data: { ...campos, orden: (_max.orden ?? -1) + 1, niveles: { create: niveles } },
      });
      await guardarGrupos(tx, creado.id, datos.grupos);
      return creado.id;
    }
    const actual = await tx.producto.findUnique({ where: { id: datos.id }, select: { categoriaId: true } });
    if (!actual) throw noEncontrado("El producto");
    let orden: number | undefined;
    if (actual.categoriaId !== datos.categoriaId) {
      const { _max } = await tx.producto.aggregate({ where: { categoriaId: datos.categoriaId }, _max: { orden: true } });
      orden = (_max.orden ?? -1) + 1;
    }
    await tx.producto.update({ where: { id: datos.id }, data: { ...campos, ...(orden !== undefined ? { orden } : {}) } });
    await tx.nivelPrecio.deleteMany({ where: { productoId: datos.id } });
    await tx.nivelPrecio.createMany({ data: niveles.map((n) => ({ ...n, productoId: datos.id! })) });
    await guardarGrupos(tx, datos.id, datos.grupos);
    return datos.id;
  });
  await limpiarImagenesHuerfanas();
  return id;
}

/**
 * Sincroniza las elecciones conservando los ids que ya existían: un cliente con el
 * carrito abierto puede seguir pidiendo aunque el producto se haya editado.
 */
async function guardarGrupos(tx: Tx, productoId: string, grupos: z.output<typeof esquemaGrupo>[]) {
  const existentes = await tx.grupoOpciones.findMany({ where: { productoId }, include: { opciones: { select: { id: true } } } });
  const conservar = new Set<string>();
  for (const [orden, grupo] of grupos.entries()) {
    const previo = grupo.id ? existentes.find((e) => e.id === grupo.id) : undefined;
    const grupoId = previo
      ? (await tx.grupoOpciones.update({ where: { id: previo.id }, data: { titulo: grupo.titulo, etiqueta: grupo.etiqueta, orden } })).id
      : (await tx.grupoOpciones.create({ data: { productoId, titulo: grupo.titulo, etiqueta: grupo.etiqueta, orden } })).id;
    conservar.add(grupoId);
    const opcionesPrevias = new Set(previo?.opciones.map((o) => o.id) ?? []);
    const opcionesQuedan = new Set<string>();
    for (const [ordenOpcion, opcion] of grupo.opciones.entries()) {
      const datos = {
        nombre: opcion.nombre,
        precioExtra: opcion.precioExtra,
        imagenId: opcion.imagenId,
        disponible: opcion.disponible,
        orden: ordenOpcion,
      };
      if (opcion.id && opcionesPrevias.has(opcion.id)) {
        await tx.opcionGrupo.update({ where: { id: opcion.id }, data: datos });
        opcionesQuedan.add(opcion.id);
      } else {
        opcionesQuedan.add((await tx.opcionGrupo.create({ data: { ...datos, grupoId } })).id);
      }
    }
    if (previo) await tx.opcionGrupo.deleteMany({ where: { grupoId, id: { notIn: [...opcionesQuedan] } } });
  }
  await tx.grupoOpciones.deleteMany({ where: { productoId, id: { notIn: [...conservar] } } });
}

export async function cambiarEstadoProducto(id: string, cambios: { visible?: boolean; agotado?: boolean }) {
  await db.producto.update({ where: { id }, data: cambios }).catch(() => {
    throw noEncontrado("El producto");
  });
}

export async function moverProducto(id: string, direccion: -1 | 1) {
  const producto = await db.producto.findUnique({ where: { id }, select: { categoriaId: true } });
  if (!producto) throw noEncontrado("El producto");
  const hermanos = await db.producto.findMany({ where: { categoriaId: producto.categoriaId }, orderBy: { orden: "asc" }, select: { id: true } });
  await reordenar(
    hermanos.map((p) => p.id),
    id,
    direccion,
    (cada, orden) => db.producto.update({ where: { id: cada }, data: { orden } }),
  );
}

/** Los pedidos pasados conservan su copia del producto: borrarlo no cambia ventas ni recibos. */
export async function eliminarProducto(id: string) {
  await db.producto.delete({ where: { id } }).catch(() => {
    throw noEncontrado("El producto");
  });
  await limpiarImagenesHuerfanas();
}

export async function cambiarDisponibleOpcion(id: string, disponible: boolean) {
  await db.opcionGrupo.update({ where: { id }, data: { disponible } }).catch(() => {
    throw noEncontrado("La opción");
  });
}

// ---------------------------------------------------------------------
// Listas de toppings
// ---------------------------------------------------------------------

export async function listarListasToppings() {
  const listas = await db.listaToppings.findMany({
    orderBy: { orden: "asc" },
    include: {
      toppings: { orderBy: { orden: "asc" }, include: { imagen: SELECT_IMAGEN } },
      productos: { select: { nombre: true }, orderBy: { nombre: "asc" } },
    },
  });
  return listas.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    productos: l.productos.map((p) => p.nombre),
    toppings: l.toppings.map((t) => ({ id: t.id, nombre: t.nombre, disponible: t.disponible, imagen: imagenDTO(t.imagen) })),
  }));
}

const esquemaLista = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Escribe el nombre de la lista.").max(60),
});

export async function guardarLista(entrada: unknown) {
  const { id, nombre } = validar(esquemaLista, entrada);
  if (id) {
    await db.listaToppings.update({ where: { id }, data: { nombre } });
    return id;
  }
  const { _max } = await db.listaToppings.aggregate({ _max: { orden: true } });
  return (await db.listaToppings.create({ data: { nombre, orden: (_max.orden ?? -1) + 1 } })).id;
}

export async function eliminarLista(id: string) {
  const usan = await db.producto.count({ where: { listaToppingsId: id } });
  if (usan > 0) throw new ErrorNegocio("Hay productos que usan esta lista: cámbiales la lista primero.", 409);
  await db.listaToppings.delete({ where: { id } }).catch(() => {
    throw noEncontrado("La lista");
  });
  await limpiarImagenesHuerfanas();
}

const esquemaTopping = z.object({
  id: z.string().optional(),
  listaId: z.string().min(1),
  nombre: z.string().trim().min(1, "Escribe el nombre del topping.").max(40),
  imagenId: z.string().nullable().default(null),
  disponible: z.boolean().default(true),
});

export async function guardarTopping(entrada: unknown) {
  const { id, ...datos } = validar(esquemaTopping, entrada);
  if (id) {
    await db.topping.update({ where: { id }, data: datos }).catch(() => {
      throw noEncontrado("El topping");
    });
  } else {
    const { _max } = await db.topping.aggregate({ where: { listaId: datos.listaId }, _max: { orden: true } });
    await db.topping.create({ data: { ...datos, orden: (_max.orden ?? -1) + 1 } });
  }
  await limpiarImagenesHuerfanas();
}

export async function cambiarDisponibleTopping(id: string, disponible: boolean) {
  await db.topping.update({ where: { id }, data: { disponible } }).catch(() => {
    throw noEncontrado("El topping");
  });
}

export async function moverTopping(id: string, direccion: -1 | 1) {
  const topping = await db.topping.findUnique({ where: { id }, select: { listaId: true } });
  if (!topping) throw noEncontrado("El topping");
  const hermanos = await db.topping.findMany({ where: { listaId: topping.listaId }, orderBy: { orden: "asc" }, select: { id: true } });
  await reordenar(
    hermanos.map((t) => t.id),
    id,
    direccion,
    (cada, orden) => db.topping.update({ where: { id: cada }, data: { orden } }),
  );
}

export async function eliminarTopping(id: string) {
  await db.topping.delete({ where: { id } }).catch(() => {
    throw noEncontrado("El topping");
  });
  await limpiarImagenesHuerfanas();
}
