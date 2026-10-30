import { describe, expect, test } from "vitest";
import {
  ayudaToppings,
  cotizar,
  detallesLinea,
  normalizarSeleccion,
  siguienteSuma,
  tituloLinea,
  validarSeleccion,
} from "../../src/lib/precios";
import { con, producto } from "./ayudas";

const precio = (nombre: string, toppings: number) => {
  const p = producto(nombre);
  return cotizar(p, con(p, toppings))?.precio ?? null;
};

describe("precios publicados (se cobra siempre la combinación más económica)", () => {
  test.each([
    ["Hamburguesa", 0, 16900],
    ["Hamburguesa", 1, 19900],
    ["Hamburguesa", 2, 19900],
    ["Hamburguesa", 3, 23800],
    ["Hamburguesa", 4, 27700],
    ["Combo con 2 toppings", 0, 26900],
    ["Combo con 2 toppings", 2, 26900],
    ["Combo con 2 toppings", 3, null],
    ["Perro", 0, 8900],
    ["Perro", 1, 12800],
    ["Perro", 2, 12900],
    ["Perro", 3, 16800],
    ["Salchipapa", 0, 15900],
    ["Salchipapa", 1, 20800],
    ["Salchipapa", 2, 22900],
    ["Salchipapa", 3, 27800],
    ["Salchipapa familiar", 2, 41900],
    ["Salchipapa familiar", 3, null],
    ["Mazorcada", 0, 22900],
    ["Mazorcada familiar", 0, 41900],
    ["Mazorcada familiar", 2, 41900],
    ["Mazorcada familiar", 3, null],
    ["Productos Coca-Cola", 0, 5000],
    ["Cerveza negra 3 Cordilleras", 0, 6500],
  ])("%s con %i toppings = %s", (nombre, toppings, esperado) => {
    expect(precio(nombre, toppings)).toBe(esperado);
  });

  test("el recargo de una opción se suma al precio", () => {
    const hamburguesa = producto("Hamburguesa");
    hamburguesa.grupos[0].opciones[1].precioExtra = 2000;
    expect(cotizar(hamburguesa, con(hamburguesa, 2, { g0: "pollo" }))?.precio).toBe(21900);
  });
});

describe("validación", () => {
  const hamburguesa = producto("Hamburguesa");

  test("la carne es obligatoria", () => {
    expect(validarSeleccion(hamburguesa, { opciones: {}, toppings: [] }).map((e) => e.campo)).toEqual(["g0"]);
    expect(validarSeleccion(hamburguesa, con(hamburguesa, 0))).toEqual([]);
  });

  test("rechaza toppings repetidos, de otra lista o agotados", () => {
    expect(validarSeleccion(hamburguesa, { opciones: { g0: "res" }, toppings: ["queso", "queso"] })[0].campo).toBe("toppings");
    expect(validarSeleccion(hamburguesa, { opciones: { g0: "res" }, toppings: ["guacamole"] })[0].mensaje).toMatch(/no están en la carta/);
    hamburguesa.toppings[0].disponible = false;
    expect(validarSeleccion(hamburguesa, { opciones: { g0: "res" }, toppings: ["chicharrón"] })[0].mensaje).toBe("Chicharrón está agotado.");
  });

  test("producto agotado u opción agotada", () => {
    const mazorcada = producto("Mazorcada");
    mazorcada.grupos[0].opciones[1].disponible = false;
    expect(validarSeleccion(mazorcada, { opciones: { g0: "pollo" }, toppings: [] })[0].mensaje).toBe("Pollo está agotado.");
    mazorcada.agotado = true;
    expect(validarSeleccion(mazorcada, con(mazorcada, 0))[0].mensaje).toBe("Agotado por hoy.");
  });

  test("el aviso de una elección pendiente no duplica la puntuación", () => {
    expect(validarSeleccion(hamburguesa, { opciones: {}, toppings: [] })[0].mensaje).toBe("Elige tu carne.");
    expect(validarSeleccion(producto("Mazorcada"), { opciones: {}, toppings: [] })[0].mensaje).toBe("¿Carne o pollo?");
  });

  test("respeta el máximo de toppings", () => {
    const combo = producto("Combo con 2 toppings");
    expect(validarSeleccion(combo, con(combo, 3)).at(-1)?.mensaje).toBe("Puedes elegir máximo 2 toppings.");
  });

  test("normalizar deja los toppings en el orden de la carta y quita grupos ajenos", () => {
    expect(normalizarSeleccion(hamburguesa, { opciones: { g0: "res", otro: "x" }, toppings: ["huevo", "piña"] })).toEqual({
      opciones: { g0: "res" },
      toppings: ["piña", "huevo"],
    });
  });
});

