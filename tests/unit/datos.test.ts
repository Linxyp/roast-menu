// Contrato con los afiches: si alguien cambia un precio o un topping por error, esta prueba lo avisa.
// Si el cambio es a propósito (nuevo precio del negocio), se actualiza aquí también.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, test } from "node:test";
import { IMAGENES } from "../../src/data/imagenes.generadas.ts";
import { CATEGORIAS, PRODUCTOS, productosDe } from "../../src/data/menu.ts";
import type { ProductoArmable } from "../../src/data/tipos.ts";
import { pesos } from "../../src/lib/formato.ts";

function armable(id: string): ProductoArmable {
  const producto = PRODUCTOS.find((p) => p.id === id);
  assert.ok(producto?.tipo === "armable", `No existe el producto «${id}»`);
  return producto;
}

const nombres = (producto: ProductoArmable, paso: number) =>
  producto.pasos?.[paso]?.opciones.map((opcion) => opcion.nombre);

describe("precios y toppings publicados en los afiches", () => {
  test("hamburguesa", () => {
    const hamburguesa = armable("hamburguesa");
    assert.deepEqual(hamburguesa.precios, [
      { nombre: "Sencilla", detalle: "1 carne + pan + cebolla, tomate y lechuga", precio: 16900 },
      { nombre: "Con 2 toppings", detalle: "1 carne + 2 toppings", precio: 19900 },
      { nombre: "Topping adicional", detalle: "Cada topping extra", precio: 3900 },
    ]);
    assert.deepEqual(nombres(hamburguesa, 0), ["Res", "Pollo"]);
    assert.deepEqual(nombres(hamburguesa, 1), [
      "Chicharrón",
      "Plátano maduro",
      "Piña",
      "Tocineta",
      "Queso",
      "Mazorca",
      "Papitas fosforito",
      "Guacamole",
      "Champiñones",
      "Huevo",
    ]);
  });

  test("combo", () => {
    assert.deepEqual(armable("combo").precios, [{ nombre: "Combo", precio: 26900 }]);
    const combo = CATEGORIAS.find((categoria) => categoria.id === "combo");
    assert.equal(`${combo?.titulo.pincel} ${combo?.titulo.principal}`, "En combo con 2 toppings");
    assert.equal(combo?.lema, "Hamburguesa + papas + bebida");
  });

  test("salchipapas", () => {
    const salchipapas = armable("salchipapas");
    assert.deepEqual(
      salchipapas.precios.map((fila) => [fila.nombre, fila.precio]),
      [
        ["Salchipapas con 2 toppings", 22900],
        ["Topping adicional", 4900],
      ],
    );
    assert.deepEqual(nombres(salchipapas, 0), [
      "Carne",
      "Pollo",
      "Plátano",
      "Chicharrón",
      "Queso",
      "Guacamole",
      "Maíz tierno",
      "Tocineta",
    ]);
  });

  test("bebidas", () => {
    assert.deepEqual(
      productosDe("bebidas").map((p) => [p.nombre, p.tipo === "simple" ? p.precio : null]),
      [
        ["Coca-Cola en lata", 5000],
        ["Cerveza negra 3 Cordilleras", 6500],
      ],
    );
  });
});

describe("integridad de los datos", () => {
  test("ids únicos y cada categoría con productos", () => {
    const ids = PRODUCTOS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const categoria of CATEGORIAS) assert.ok(productosDe(categoria.id).length > 0, categoria.id);
  });

  test("todos los precios son pesos enteros positivos", () => {
    const precios = PRODUCTOS.flatMap((p) => (p.tipo === "simple" ? [p.precio] : p.precios.map((f) => f.precio)));
    for (const precio of precios) assert.ok(Number.isInteger(precio) && precio > 0, pesos(precio));
  });

  test("cada foto de la carta existe y está optimizada", () => {
    const usadas = PRODUCTOS.flatMap((p) => [
      p.imagen,
      ...(p.tipo === "armable" ? (p.pasos ?? []).flatMap((paso) => paso.opciones.map((o) => o.imagen)) : []),
    ]);
    for (const id of new Set([...usadas, "logo-roast"])) {
      const info = IMAGENES[id];
      assert.ok(info, `Falta «${id}» en imagenes.generadas.ts (npm run imagenes)`);
      for (const ancho of info.anchos) {
        const archivo = new URL(`../../public/img/${id}-${ancho}.webp`, import.meta.url);
        assert.ok(existsSync(archivo), `Falta public/img/${id}-${ancho}.webp`);
      }
    }
  });
});

test("formato de pesos como en los afiches", () => {
  assert.equal(pesos(16900), "$16.900");
  assert.equal(pesos(5000), "$5.000");
  assert.equal(pesos(900), "$900");
  assert.equal(pesos(1234567), "$1.234.567");
  assert.equal(pesos(0), "$0");
});
