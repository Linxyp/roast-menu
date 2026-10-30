import type { UsuarioPanel } from "@/server/auth/acceso";
import { db } from "@/server/db";

export const ADMIN: UsuarioPanel = { id: "admin", usuario: "admin", nombre: "Admin", rol: "ADMIN" };
export const PERSONAL: UsuarioPanel = { id: "caja", usuario: "caja", nombre: "Caja", rol: "PERSONAL" };

/** Deja vacías todas las tablas (solo en una base «…_test»). */
export async function vaciarBase() {
  const [{ base }] = await db.$queryRaw<{ base: string }[]>`SELECT current_database() AS base`;
  if (!base.endsWith("_test")) throw new Error(`vaciarBase se negó: «${base}» no es una base de pruebas.`);
  const tablas = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tablas.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

/**
 * Carta mínima con la misma forma que la real: hamburguesa con niveles, carne obligatoria
 * y toppings con adicional; una gaseosa sencilla; y dos mesas.
 */
export async function cartaDePrueba() {
  const lista = await db.listaToppings.create({
    data: {
      nombre: "Toppings de hamburguesa",
      toppings: { create: ["Chicharrón", "Piña", "Tocineta", "Queso"].map((nombre, orden) => ({ nombre, orden })) },
    },
    include: { toppings: { orderBy: { orden: "asc" } } },
  });
  const categoria = await db.categoria.create({ data: { nombre: "Hamburguesas" } });
  const hamburguesa = await db.producto.create({
    data: {
      categoriaId: categoria.id,
      nombre: "Hamburguesa",
      listaToppingsId: lista.id,
      precioToppingAdicional: 3900,
      niveles: {
        create: [
          { nombre: "Sencilla", precio: 16900, toppingsIncluidos: 0, orden: 0 },
          { nombre: "Con 2 toppings", precio: 19900, toppingsIncluidos: 2, orden: 1 },
        ],
      },
      grupos: {
        create: [
          {
            titulo: "Elige tu carne",
            etiqueta: "Carne",
            opciones: {
              create: [
                { nombre: "Res", orden: 0 },
                { nombre: "Pollo", orden: 1 },
              ],
            },
          },
        ],
      },
    },
    include: { grupos: { include: { opciones: { orderBy: { orden: "asc" } } } } },
  });
  const gaseosa = await db.producto.create({
    data: { categoriaId: categoria.id, nombre: "Gaseosa", orden: 1, niveles: { create: [{ nombre: "Única", precio: 5000 }] } },
  });
  const mesa1 = await db.mesa.create({ data: { numero: 1, codigo: "mesauno1" } });
  const mesa2 = await db.mesa.create({ data: { numero: 2, codigo: "mesados2" } });

  const [chicharron, pina, tocineta, queso] = lista.toppings;
  const grupo = hamburguesa.grupos[0];
  const [res, pollo] = grupo.opciones;
  return {
    categoria,
    lista,
    hamburguesa,
    gaseosa,
    mesa1,
    mesa2,
    grupoCarne: grupo.id,
    res,
    pollo,
    toppings: { chicharron, pina, tocineta, queso },
  };
}

export type Carta = Awaited<ReturnType<typeof cartaDePrueba>>;

/** Línea de pedido de hamburguesa tal como la envía el celular. */
export function lineaHamburguesa(carta: Carta, toppings: string[], cantidad = 1, carne = carta.res.id) {
  return { productoId: carta.hamburguesa.id, opciones: { [carta.grupoCarne]: carne }, toppings, cantidad };
}
