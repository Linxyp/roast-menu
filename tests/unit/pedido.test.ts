import { describe, expect, test } from "vitest";
import { formatearTelefono } from "@/lib/formato";
import { esEfectivo, lugarPedido, normalizarTelefono } from "@/lib/pedido";

describe("teléfonos de los domicilios", () => {
  test("acepta celulares y fijos colombianos de 10 dígitos, escritos como sea", () => {
    expect(normalizarTelefono("3001234567")).toBe("3001234567");
    expect(normalizarTelefono("300 123 4567")).toBe("3001234567");
    expect(normalizarTelefono("+57 300-123-4567")).toBe("3001234567");
    expect(normalizarTelefono("573001234567")).toBe("3001234567");
    expect(normalizarTelefono("604 123 4567")).toBe("6041234567");
  });

  test("rechaza lo que no es un número colombiano", () => {
    for (const malo of ["", "12345", "300123456", "30012345678", "2001234567", "abc", "1234567890"]) {
      expect(normalizarTelefono(malo)).toBeNull();
    }
  });

  test("se muestran agrupados para leerlos rápido", () => {
    expect(formatearTelefono("3001234567")).toBe("300 123 4567");
    expect(formatearTelefono("123")).toBe("123");
  });
});

test("solo en efectivo se pregunta con cuánto paga", () => {
  expect(esEfectivo("Efectivo")).toBe(true);
  expect(esEfectivo("efectivo contraentrega")).toBe(true);
  expect(esEfectivo("Nequi")).toBe(false);
});

test("el panel y los recibos dicen si es una mesa o un domicilio", () => {
  expect(lugarPedido({ tipo: "MESA", mesaNumero: 4 })).toBe("Mesa 4");
  expect(lugarPedido({ tipo: "DOMICILIO", mesaNumero: null })).toBe("Domicilio");
});
