// Contrato con los afiches y con los cambios que pidió el negocio el 2026-10-29.
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { CATEGORIAS, LISTAS } from "../../prisma/datos-iniciales";
import { IMAGENES } from "../../src/data/imagenes.generadas";
import { diaColombia, hace, pesos } from "../../src/lib/formato";

const todos = CATEGORIAS.flatMap((c) => c.productos);
const buscar = (nombre: string) => todos.find((p) => p.nombre === nombre);

describe("productos nuevos (2026-10-29)", () => {
  test("salchipapas sencilla y familiar", () => {
    expect(buscar("Salchipapa")?.niveles.map((n) => [n.nombre, n.precio, n.detalle])).toEqual([
      ["Sencilla", 15900, "Salchicha, papa y queso"],
      ["Con 2 toppings", 22900, "Salchicha, papa, queso y 2 toppings"],
    ]);
    expect(buscar("Salchipapa")?.precioToppingAdicional).toBe(4900);
    expect(buscar("Salchipapa familiar")?.niveles).toEqual([
      { nombre: "Familiar", detalle: "Salchicha, papa, queso y 2 toppings", precio: 41900, toppingsIncluidos: 2 },
    ]);
  });

  test("mazorcadas", () => {
    const mazorcada = buscar("Mazorcada");
    expect(mazorcada?.niveles[0].precio).toBe(22900);
    expect(mazorcada?.grupos?.[0].opciones.map((o) => o.nombre)).toEqual(["Carne", "Pollo"]);
    expect(buscar("Mazorcada familiar")?.niveles[0]).toMatchObject({ precio: 41900, toppingsIncluidos: 2 });
  });

  test("perro sencillo, con 2 toppings y adicional", () => {
    const perro = buscar("Perro");
    expect(perro?.niveles.map((n) => [n.nombre, n.precio])).toEqual([
      ["Sencillo", 8900],
      ["Con 2 toppings", 12900],
    ]);
    expect(perro?.niveles[0].detalle).toBe("Pan, salchicha, queso y papitas fosforito");
    expect(perro?.precioToppingAdicional).toBe(3900);
  });

  test("guacamole cambiado por piña en todas las listas", () => {
    for (const lista of Object.values(LISTAS)) {
      const nombres = lista.toppings.map((t) => t.nombre);
      expect(nombres).not.toContain("Guacamole");
      expect(nombres).toContain("Piña");
    }
  });

  test("bebida: Productos Coca-Cola", () => {
    expect(buscar("Productos Coca-Cola")?.niveles[0].precio).toBe(5000);
    expect(buscar("Coca-Cola en lata")).toBeUndefined();
  });
});

describe("precios de los afiches", () => {
  test("hamburguesa, combo y cerveza", () => {
    expect(buscar("Hamburguesa")?.niveles.map((n) => n.precio)).toEqual([16900, 19900]);
    expect(buscar("Hamburguesa")?.precioToppingAdicional).toBe(3900);
    expect(buscar("Combo con 2 toppings")?.niveles[0]).toMatchObject({ precio: 26900, toppingsIncluidos: 2 });
    expect(buscar("Combo con 2 toppings")?.maxToppings).toBe(2);
    expect(buscar("Cerveza negra 3 Cordilleras")?.niveles[0].precio).toBe(6500);
  });
});

test("cada foto de la carta inicial existe", () => {
  const claves = new Set<string>();
  for (const p of todos) {
    if (p.imagen) claves.add(p.imagen);
    for (const g of p.grupos ?? []) for (const o of g.opciones) if (o.imagen) claves.add(o.imagen);
  }
  for (const lista of Object.values(LISTAS)) for (const t of lista.toppings) if (t.imagen) claves.add(t.imagen);
  for (const clave of claves) {
    const info = IMAGENES[clave];
    expect(info, clave).toBeDefined();
    expect(existsSync(path.join(import.meta.dirname, "../../public/img", `${clave}-${info.ancho}.webp`)), clave).toBe(true);
  }
});

test("formato", () => {
  expect(pesos(16900)).toBe("$16.900");
  expect(pesos(5000)).toBe("$5.000");
  expect(pesos(1234567)).toBe("$1.234.567");
  // 2026-10-30 02:00 UTC todavía es el 29 en Colombia (UTC-5).
  expect(diaColombia(new Date("2026-10-30T02:00:00Z"))).toBe("2026-10-29");
  expect(hace(new Date(Date.now() - 65 * 60000))).toBe("hace 1 h 5 min");
});
