import { execSync } from "node:child_process";
import { beforeAll, describe, expect, test } from "vitest";
import type { ProductoDTO } from "@/lib/carta";
import { cargarCarta } from "@/server/carta";
import { db } from "@/server/db";
import { crearPedido, pedidoPorId } from "@/server/pedidos";
import { RAIZ } from "./base-pruebas";
import { vaciarBase } from "./fabrica";

/** `npm run db:seed` contra la base de pruebas (DATABASE_URL ya apunta a ella). */
function sembrar() {
  execSync("npx tsx --conditions=react-server prisma/seed.ts", {
    cwd: RAIZ,
    env: { ...process.env, SEED_ADMIN_USUARIO: "admin", SEED_ADMIN_NOMBRE: "Administrador", SEED_ADMIN_CLAVE: "Prueba-segura-2026" },
    stdio: "pipe",
  });
}

let productos: Map<string, ProductoDTO>;
let codigoMesa: string;

beforeAll(async () => {
  await vaciarBase();
  sembrar();
  productos = new Map((await cargarCarta()).categorias.flatMap((c) => c.productos).map((p) => [p.nombre, p]));
  codigoMesa = (await db.mesa.findUniqueOrThrow({ where: { numero: 1 } })).codigo;
}, 120_000);

/** Línea con la primera opción de cada elección y los primeros `toppings` de su lista. */
function linea(nombre: string, toppings = 0) {
  const producto = productos.get(nombre);
  if (!producto) throw new Error(`Falta «${nombre}» en la carta`);
  return {
    productoId: producto.id,
    opciones: Object.fromEntries(producto.grupos.map((g) => [g.id, g.opciones[0].id])),
    toppings: producto.toppings.slice(0, toppings).map((t) => t.id),
    cantidad: 1,
  };
}

describe("carta inicial (npm run db:seed)", () => {
  test("carga los productos en orden, las 10 mesas y el administrador", async () => {
    expect([...productos.keys()]).toEqual([
      "Hamburguesa",
      "Combo con 2 toppings",
      "Perro",
      "Salchipapa",
      "Salchipapa familiar",
      "Mazorcada",
      "Mazorcada familiar",
      "Productos Coca-Cola",
      "Cerveza negra 3 Cordilleras",
    ]);
    expect(await db.mesa.count({ where: { activa: true } })).toBe(10);
    await expect(db.usuario.findUniqueOrThrow({ where: { usuario: "admin" } })).resolves.toMatchObject({ rol: "ADMIN", activo: true });
  });

  test("ya no hay guacamole: la piña está en las dos listas de toppings", async () => {
    const listas = await db.listaToppings.findMany({ include: { toppings: true } });
    expect(listas).toHaveLength(2);
    for (const { toppings } of listas) {
      expect(toppings.map((t) => t.nombre)).toContain("Piña");
      expect(toppings.some((t) => /guacamole/i.test(t.nombre))).toBe(false);
    }
  });

  test("cada producto se cobra con los precios de la carta", async () => {
    const casos: [producto: string, toppings: number, linea: string, precio: number][] = [
      ["Hamburguesa", 0, "Hamburguesa sencilla", 16900],
      ["Hamburguesa", 2, "Hamburguesa con 2 toppings", 19900],
      ["Hamburguesa", 3, "Hamburguesa con 2 toppings", 19900 + 3900],
      ["Combo con 2 toppings", 2, "Combo con 2 toppings", 26900],
      ["Perro", 0, "Perro sencillo", 8900],
      ["Perro", 2, "Perro con 2 toppings", 12900],
      ["Perro", 3, "Perro con 2 toppings", 12900 + 3900],
      ["Salchipapa", 0, "Salchipapa sencilla", 15900],
      ["Salchipapa", 2, "Salchipapa con 2 toppings", 22900],
      ["Salchipapa", 3, "Salchipapa con 2 toppings", 22900 + 4900],
      ["Salchipapa familiar", 2, "Salchipapa familiar", 41900],
      ["Mazorcada", 0, "Mazorcada", 22900],
      ["Mazorcada familiar", 2, "Mazorcada familiar", 41900],
      ["Productos Coca-Cola", 0, "Productos Coca-Cola", 5000],
      ["Cerveza negra 3 Cordilleras", 0, "Cerveza negra 3 Cordilleras", 6500],
    ];
    const pedido = await crearPedido(codigoMesa, { cliente: "Prueba", items: casos.map(([nombre, toppings]) => linea(nombre, toppings)) });
    const { items, total } = await pedidoPorId(pedido.id);
    expect(items.map((i) => [i.nombre, i.precioUnitario])).toEqual(casos.map(([, , nombre, precio]) => [nombre, precio]));
    expect(total).toBe(casos.reduce((suma, [, , , precio]) => suma + precio, 0));
    expect(items.find((i) => i.nombre === "Mazorcada")?.detalles).toEqual(["Carne"]);
  });

  test("respeta los máximos de toppings y las elecciones obligatorias", async () => {
    await expect(crearPedido(codigoMesa, { cliente: "Prueba", items: [linea("Salchipapa familiar", 3)] })).rejects.toThrow(
      "Salchipapa familiar: Puedes elegir máximo 2 toppings.",
    );
    await expect(crearPedido(codigoMesa, { cliente: "Prueba", items: [{ ...linea("Mazorcada"), opciones: {} }] })).rejects.toThrow(
      "Mazorcada: ¿Carne o pollo?",
    );
  });

  test("volver a correr la siembra no duplica nada", async () => {
    const contar = () => Promise.all([db.categoria.count(), db.producto.count(), db.mesa.count(), db.usuario.count(), db.imagen.count()]);
    const antes = await contar();
    sembrar();
    expect(await contar()).toEqual(antes);
  }, 60_000);
});
