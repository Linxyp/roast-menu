import { beforeEach, describe, expect, test } from "vitest";
import { diaColombia, fechaDia } from "@/lib/formato";
import { cambiarRecepcion } from "@/server/ajustes";
import { db } from "@/server/db";
import { escucharPedidos, type EventoPedido } from "@/server/eventos";
import {
  anularCobro,
  cambiarEstado,
  cobrarMesa,
  cobrarPedidos,
  crearPedido,
  marcarImpreso,
  pedidoDeMesa,
  pedidoPorId,
  pedidosAbiertos,
} from "@/server/pedidos";
import { ADMIN, PERSONAL, cartaDePrueba, lineaHamburguesa, vaciarBase, type Carta } from "./fabrica";

let carta: Carta;

beforeEach(async () => {
  await vaciarBase();
  carta = await cartaDePrueba();
});

/** Error de negocio con su estado HTTP y su mensaje. */
async function rechaza(promesa: Promise<unknown>, estado: number, mensaje: string | RegExp) {
  await expect(promesa).rejects.toMatchObject({ name: "ErrorNegocio", estado, message: expect.stringMatching(mensaje) });
}

const gaseosas = (cantidad = 1) => ({ cliente: "Ana", items: [{ productoId: carta.gaseosa.id, cantidad }] });

