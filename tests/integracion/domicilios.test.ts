import { beforeEach, describe, expect, test } from "vitest";
import { diaColombia } from "@/lib/formato";
import { cambiarRecepcion, datosDomicilio, guardarAjustes, leerAjustes } from "@/server/ajustes";
import { db } from "@/server/db";
import {
  cambiarEstado,
  cobrarPedidos,
  crearDomicilio,
  crearPedido,
  fijarCostoEnvio,
  pedidoDomicilio,
  pedidoPorId,
  pedidosAbiertos,
} from "@/server/pedidos";
import { resumenVentas } from "@/server/ventas";
import { PERSONAL, cartaDePrueba, lineaHamburguesa, vaciarBase, type Carta } from "./fabrica";

let carta: Carta;

beforeEach(async () => {
  await vaciarBase();
  carta = await cartaDePrueba();
});

async function rechaza(promesa: Promise<unknown>, estado: number, mensaje: string | RegExp) {
  await expect(promesa).rejects.toMatchObject({ name: "ErrorNegocio", estado, message: expect.stringMatching(mensaje) });
}

/** Cambia solo los ajustes de domicilios (el formulario del panel envía todos los campos). */
async function ajustarDomicilios(cambios: Record<string, unknown>) {
  const a = await leerAjustes();
  await guardarAjustes({
    nombreNegocio: a.nombreNegocio,
    pieRecibo: a.pieRecibo,
    anchoRecibo: 80,
    metodosPago: a.metodosPago,
    recibiendoPedidos: a.recibiendoPedidos,
    direccion: a.direccion,
    horario: a.horario,
    instagram: a.instagram,
    domiciliosActivos: a.domiciliosActivos,
    costoDomicilio: a.costoDomicilio,
    pedidoMinimoDomicilio: a.pedidoMinimoDomicilio,
    zonaDomicilio: a.zonaDomicilio,
    telefonoNegocio: a.telefonoNegocio,
    ...cambios,
  });
}

const entrega = { cliente: "Ana", telefono: "300 123 4567", direccion: "Calle 10 # 5-20", barrio: "Centro", pago: "Efectivo" };
const gaseosas = (cantidad = 2) => [{ productoId: carta.gaseosa.id, cantidad }];

