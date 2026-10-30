// Datos base del sistema (npm run db:seed). Se puede correr varias veces:
//  · Ajustes del negocio: los crea si faltan.
//  · Administrador: lo crea si no existe (SEED_ADMIN_USUARIO / SEED_ADMIN_CLAVE / SEED_ADMIN_NOMBRE).
//  · Mesas: crea las 10 iniciales solo si no hay ninguna.
//  · Carta: la carga desde prisma/datos-iniciales.ts solo si está vacía (después se edita en el panel).
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { IMAGENES } from "../src/data/imagenes.generadas";
import { cifrarClave, problemasClave } from "../src/server/auth/clave";
import { codigoMesa } from "../src/server/crypto";
import { crearCliente } from "../src/server/db";
import { guardarImagen } from "../src/server/imagenes";
import { CATEGORIAS, LISTAS, MESAS_INICIALES, type ListaClave } from "./datos-iniciales";

const db = crearCliente();
const raiz = path.resolve(import.meta.dirname, "..");

async function crearAdmin() {
  const usuario = (process.env.SEED_ADMIN_USUARIO || "admin").trim().toLowerCase();
  if (await db.usuario.findUnique({ where: { usuario } })) {
    console.log(`  administrador «${usuario}»: ya existe`);
    return;
  }
  const clave = process.env.SEED_ADMIN_CLAVE ?? "";
  const problemas = problemasClave(clave);
  if (problemas.length) throw new Error(`SEED_ADMIN_CLAVE no sirve: ${problemas.join(" ")}`);
  await db.usuario.create({
    data: {
      usuario,
      nombre: process.env.SEED_ADMIN_NOMBRE || "Administrador",
      rol: "ADMIN",
      claveHash: await cifrarClave(clave),
    },
  });
  console.log(`  administrador «${usuario}»: creado`);
}

async function crearMesas() {
  if ((await db.mesa.count()) > 0) {
    console.log("  mesas: ya existen");
    return;
  }
  for (let numero = 1; numero <= MESAS_INICIALES; numero++) {
    await db.mesa.create({ data: { numero, codigo: codigoMesa() } });
  }
  console.log(`  mesas: ${MESAS_INICIALES} creadas`);
}

async function cargarCarta() {
  if ((await db.categoria.count()) > 0) {
    console.log("  carta: ya tiene datos (no se toca)");
    return;
  }
  const fotos = new Map<string, string>();
  async function foto(clave: string | undefined): Promise<string | null> {
    if (!clave) return null;
    const guardada = fotos.get(clave);
    if (guardada) return guardada;
    const info = IMAGENES[clave];
    if (!info) throw new Error(`Falta la foto «${clave}» (npm run imagenes)`);
    const archivo = await readFile(path.join(raiz, "public", "img", `${clave}-${info.ancho}.webp`));
    const { id } = await guardarImagen(db, archivo, { talCual: true });
    fotos.set(clave, id);
    return id;
  }

  const listas = new Map<ListaClave, string>();
  for (const [orden, [clave, lista]] of (Object.entries(LISTAS) as [ListaClave, (typeof LISTAS)[ListaClave]][]).entries()) {
    const creada = await db.listaToppings.create({ data: { nombre: lista.nombre, orden } });
    for (const [ordenTopping, topping] of lista.toppings.entries()) {
      await db.topping.create({
        data: { listaId: creada.id, nombre: topping.nombre, imagenId: await foto(topping.imagen), orden: ordenTopping },
      });
    }
    listas.set(clave, creada.id);
  }

  let productos = 0;
  for (const [orden, categoria] of CATEGORIAS.entries()) {
    const { id: categoriaId } = await db.categoria.create({
      data: {
        nombre: categoria.nombre,
        tituloPrincipal: categoria.tituloPrincipal ?? null,
        tituloPincel: categoria.tituloPincel ?? null,
        pincelPrimero: categoria.pincelPrimero ?? false,
        lema: categoria.lema ?? null,
        orden,
      },
    });
    for (const [ordenProducto, producto] of categoria.productos.entries()) {
      const { id: productoId } = await db.producto.create({
        data: {
          categoriaId,
          nombre: producto.nombre,
          descripcion: producto.descripcion ?? null,
          imagenId: await foto(producto.imagen),
          orden: ordenProducto,
          listaToppingsId: producto.lista ? listas.get(producto.lista) : null,
          precioToppingAdicional: producto.precioToppingAdicional ?? null,
          maxToppings: producto.maxToppings ?? null,
          nota: producto.nota ?? null,
          niveles: {
            create: producto.niveles.map((nivel, ordenNivel) => ({
              nombre: nivel.nombre,
              detalle: nivel.detalle ?? null,
              precio: nivel.precio,
              toppingsIncluidos: nivel.toppingsIncluidos ?? 0,
              orden: ordenNivel,
            })),
          },
        },
      });
      for (const [ordenGrupo, grupo] of (producto.grupos ?? []).entries()) {
        const { id: grupoId } = await db.grupoOpciones.create({
          data: { productoId, titulo: grupo.titulo, etiqueta: grupo.etiqueta, orden: ordenGrupo },
        });
        for (const [ordenOpcion, opcion] of grupo.opciones.entries()) {
          await db.opcionGrupo.create({
            data: { grupoId, nombre: opcion.nombre, imagenId: await foto(opcion.imagen), orden: ordenOpcion },
          });
        }
      }
      productos++;
    }
  }
  console.log(`  carta: ${CATEGORIAS.length} categorías, ${productos} productos, ${fotos.size} fotos`);
}

async function main() {
  await db.ajustes.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  await crearAdmin();
  await crearMesas();
  await cargarCarta();
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
