import { beforeEach, describe, expect, test } from "vitest";
import { diaColombia } from "@/lib/formato";
import { db } from "@/server/db";
import { actualizarMesa, agregarMesas, cambiarCodigo, cuentaMesa, eliminarMesa, listarMesas, urlMesa } from "@/server/mesas";
import { cambiarEstado, cobrarPedidos, crearPedido } from "@/server/pedidos";
import { resumenVentas } from "@/server/ventas";
import { ADMIN, PERSONAL, cartaDePrueba, lineaHamburguesa, vaciarBase, type Carta } from "./fabrica";

let carta: Carta;

beforeEach(async () => {
  await vaciarBase();
  carta = await cartaDePrueba();
});

async function rechaza(promesa: Promise<unknown>, estado: number, mensaje: string | RegExp) {
  await expect(promesa).rejects.toMatchObject({ name: "ErrorNegocio", estado, message: expect.stringMatching(mensaje) });
}

const gaseosas = (cantidad = 1) => ({ cliente: "Ana", items: [{ productoId: carta.gaseosa.id, cantidad }] });
const resumenDe = async (numero: number) => (await listarMesas()).find((m) => m.numero === numero)!;

describe("mesas", () => {
  test("agregar mesas continúa la numeración y cada una tiene su propio QR", async () => {
    await agregarMesas(3);
    const mesas = await listarMesas();
    expect(mesas.map((m) => m.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(mesas.map((m) => m.codigo)).size).toBe(5);
    for (const mesa of mesas.slice(2)) expect(mesa.codigo).toMatch(/^[2-9a-hjkmnp-z]{8}$/);
    expect(urlMesa(mesas[4].codigo)).toBe(`https://roast.ejemplo/m/${mesas[4].codigo}`);
    await rechaza(agregarMesas(0), 400, "entre 1 y 50");
    await rechaza(agregarMesas(51), 400, "entre 1 y 50");
  });

  test("el resumen muestra lo abierto, lo que está en cocina y lo que falta por cobrar", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, gaseosas(2));
    expect(await resumenDe(1)).toMatchObject({ abiertos: 1, porCobrar: 10000, enCocina: true });
    expect(await resumenDe(2)).toMatchObject({ abiertos: 0, porCobrar: 0, enCocina: false });

    await cobrarPedidos([pedido.id], "Nequi");
    expect(await resumenDe(1)).toMatchObject({ abiertos: 1, porCobrar: 0, enCocina: true });
    await cambiarEstado(pedido.id, "ENTREGADO", PERSONAL);
    expect(await resumenDe(1)).toMatchObject({ abiertos: 0, porCobrar: 0, enCocina: false });
  });

  test("la cuenta de la mesa separa lo pendiente de lo ya cobrado", async () => {
    const cobrado = await crearPedido(carta.mesa1.codigo, gaseosas());
    const pendiente = await crearPedido(carta.mesa1.codigo, { cliente: "Luis", items: [lineaHamburguesa(carta, [])] });
    await crearPedido(carta.mesa2.codigo, gaseosas());
    await cobrarPedidos([cobrado.id], "Efectivo");

    const cuenta = await cuentaMesa(carta.mesa1.id);
    expect(cuenta.mesa.numero).toBe(1);
    expect(cuenta.pendientes.map((p) => [p.id, p.cliente, p.total])).toEqual([[pendiente.id, "Luis", 16900]]);
    expect(cuenta.cobradosHoy.map((p) => [p.id, p.metodoPago])).toEqual([[cobrado.id, "Efectivo"]]);
  });

  test("no repite números; un código nuevo invalida el QR anterior", async () => {
    await rechaza(actualizarMesa(carta.mesa2.id, { numero: 1 }), 400, "Ya existe una mesa con ese número");
    await actualizarMesa(carta.mesa2.id, { numero: 12, nombre: "  Terraza  " });
    await expect(db.mesa.findUnique({ where: { id: carta.mesa2.id } })).resolves.toMatchObject({ numero: 12, nombre: "Terraza" });

    await cambiarCodigo(carta.mesa1.id);
    const { codigo } = await db.mesa.findUniqueOrThrow({ where: { id: carta.mesa1.id } });
    expect(codigo).not.toBe(carta.mesa1.codigo);
    await rechaza(crearPedido(carta.mesa1.codigo, gaseosas()), 404, "ya no está activo");
    await expect(crearPedido(codigo, gaseosas())).resolves.toMatchObject({ mesaNumero: 1 });
  });

  test("eliminar: no con pedidos abiertos; con historial solo se desactiva", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, gaseosas());
    await rechaza(eliminarMesa(carta.mesa1.id), 409, "pedidos abiertos");
    await cambiarEstado(pedido.id, "ENTREGADO", PERSONAL);
    await cobrarPedidos([pedido.id], "Efectivo");

    await expect(eliminarMesa(carta.mesa1.id)).resolves.toBe("desactivada");
    await expect(eliminarMesa(carta.mesa2.id)).resolves.toBe("eliminada");
    expect((await listarMesas()).map((m) => [m.numero, m.activa])).toEqual([[1, false]]);
    // La venta conserva su mesa.
    expect((await resumenVentas(diaColombia(), diaColombia())).porMesa).toEqual([{ mesa: 1, pedidos: 1, total: 5000 }]);
  });
});

