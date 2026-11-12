import { describe, expect, test } from "vitest";
import { formatearTelefono } from "@/lib/formato";
import {
  cobroDomicilio,
  envioMaximo,
  esEfectivo,
  lugarPedido,
  normalizarTelefono,
  textoCobroDomicilio,
  valoresSugeridos,
} from "@/lib/pedido";

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

describe("valor del domicilio", () => {
  test("fijo, gratis, por confirmar o un rango según la distancia", () => {
    expect(cobroDomicilio(4000, null)).toEqual({ tipo: "fijo", valor: 4000 });
    expect(cobroDomicilio(4000, 4000)).toEqual({ tipo: "fijo", valor: 4000 });
    expect(cobroDomicilio(null, null)).toEqual({ tipo: "confirmar" });
    expect(cobroDomicilio(8000, 10000)).toEqual({ tipo: "rango", desde: 8000, hasta: 10000 });

    expect(textoCobroDomicilio(cobroDomicilio(4000, null))).toBe("$4.000");
    expect(textoCobroDomicilio(cobroDomicilio(0, null))).toBe("gratis");
    expect(textoCobroDomicilio(cobroDomicilio(null, null))).toBe("por confirmar");
    expect(textoCobroDomicilio(cobroDomicilio(8000, 10000))).toBe("$8.000 a $10.000");
  });

  test("el efectivo debe alcanzar para el domicilio más caro", () => {
    expect(envioMaximo(cobroDomicilio(8000, 10000))).toBe(10000);
    expect(envioMaximo(cobroDomicilio(4000, null))).toBe(4000);
    expect(envioMaximo(cobroDomicilio(null, null))).toBe(0);
  });

  test("el panel ofrece los extremos del rango y el punto medio redondo", () => {
    expect(valoresSugeridos(cobroDomicilio(8000, 10000))).toEqual([8000, 9000, 10000]);
    expect(valoresSugeridos(cobroDomicilio(8000, 8500))).toEqual([8000, 8500]);
    expect(valoresSugeridos(cobroDomicilio(4000, null))).toEqual([]);
  });
});
