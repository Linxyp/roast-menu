import sharp from "sharp";
import { beforeEach, describe, expect, test } from "vitest";
import { cargarCarta } from "@/server/carta";
import { eliminarCategoria, eliminarProducto, guardarProducto, productoParaEditar } from "@/server/carta-admin";
import { db } from "@/server/db";
import { guardarImagen } from "@/server/imagenes";
import { crearPedido, pedidoPorId } from "@/server/pedidos";
import { cartaDePrueba, lineaHamburguesa, vaciarBase, type Carta } from "./fabrica";

let carta: Carta;

beforeEach(async () => {
  await vaciarBase();
  carta = await cartaDePrueba();
});

/** Lo que envía el editor del panel al guardar (fotos como ids). */
async function editable(id: string) {
  const p = await productoParaEditar(id);
  return {
    ...p,
    imagenId: p.imagen?.id ?? null,
    grupos: p.grupos.map((g) => ({ ...g, opciones: g.opciones.map((o) => ({ ...o, imagenId: o.imagen?.id ?? null })) })),
  };
}

const enCarta = async (nombre: string) =>
  (await cargarCarta()).categorias.flatMap((c) => c.productos).find((p) => p.nombre === nombre);

describe("editar la carta", () => {
  test("un precio nuevo se ve en la carta y se cobra en los pedidos nuevos; los anteriores no cambian", async () => {
    const antes = await crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [])] });
    const datos = await editable(carta.hamburguesa.id);
    datos.niveles[0].precio = 17900;
    datos.precioToppingAdicional = 4500;
    await guardarProducto(datos);

    expect((await enCarta("Hamburguesa"))?.niveles.map((n) => n.precio)).toEqual([17900, 19900]);
    const despues = await crearPedido(carta.mesa1.codigo, {
      cliente: "Ana",
      items: [lineaHamburguesa(carta, []), lineaHamburguesa(carta, Object.values(carta.toppings).map((t) => t.id))],
    });
    expect((await pedidoPorId(despues.id)).items.map((i) => i.precioUnitario)).toEqual([17900, 19900 + 2 * 4500]);
    expect((await pedidoPorId(antes.id)).items[0].precioUnitario).toBe(16900);
  });

  test("editar conserva los ids de las opciones: un carrito abierto sigue sirviendo", async () => {
    const datos = await editable(carta.hamburguesa.id);
    const [res, pollo] = datos.grupos[0].opciones;
    await guardarProducto({
      ...datos,
      grupos: [{ ...datos.grupos[0], opciones: [res, { ...pollo, nombre: "Pollo apanado" }, { nombre: "Cerdo", precioExtra: 2000 }] }],
    });

    const [grupo] = (await enCarta("Hamburguesa"))!.grupos;
    expect(grupo.id).toBe(carta.grupoCarne);
    expect(grupo.opciones.map((o) => [o.id === carta.res.id || o.id === carta.pollo.id, o.nombre, o.precioExtra])).toEqual([
      [true, "Res", 0],
      [true, "Pollo apanado", 0],
      [false, "Cerdo", 2000],
    ]);
    const pedido = await crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [], 1, carta.pollo.id)] });
    expect((await pedidoPorId(pedido.id)).items[0].detalles).toEqual(["Carne: Pollo apanado"]);

    const cerdo = grupo.opciones[2];
    const conRecargo = await crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [lineaHamburguesa(carta, [], 1, cerdo.id)] });
    expect((await pedidoPorId(conRecargo.id)).items[0]).toMatchObject({ precioUnitario: 16900 + 2000, detalles: ["Carne: Cerdo (+$2.000)"] });
  });

  test("crea productos nuevos y valida lo que no tiene sentido", async () => {
    const id = await guardarProducto({
      categoriaId: carta.categoria.id,
      nombre: "Perro",
      descripcion: "Pan, salchicha, queso y papitas fosforito",
      listaToppingsId: carta.lista.id,
      precioToppingAdicional: 3900,
      niveles: [
        { nombre: "Sencillo", precio: 8900, toppingsIncluidos: 0 },
        { nombre: "Con 2 toppings", precio: 12900, toppingsIncluidos: 2 },
      ],
    });
    const perro = await enCarta("Perro");
    expect(perro).toMatchObject({ id, descripcion: "Pan, salchicha, queso y papitas fosforito" });
    expect(perro?.toppings.map((t) => t.nombre)).toEqual(["Chicharrón", "Piña", "Tocineta", "Queso"]);

    const base = { categoriaId: carta.categoria.id, nombre: "Malo" };
    await expect(guardarProducto({ ...base, niveles: [] })).rejects.toThrow("Agrega al menos un precio.");
    await expect(guardarProducto({ ...base, niveles: [{ nombre: "Con 2", precio: 1000, toppingsIncluidos: 2 }] })).rejects.toThrow(
      "elige qué lista de toppings",
    );
    await expect(
      guardarProducto({ ...base, listaToppingsId: carta.lista.id, maxToppings: 1, niveles: [{ nombre: "Con 2", precio: 1000, toppingsIncluidos: 2 }] }),
    ).rejects.toThrow("más toppings que el máximo");
    await expect(guardarProducto({ ...base, niveles: [{ nombre: "Única", precio: 12.5, toppingsIncluidos: 0 }] })).rejects.toThrow("pesos");
  });

  test("eliminar un producto no borra las ventas pasadas; una categoría con productos no se elimina", async () => {
    const pedido = await crearPedido(carta.mesa1.codigo, { cliente: "Ana", items: [{ productoId: carta.gaseosa.id, cantidad: 1 }] });
    await eliminarProducto(carta.gaseosa.id);
    expect(await enCarta("Gaseosa")).toBeUndefined();
    expect((await pedidoPorId(pedido.id)).items[0]).toMatchObject({ nombre: "Gaseosa", subtotal: 5000 });
    await expect(eliminarCategoria(carta.categoria.id)).rejects.toMatchObject({ name: "ErrorNegocio" });
  });
});

describe("fotos", () => {
  test("convierte la foto subida a WebP en dos tamaños y rechaza lo que no es imagen", async () => {
    const foto = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 200, g: 120, b: 30 } } })
      .jpeg()
      .toBuffer();
    const { id } = await guardarImagen(db, foto);
    const guardada = await db.imagen.findUniqueOrThrow({ where: { id } });
    expect([guardada.ancho, guardada.alto]).toEqual([1200, 800]);
    expect(await sharp(guardada.grande).metadata()).toMatchObject({ format: "webp", width: 1200 });
    expect(await sharp(guardada.mini).metadata()).toMatchObject({ format: "webp", width: 480 });

    await expect(guardarImagen(db, Buffer.from("esto no es una foto"))).rejects.toMatchObject({ name: "ErrorNegocio" });
  });
});
