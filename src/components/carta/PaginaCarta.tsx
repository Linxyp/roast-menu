import { Fragment } from "react";
import type { CartaDTO, CategoriaDTO, MesaDTO, ProductoDTO } from "@/lib/carta";
import { IconoBebida, IconoHamburguesa, IconoMas, IconoPapas } from "../Iconos";
import { BotonProducto } from "./BotonProducto";
import { Diagnostico } from "./Diagnostico";
import { Foto } from "./Foto";
import { NavCategorias } from "./NavCategorias";
import { NombreProducto } from "./NombreProducto";
import { Precio } from "./Precio";
import { TablaPrecios } from "./TablaPrecios";
import { ToquesTempranos } from "./ToquesTempranos";

/** Ancla legible de cada sección: «hamburguesas», «perros»… */
export function anclas(categorias: CategoriaDTO[]): Map<string, string> {
  const usadas = new Set<string>();
  const resultado = new Map<string, string>();
  for (const c of categorias) {
    const base =
      c.nombre
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "seccion";
    let ancla = base;
    for (let i = 2; usadas.has(ancla); i++) ancla = `${base}-${i}`;
    usadas.add(ancla);
    resultado.set(c.id, ancla);
  }
  return resultado;
}

export function PaginaCarta({ carta, mesa }: { carta: CartaDTO; mesa: MesaDTO | null }) {
  const ids = anclas(carta.categorias);
  const conPedidos = mesa !== null && carta.negocio.recibiendoPedidos;
  return (
    <>
      <Diagnostico />
      <ToquesTempranos />
      <a href="#menu" className="saltar">
        Saltar al menú
      </a>
      <header className="encabezado">
        <h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-roast-446.webp" alt={carta.negocio.nombre} width={446} height={233} className="encabezado-logo" fetchPriority="high" />
          <span className="encabezado-menu">Menú</span>
        </h1>
        {mesa ? (
          <p className="encabezado-mesa">
            <span>Mesa {mesa.numero}</span>
            {mesa.nombre ? <span className="text-crema/70"> · {mesa.nombre}</span> : null}
          </p>
        ) : null}
        <p className="encabezado-intro">
          {!mesa
            ? "Para pedir, escanea el código QR de tu mesa"
            : conPedidos
              ? "Elige, arma tu pedido y envíalo desde aquí"
              : "En este momento no estamos recibiendo pedidos por el QR: pide ayuda al personal"}
        </p>
      </header>
      <NavCategorias categorias={carta.categorias.map((c) => ({ id: ids.get(c.id)!, nombre: c.nombre }))} />
      <main id="menu" tabIndex={-1} className="pb-28 outline-none">
        {carta.categorias.length === 0 ? <p className="py-20 text-center text-crema/80">La carta se está actualizando. Vuelve en un momento.</p> : null}
        {carta.categorias.map((categoria, indice) => (
          <Seccion key={categoria.id} categoria={categoria} ancla={ids.get(categoria.id)!} primera={indice === 0} />
        ))}
      </main>
      <footer className="pie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-roast-446.webp" alt="" width={446} height={233} className="pie-logo" loading="lazy" />
        {carta.negocio.direccion || carta.negocio.horario ? (
          <dl className="pie-datos">
            {carta.negocio.direccion ? (
              <div>
                <dt>Dirección</dt>
                <dd>{carta.negocio.direccion}</dd>
              </div>
            ) : null}
            {carta.negocio.horario ? (
              <div>
                <dt>Horario</dt>
                <dd>{carta.negocio.horario}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {carta.negocio.instagram ? (
          <a className="pie-enlace" href={`https://www.instagram.com/${carta.negocio.instagram.replace(/^@/, "")}/`} target="_blank" rel="noopener noreferrer">
            @{carta.negocio.instagram.replace(/^@/, "")} en Instagram
          </a>
        ) : null}
        <p className="pie-legal">Precios en pesos colombianos (COP).</p>
        <p className="pie-legal">© {new Date().getFullYear()} {carta.negocio.nombre}</p>
      </footer>
    </>
  );
}

function Seccion({ categoria, ancla, primera }: { categoria: CategoriaDTO; ancla: string; primera: boolean }) {
  const tituloId = `titulo-${ancla}`;
  const pincel = categoria.tituloPincel ? <span className="titulo-pincel">{categoria.tituloPincel}</span> : null;
  const principal = categoria.tituloPrincipal ? <span className="titulo-principal">{categoria.tituloPrincipal}</span> : null;
  const sencillos = categoria.productos.filter(esSencillo);
  const armables = categoria.productos.filter((p) => !esSencillo(p));
  const notas = [...new Set(categoria.productos.flatMap((p) => p.nota ?? []))];
  const combo = /papas/i.test(categoria.lema ?? "") && /bebida/i.test(categoria.lema ?? "");

  return (
    <section id={ancla} aria-labelledby={tituloId} className="seccion">
      <div className="seccion-cabecera">
        <h2 id={tituloId} className="titulo-seccion">
          {categoria.pincelPrimero ? pincel : principal} {categoria.pincelPrimero ? principal : pincel}
        </h2>
        {categoria.lema ? <p className="seccion-lema">{categoria.lema}</p> : null}
        {combo ? (
          <div className="iconos-combo" aria-hidden="true">
            <IconoHamburguesa className="size-11" />
            <IconoMas className="size-5 text-crema/70" />
            <IconoPapas className="size-11" />
            <IconoMas className="size-5 text-crema/70" />
            <IconoBebida className="size-11" />
          </div>
        ) : null}
      </div>

      {armables.length === 1 ? (
        <Destacado producto={armables[0]} prioridad={primera} />
      ) : armables.length > 1 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {armables.map((producto, i) => (
            <Tarjeta key={producto.id} producto={producto} prioridad={primera && i === 0} />
          ))}
        </div>
      ) : null}

      {sencillos.length > 0 ? (
        <div className={`mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-5 ${armables.length ? "mt-6" : ""} ${sencillos.length > 2 ? "md:grid-cols-3" : ""}`}>
          {sencillos.map((producto) => (
            <TarjetaSencilla key={producto.id} producto={producto} />
          ))}
        </div>
      ) : null}

      {notas.map((nota) => (
        <p key={nota} className="nota-legal">
          {nota}
        </p>
      ))}
    </section>
  );
}

/** Producto de un solo precio sin nada que elegir (bebidas). */
function esSencillo(p: ProductoDTO): boolean {
  return p.niveles.length === 1 && p.grupos.length === 0 && p.toppings.length === 0;
}

function Resumen({ producto }: { producto: ProductoDTO }) {
  const elecciones = producto.grupos.map((g) => ({ titulo: g.etiqueta || g.titulo.replace(/^¿|\?$/g, ""), opciones: g.opciones.map((o) => o.nombre) }));
  if (elecciones.length === 0 && producto.toppings.length === 0) return null;
  return (
    <dl className="destacado-opciones">
      {elecciones.map((e) => (
        <div key={e.titulo}>
          <dt>{e.titulo}</dt>
          <dd>{e.opciones.join(" o ")}</dd>
        </div>
      ))}
      {producto.toppings.length > 0 ? (
        <div>
          <dt>Toppings</dt>
          <dd>
            {producto.toppings.map((t, i) => (
              <Fragment key={t.id}>
                <span className={`whitespace-nowrap ${t.disponible ? "" : "line-through opacity-60"}`}>
                  {t.nombre}
                  {i < producto.toppings.length - 1 ? " ·" : ""}
                </span>{" "}
              </Fragment>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function Destacado({ producto, prioridad }: { producto: ProductoDTO; prioridad: boolean }) {
  // Sin foto, la tarjeta es solo de texto (la foto aparece al subirla desde el panel).
  return (
    <article className={producto.imagen ? "destacado" : "destacado destacado-sin-foto"} aria-label={producto.nombre}>
      <div className="destacado-principal">
        {producto.imagen ? (
          <div className="destacado-foto">
            <Foto imagen={producto.imagen} alt={producto.nombre} sizes="(min-width: 1024px) 540px, (min-width: 768px) 50vw, 100vw" prioridad={prioridad} />
            {producto.agotado ? <span className="sello-agotado">Agotado</span> : null}
          </div>
        ) : null}
        <div className="destacado-info">
          {!producto.imagen && producto.agotado ? <span className="sello-agotado">Agotado</span> : null}
          <TablaPrecios producto={producto} />
          <Resumen producto={producto} />
          <BotonProducto productoId={producto.id} nombre={producto.nombre} agotado={producto.agotado} armable />
        </div>
      </div>
    </article>
  );
}

function Tarjeta({ producto, prioridad }: { producto: ProductoDTO; prioridad: boolean }) {
  return (
    <article className={producto.imagen ? "tarjeta-producto" : "tarjeta-producto tarjeta-sin-foto"} aria-labelledby={`p-${producto.id}`}>
      {producto.imagen ? (
        <div className="tarjeta-producto-foto">
          <Foto imagen={producto.imagen} alt="" sizes="(min-width: 768px) 520px, 100vw" prioridad={prioridad} />
          {producto.agotado ? <span className="sello-agotado">Agotado</span> : null}
        </div>
      ) : null}
      <div className="tarjeta-producto-info">
        {!producto.imagen && producto.agotado ? <span className="sello-agotado">Agotado</span> : null}
        <h3 id={`p-${producto.id}`} className="tarjeta-producto-nombre">
          <NombreProducto nombre={producto.nombre} />
        </h3>
        {producto.descripcion ? <p className="tarjeta-producto-descripcion">{producto.descripcion}</p> : null}
        <TablaPrecios producto={producto} compacta />
        <Resumen producto={producto} />
        <div className="mt-auto pt-2">
          <BotonProducto productoId={producto.id} nombre={producto.nombre} agotado={producto.agotado} armable />
        </div>
      </div>
    </article>
  );
}

function TarjetaSencilla({ producto }: { producto: ProductoDTO }) {
  return (
    <article className="bebida" aria-labelledby={`p-${producto.id}`}>
      {producto.imagen ? (
        <div className="bebida-foto">
          <Foto imagen={producto.imagen} alt="" sizes="150px" />
        </div>
      ) : null}
      <h3 id={`p-${producto.id}`} className="bebida-nombre">
        <NombreProducto nombre={producto.nombre} />
      </h3>
      <Precio valor={producto.niveles[0].precio} />
      {producto.agotado ? <p className="text-sm text-crema/70">Agotado por hoy</p> : null}
      <div className="mt-auto w-full">
        <BotonProducto productoId={producto.id} nombre={producto.nombre} agotado={producto.agotado} armable={false} />
      </div>
    </article>
  );
}