describe("textos del pedido", () => {
  test("título según el precio que aplica", () => {
    const casos: [string, number, string][] = [
      ["Hamburguesa", 0, "Hamburguesa sencilla"],
      ["Hamburguesa", 1, "Hamburguesa con 2 toppings"],
      ["Perro", 0, "Perro sencillo"],
      ["Perro", 1, "Perro sencillo"],
      ["Salchipapa", 2, "Salchipapa con 2 toppings"],
      ["Mazorcada", 0, "Mazorcada"],
      ["Salchipapa familiar", 2, "Salchipapa familiar"],
    ];
    for (const [nombre, n, titulo] of casos) {
      const p = producto(nombre);
      expect(tituloLinea(p, cotizar(p, con(p, n))!)).toBe(titulo);
    }
  });

  test("detalles para cocina y recibo", () => {
    const hamburguesa = producto("Hamburguesa");
    const seleccion = { opciones: { g0: "pollo" }, toppings: ["chicharrón", "piña", "tocineta"] };
    expect(detallesLinea(hamburguesa, seleccion, cotizar(hamburguesa, seleccion)!)).toEqual([
      "Carne: Pollo",
      "Toppings: Chicharrón, Piña, Tocineta",
      "1 topping adicional (+$3.900 c/u)",
    ]);
    const perro = producto("Perro");
    const uno = { opciones: {}, toppings: ["queso"] };
    expect(detallesLinea(perro, uno, cotizar(perro, uno)!)).toEqual(["Toppings: Queso", "1 topping adicional (+$3.900 c/u)"]);
    const combo = producto("Combo con 2 toppings");
    const sinToppings = { opciones: { g0: "res" }, toppings: [] };
    expect(detallesLinea(combo, sinToppings, cotizar(combo, sinToppings)!)).toEqual(["Carne: Res", "Sin toppings"]);
    const mazorcada = producto("Mazorcada");
    const pollo = { opciones: { g0: "pollo" }, toppings: [] };
    expect(detallesLinea(mazorcada, pollo, cotizar(mazorcada, pollo)!)).toEqual(["Pollo"]);
  });

  test("ayuda de toppings", () => {
    const hamburguesa = producto("Hamburguesa");
    expect([0, 1, 2, 3].map((n) => ayudaToppings(hamburguesa, n))).toEqual([
      "Son opcionales: el precio se actualiza con cada uno.",
      "Te queda 1 topping incluido.",
      "Cada topping extra: $3.900.",
      "2 incluidos + 1 adicional de $3.900.",
    ]);
    const salchipapa = producto("Salchipapa");
    expect(ayudaToppings(salchipapa, 1)).toBe("1 adicional de $4.900.");
    const combo = producto("Combo con 2 toppings");
    expect([0, 1, 2].map((n) => ayudaToppings(combo, n))).toEqual([
      "Incluye 2 toppings.",
      "Te queda 1 topping incluido.",
      "Listo: elegiste 2 toppings, el máximo.",
    ]);
  });

  test("cuánto suma el siguiente topping", () => {
    const hamburguesa = producto("Hamburguesa");
    expect([0, 1, 2].map((n) => siguienteSuma(hamburguesa, n))).toEqual([3000, 0, 3900]);
    expect(siguienteSuma(producto("Combo con 2 toppings"), 2)).toBeNull();
  });
});