describe("pedido desde el QR de la mesa", () => {
  test("el servidor calcula cada precio: lo que mande el celular no cuenta", async () => {
    const { chicharron, pina, tocineta } = carta.toppings;
    const pedido = await crearPedido(carta.mesa1.codigo, {
      cliente: "  Ana  ",
      nota: "Somos dos",
      total: 100,
      items: [
        { ...lineaHamburguesa(carta, [tocineta.id, chicharron.id, pina.id], 2), nota: "sin cebolla", precio: 1, subtotal: 1 },
        { productoId: carta.gaseosa.id, cantidad: 1, precio: 0 },
      ],
    });
    expect(pedido).toMatchObject({ numero: 1, mesaNumero: 1, estado: "NUEVO", total: 2 * 23800 + 5000 });

    const guardado = await pedidoPorId(pedido.id);
    expect(guardado).toMatchObject({ cliente: "Ana", nota: "Somos dos", mesaId: carta.mesa1.id, pagadoEn: null });
    expect(guardado.items).toEqual([
      expect.objectContaining({
        nombre: "Hamburguesa con 2 toppings",
        detalles: ["Carne: Res", "Toppings: Chicharrón, Piña, Tocineta", "1 topping adicional (+$3.900 c/u)"],
        cantidad: 2,
        precioUnitario: 23800,
        subtotal: 47600,
        nota: "sin cebolla",
      }),
      expect.objectContaining({ nombre: "Gaseosa", detalles: [], cantidad: 1, precioUnitario: 5000, subtotal: 5000, nota: null }),
    ]);
  });

  test("cobra siempre la combinación más económica", async () => {
    const { chicharron } = carta.toppings;
    const pedido = await crearPedido(carta.mesa1.codigo, {
      cliente: "Luis",
      items: [lineaHamburguesa(carta, []), lineaHamburguesa(carta, [chicharron.id], 1, carta.pollo.id)],
    });
    const { items } = await pedidoPorId(pedido.id);
    expect(items.map((i) => [i.nombre, i.precioUnitario, i.detalles])).toEqual([
      ["Hamburguesa sencilla", 16900, ["Carne: Res"]],
      // 1 topping: «Con 2 toppings» ($19.900) sale más barato que sencilla + adicional ($20.800).
      ["Hamburguesa con 2 toppings", 19900, ["Carne: Pollo", "Toppings: Chicharrón"]],
    ]);
  });

  test("valida cada línea contra la carta de ese momento y no guarda nada si algo falla", async () => {
    const { queso } = carta.toppings;
    const sinCarne = { productoId: carta.hamburguesa.id, opciones: {}, toppings: [], cantidad: 1 };
    await rechaza(crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [sinCarne] }), 409, "Hamburguesa: Elige tu carne.");
    await rechaza(
      crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, ["inventado"])] }),
      409,
      "no están en la carta",
    );
    await rechaza(
      crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [queso.id, queso.id])] }),
      409,
      "repetidos",
    );

    await db.opcionGrupo.update({ where: { id: carta.pollo.id }, data: { disponible: false } });
    await rechaza(
      crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [], 1, carta.pollo.id)] }),
      409,
      "Pollo está agotado.",
    );
    await db.producto.update({ where: { id: carta.hamburguesa.id }, data: { agotado: true } });
    await rechaza(
      crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [])] }),
      409,
      /^Hamburguesa: Agotado por hoy\.$/,
    );
    await db.producto.update({ where: { id: carta.gaseosa.id }, data: { visible: false } });
    await rechaza(crearPedido(carta.mesa1.codigo, gaseosas()), 409, "ya no está en la carta");
    await rechaza(
      crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [{ productoId: "no-existe", cantidad: 1 }] }),
      409,
      "ya no está en la carta",
    );
    expect(await db.pedido.count()).toBe(0);
  });

  test("exige nombre, cantidades razonables y al menos un producto", async () => {
    await rechaza(crearPedido(carta.mesa1.codigo, { ...gaseosas(), cliente: "   " }), 400, "Escribe tu nombre");
    await rechaza(crearPedido(carta.mesa1.codigo, gaseosas(0)), 400, "La cantidad mínima es 1.");
    await rechaza(crearPedido(carta.mesa1.codigo, gaseosas(21)), 400, "Máximo 20 unidades");
    await rechaza(crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [] }), 400, "Tu pedido está vacío.");
  });

  test("no recibe pedidos de un QR viejo, de una mesa apagada ni con la recepción cerrada", async () => {
    await rechaza(crearPedido("noexiste", gaseosas()), 404, "ya no está activo");
    await db.mesa.update({ where: { id: carta.mesa2.id }, data: { activa: false } });
    await rechaza(crearPedido(carta.mesa2.codigo, gaseosas()), 404, "ya no está activo");
    await cambiarRecepcion(false);
    await rechaza(crearPedido(carta.mesa1.codigo, gaseosas()), 409, "no estamos recibiendo pedidos");
    await cambiarRecepcion(true);
    await expect(crearPedido(carta.mesa1.codigo, gaseosas())).resolves.toMatchObject({ numero: 1 });
  });

  test("numera los pedidos del día sin repetir aunque lleguen al mismo tiempo", async () => {
    const pedidos = await Promise.all(
      Array.from({ length: 12 }, (_, i) => crearPedido((i % 2 ? carta.mesa1 : carta.mesa2).codigo, gaseosas())),
    );
    expect(pedidos.map((p) => p.numero).sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    const fechas = await db.pedido.findMany({ distinct: ["fecha"], select: { fecha: true } });
    expect(fechas).toEqual([{ fecha: fechaDia(diaColombia()) }]);
  });

  test("avisa al panel en vivo cuando llega o cambia un pedido", async () => {
    const eventos: EventoPedido[] = [];
    const dejar = escucharPedidos((evento) => eventos.push(evento));
    const pedido = await crearPedido(carta.mesa2.codigo, gaseosas());
    await cambiarEstado(pedido.id, "PREPARANDO", PERSONAL);
    dejar();
    expect(eventos).toEqual([
      { tipo: "creado", pedidoId: pedido.id, numero: 1, mesaNumero: 2, estado: "NUEVO" },
      { tipo: "actualizado", pedidoId: pedido.id, numero: 1, mesaNumero: 2, estado: "PREPARANDO" },
    ]);
  });

  test("el cliente sigue su pedido solo desde el QR de su mesa", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, gaseosas(2));
    await expect(pedidoDeMesa(carta.mesa1.codigo, pedido.id)).resolves.toMatchObject({
      numero: 1,
      estado: "NUEVO",
      total: 10000,
      pagado: false,
      items: [{ nombre: "Gaseosa", cantidad: 2, subtotal: 10000, detalles: [], nota: null }],
    });
    await rechaza(pedidoDeMesa(carta.mesa2.codigo, pedido.id), 404, "no existe");
  });
});