describe("pedidos a domicilio", () => {
  test("guarda los datos de entrega y suma el valor del domicilio de Ajustes", async () => {
    await ajustarDomicilios({ costoDomicilio: 4000 });
    const pedido = await crearDomicilio({ ...entrega, referencia: "Portón negro", pagaCon: 50000, items: [lineaHamburguesa(carta, [])] });
    expect(pedido).toMatchObject({ numero: 1, tipo: "DOMICILIO", mesaNumero: null, total: 16900 + 4000 });
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({
      tipo: "DOMICILIO",
      mesaId: null,
      mesaNumero: null,
      cliente: "Ana",
      telefono: "3001234567",
      direccion: "Calle 10 # 5-20",
      barrio: "Centro",
      referencia: "Portón negro",
      pagoPreferido: "Efectivo",
      pagaCon: 50000,
      costoEnvio: 4000,
      total: 20900,
    });
  });

  test("sin valor en Ajustes queda por confirmar: no se cobra hasta fijarlo y el total se recalcula", async () => {
    const pedido = await crearDomicilio({ ...entrega, items: gaseosas() });
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({ costoEnvio: null, total: 10000 });
    await rechaza(cobrarPedidos([pedido.id], "Efectivo"), 409, "Fija el valor del domicilio");

    await fijarCostoEnvio(pedido.id, 3500);
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({ costoEnvio: 3500, total: 13500 });
    await fijarCostoEnvio(pedido.id, 5000); // corrección: no se acumula
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({ costoEnvio: 5000, total: 15000 });

    await expect(cobrarPedidos([pedido.id], "Nequi")).resolves.toEqual({ pedidos: 1, total: 15000 });
    await rechaza(fijarCostoEnvio(pedido.id, 1000), 409, "ya está cobrado");
    await rechaza(fijarCostoEnvio(pedido.id, -1), 400, "en pesos");
  });

  test("valida celular, dirección, barrio, forma de pago y con cuánto paga, y no guarda nada si algo falla", async () => {
    await ajustarDomicilios({ costoDomicilio: 4000 });
    const items = gaseosas();
    await rechaza(crearDomicilio({ ...entrega, telefono: "12345", items }), 400, "celular de 10 dígitos");
    await rechaza(crearDomicilio({ ...entrega, direccion: "Cl", items }), 400, "dirección completa");
    await rechaza(crearDomicilio({ ...entrega, barrio: " ", items }), 400, "barrio");
    await rechaza(crearDomicilio({ ...entrega, pago: "Bitcoin", items }), 400, "Elige cómo vas a pagar");
    await rechaza(crearDomicilio({ ...entrega, pagaCon: 10000, items }), 400, "no alcanza: el total es \\$14.000");
    expect(await db.pedido.count()).toBe(0);

    // +57 y espacios se normalizan; «con cuánto paga» solo cuenta en efectivo.
    const pedido = await crearDomicilio({ ...entrega, telefono: "+57 310 555 0000", pago: "Nequi", pagaCon: 50000, items });
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({ telefono: "3105550000", pagoPreferido: "Nequi", pagaCon: null });
  });

  test("respeta el pedido mínimo, el interruptor de domicilios y la pausa general de pedidos", async () => {
    await ajustarDomicilios({ pedidoMinimoDomicilio: 20000 });
    await rechaza(crearDomicilio({ ...entrega, items: gaseosas() }), 409, "pedido mínimo para domicilio es \\$20.000");
    await expect(crearDomicilio({ ...entrega, items: gaseosas(4) })).resolves.toMatchObject({ total: 20000 });

    await ajustarDomicilios({ domiciliosActivos: false });
    await rechaza(crearDomicilio({ ...entrega, items: gaseosas(4) }), 409, "no estamos tomando domicilios");
    await expect(datosDomicilio()).resolves.toMatchObject({ activo: false });

    await ajustarDomicilios({ domiciliosActivos: true });
    await cambiarRecepcion(false);
    await rechaza(crearDomicilio({ ...entrega, items: gaseosas(4) }), 409, "no estamos tomando domicilios");
    await expect(datosDomicilio()).resolves.toMatchObject({ activo: false });
  });

  test("el cliente sigue su domicilio sin ver su teléfono ni su dirección; un pedido de mesa no se consulta por ahí", async () => {
    const domicilio = await crearDomicilio({ ...entrega, items: gaseosas() });
    const visto = await pedidoDomicilio(domicilio.id);
    expect(visto).toMatchObject({ numero: 1, tipo: "DOMICILIO", estado: "NUEVO", costoEnvio: null, total: 10000 });
    expect(visto).not.toHaveProperty("telefono");
    expect(visto).not.toHaveProperty("direccion");

    const deMesa = await crearPedido(carta.mesa1.codigo, { cliente: "Luis", items: gaseosas(1) });
    await rechaza(pedidoDomicilio(deMesa.id), 404, "no existe");
  });

  test("mesas y domicilios comparten la numeración del día y el tablero; las ventas los separan", async () => {
    await ajustarDomicilios({ costoDomicilio: 4000 });
    const mesa = await crearPedido(carta.mesa1.codigo, { cliente: "Luis", items: [lineaHamburguesa(carta, [])] });
    const domicilio = await crearDomicilio({ ...entrega, items: gaseosas() });
    expect([mesa.numero, domicilio.numero]).toEqual([1, 2]);
    expect((await pedidosAbiertos()).map((p) => p.tipo)).toEqual(["MESA", "DOMICILIO"]);

    await cambiarEstado(domicilio.id, "ENTREGADO", PERSONAL);
    await cobrarPedidos([mesa.id], "Efectivo");
    await cobrarPedidos([domicilio.id], "Efectivo");
    const ventas = await resumenVentas(diaColombia(), diaColombia());
    expect(ventas.total).toBe(16900 + 14000);
    expect(ventas.porMesa).toEqual([
      { mesa: 1, pedidos: 1, total: 16900 },
      { mesa: null, pedidos: 1, total: 14000 },
    ]);
  });
});