describe("ventas", () => {
  test("cuenta solo lo cobrado y lo desglosa por método, producto y mesa", async () => {
    const a = await crearPedido(carta.mesa1.codigo, gaseosas());
    const b = await crearPedido(carta.mesa2.codigo, {
      cliente: "Luis",
      items: [lineaHamburguesa(carta, [carta.toppings.queso.id, carta.toppings.pina.id]), { productoId: carta.gaseosa.id, cantidad: 2 }],
    });
    await crearPedido(carta.mesa1.codigo, gaseosas()); // sin cobrar
    const anulado = await crearPedido(carta.mesa2.codigo, gaseosas());
    await cobrarPedidos([a.id], "Nequi");
    await cobrarPedidos([b.id, anulado.id], "Efectivo");
    await cambiarEstado(anulado.id, "CANCELADO", ADMIN);

    const hoy = diaColombia();
    const ventas = await resumenVentas(hoy, hoy);
    expect(ventas).toMatchObject({ total: 5000 + 29900, pedidos: 2, promedio: 17450 });
    expect(ventas.porMetodo).toEqual([
      { metodo: "Efectivo", pedidos: 1, total: 29900 },
      { metodo: "Nequi", pedidos: 1, total: 5000 },
    ]);
    expect(ventas.porProducto).toEqual([
      { nombre: "Gaseosa", unidades: 3, total: 15000 },
      { nombre: "Hamburguesa con 2 toppings", unidades: 1, total: 19900 },
    ]);
    expect(ventas.porMesa).toEqual([
      { mesa: 1, pedidos: 1, total: 5000 },
      { mesa: 2, pedidos: 1, total: 29900 },
    ]);
    expect(ventas.lista.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
  });

  test("el día se corta a la medianoche de Colombia, no a la del servidor", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, gaseosas());
    await cobrarPedidos([pedido.id], "Nequi");
    // 11:30 p. m. del 28 de octubre en Colombia = 04:30 del 29 en UTC.
    await db.pedido.update({ where: { id: pedido.id }, data: { pagadoEn: new Date("2026-10-29T04:30:00Z") } });
    expect((await resumenVentas("2026-10-28", "2026-10-28")).pedidos).toBe(1);
    expect((await resumenVentas("2026-10-29", "2026-10-29")).pedidos).toBe(0);
    expect((await resumenVentas("2026-10-01", "2026-10-31")).total).toBe(5000);
  });
});