describe("cocina y caja", () => {
  test("preparar, listo, entregar y cobrar", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [])] });
    for (const estado of ["PREPARANDO", "LISTO", "ENTREGADO"] as const) await cambiarEstado(pedido.id, estado, PERSONAL);
    // Entregado pero sin pagar: sigue en el tablero (columna «por cobrar»).
    expect((await pedidosAbiertos()).map((p) => p.id)).toEqual([pedido.id]);

    await rechaza(cobrarPedidos([pedido.id], "Bitcoin"), 400, "método de pago");
    await expect(cobrarPedidos([pedido.id], "Nequi")).resolves.toEqual({ pedidos: 1, total: 16900 });
    expect(await pedidosAbiertos()).toEqual([]);
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({ metodoPago: "Nequi", pagadoEn: expect.any(String) });
    await rechaza(cobrarPedidos([pedido.id], "Nequi"), 409, "No hay pedidos pendientes");

    await marcarImpreso(pedido.id);
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({ impresoEn: expect.any(String) });
  });

  test("rechaza cambios que no aplican y gana solo uno de dos cambios simultáneos", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, gaseosas());
    await cambiarEstado(pedido.id, "ENTREGADO", PERSONAL);
    await rechaza(cambiarEstado(pedido.id, "NUEVO", PERSONAL), 409, "no aplica");

    const otro = await crearPedido(carta.mesa1.codigo, gaseosas());
    const resultados = await Promise.allSettled([
      cambiarEstado(otro.id, "PREPARANDO", PERSONAL),
      cambiarEstado(otro.id, "PREPARANDO", PERSONAL),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.find((r) => r.status === "rejected")).toMatchObject({ reason: { estado: 409 } });
  });

  test("un pedido cobrado solo lo cancela un administrador, y el cobro solo lo anula un administrador", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, gaseosas());
    await cobrarPedidos([pedido.id], "Efectivo");
    await rechaza(cambiarEstado(pedido.id, "CANCELADO", PERSONAL), 403, "solo un administrador");
    await rechaza(anularCobro(pedido.id, PERSONAL), 403, "Solo un administrador");

    await anularCobro(pedido.id, ADMIN);
    await expect(pedidoPorId(pedido.id)).resolves.toMatchObject({ pagadoEn: null, metodoPago: null });
    await rechaza(anularCobro(pedido.id, ADMIN), 409, "no tiene un cobro");

    await cobrarPedidos([pedido.id], "Efectivo");
    await cambiarEstado(pedido.id, "CANCELADO", ADMIN);
    expect(await pedidosAbiertos()).toEqual([]);
  });

  test("cobrar la mesa suma todo lo pendiente de esa mesa y nada más", async () => {
    await crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [])] });
    await crearPedido(carta.mesa1.codigo, gaseosas(2));
    const cancelado = await crearPedido(carta.mesa1.codigo, gaseosas());
    const deOtraMesa = await crearPedido(carta.mesa2.codigo, gaseosas());
    await cambiarEstado(cancelado.id, "CANCELADO", PERSONAL);

    await expect(cobrarMesa(carta.mesa1.id, "Daviplata")).resolves.toEqual({ pedidos: 2, total: 16900 + 10000 });
    await expect(pedidoPorId(cancelado.id)).resolves.toMatchObject({ pagadoEn: null });
    await expect(pedidoPorId(deOtraMesa.id)).resolves.toMatchObject({ pagadoEn: null });
    await rechaza(cobrarMesa(carta.mesa1.id, "Daviplata"), 409, "No hay pedidos pendientes");
  });
});
