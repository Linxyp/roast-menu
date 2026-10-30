"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { eliminarProducto, guardarProducto } from "@/app/admin/acciones";
import type { ImagenDTO, ProductoDTO, ToppingDTO } from "@/lib/carta";
import { pesos, plural } from "@/lib/formato";
import { cotizar, tituloLinea } from "@/lib/precios";
import type { ProductoParaEditar } from "@/server/carta-admin";
import { IconoAbajo, IconoArriba, IconoMas, IconoPapelera } from "../../Iconos";
import { DialogoConfirmar } from "../Dialogos";
import { SubirFoto } from "./SubirFoto";

interface NivelForm {
  clave: string;
  nombre: string;
  detalle: string;
  precio: string;
  toppingsIncluidos: string;
}
interface OpcionForm {
  clave: string;
  id?: string;
  nombre: string;
  precioExtra: string;
  imagen: ImagenDTO | null;
  disponible: boolean;
}
interface GrupoForm {
  clave: string;
  id?: string;
  titulo: string;
  etiqueta: string;
  opciones: OpcionForm[];
}

/** Clave para elementos nuevos de las listas (solo se llama al tocar un botón). */
const nuevaClave = () => Math.random().toString(36).slice(2, 10);
/** «16.900», «$16900» o «16900» → 16900. Vacío → null. */
const aPesos = (texto: string): number | null => {
  const limpio = texto.replace(/[^\d]/g, "");
  return limpio ? Number(limpio) : null;
};
const formatoEntrada = (n: number | null | undefined) => (n == null ? "" : String(n));

function mover<T>(lista: T[], i: number, direccion: -1 | 1): T[] {
  const j = i + direccion;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

interface Props {
  inicial: ProductoParaEditar | null;
  categorias: { id: string; nombre: string }[];
  listas: { id: string; nombre: string; toppings: ToppingDTO[] }[];
}

export function EditorProducto({ inicial, categorias, listas }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? categorias[0]?.id ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [imagen, setImagen] = useState<ImagenDTO | null>(inicial?.imagen ?? null);
  const [visible, setVisible] = useState(inicial?.visible ?? true);
  const [agotado, setAgotado] = useState(inicial?.agotado ?? false);
  const [nota, setNota] = useState(inicial?.nota ?? "");
  const [listaId, setListaId] = useState<string>(inicial?.listaToppingsId ?? "");
  const [adicional, setAdicional] = useState(formatoEntrada(inicial?.precioToppingAdicional));
  const [maximo, setMaximo] = useState(formatoEntrada(inicial?.maxToppings));
  const [niveles, setNiveles] = useState<NivelForm[]>(
    inicial?.niveles.map((n, i) => ({
      clave: `n${i}`,
      nombre: n.nombre,
      detalle: n.detalle,
      precio: String(n.precio),
      toppingsIncluidos: String(n.toppingsIncluidos),
    })) ?? [{ clave: "n0", nombre: "Precio", detalle: "", precio: "", toppingsIncluidos: "0" }],
  );
  const [grupos, setGrupos] = useState<GrupoForm[]>(
    inicial?.grupos.map((g, i) => ({
      clave: `g${i}`,
      id: g.id,
      titulo: g.titulo,
      etiqueta: g.etiqueta,
      opciones: g.opciones.map((o, k) => ({
        clave: `g${i}o${k}`,
        id: o.id,
        nombre: o.nombre,
        precioExtra: o.precioExtra ? String(o.precioExtra) : "",
        imagen: o.imagen,
        disponible: o.disponible,
      })),
    })) ?? [],
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const lista = listas.find((l) => l.id === listaId);

  // Vista previa: el producto tal como quedaría, cotizado con 0, 1, 2… toppings.
  const previa: ProductoDTO = {
    id: "previa",
    categoriaId,
    nombre: nombre || "Producto",
    descripcion: null,
    imagen: null,
    agotado: false,
    nota: null,
    niveles: niveles
      .map((n, i) => ({ id: `n${i}`, nombre: n.nombre || "Precio", detalle: null, precio: aPesos(n.precio) ?? 0, toppingsIncluidos: lista ? Number(n.toppingsIncluidos) || 0 : 0 }))
      .filter((n) => n.precio > 0),
    grupos: [],
    toppings: lista?.toppings ?? [],
    precioToppingAdicional: lista ? aPesos(adicional) : null,
    maxToppings: lista && maximo !== "" ? Number(maximo) : null,
  };
  const ejemplos = lista && previa.niveles.length
    ? Array.from({ length: Math.min(previa.maxToppings ?? 4, 4) + 1 }, (_, n) => {
        const c = cotizar(previa, { opciones: {}, toppings: Array.from({ length: n }, (_, i) => `t${i}`) });
        return { n, texto: c ? `${pesos(c.precio)} · ${tituloLinea(previa, c)}${c.adicionales ? ` + ${c.adicionales} adicional${c.adicionales > 1 ? "es" : ""}` : ""}` : "no disponible" };
      })
    : [];

  async function guardar() {
    setGuardando(true);
    setError(null);
    const resultado = await guardarProducto({
      id: inicial?.id,
      categoriaId,
      nombre,
      descripcion,
      imagenId: imagen?.id ?? null,
      visible,
      agotado,
      nota,
      listaToppingsId: listaId || null,
      precioToppingAdicional: listaId ? aPesos(adicional) : null,
      maxToppings: listaId && maximo !== "" ? Number(maximo) : null,
      niveles: niveles.map((n) => ({
        nombre: n.nombre,
        detalle: n.detalle,
        precio: aPesos(n.precio) ?? -1,
        toppingsIncluidos: listaId ? Number(n.toppingsIncluidos) || 0 : 0,
      })),
      grupos: grupos.map((g) => ({
        id: g.id,
        titulo: g.titulo,
        etiqueta: g.etiqueta,
        opciones: g.opciones.map((o) => ({
          id: o.id,
          nombre: o.nombre,
          precioExtra: aPesos(o.precioExtra) ?? 0,
          imagenId: o.imagen?.id ?? null,
          disponible: o.disponible,
        })),
      })),
    });
    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.error);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push("/admin/carta");
    router.refresh();
  }

  const cambiarNivel = (i: number, cambios: Partial<NivelForm>) => setNiveles((ns) => ns.map((n, j) => (j === i ? { ...n, ...cambios } : n)));
  const cambiarGrupo = (i: number, cambios: Partial<GrupoForm>) => setGrupos((gs) => gs.map((g, j) => (j === i ? { ...g, ...cambios } : g)));
  const cambiarOpcion = (gi: number, oi: number, cambios: Partial<OpcionForm>) =>
    setGrupos((gs) => gs.map((g, j) => (j === gi ? { ...g, opciones: g.opciones.map((o, k) => (k === oi ? { ...o, ...cambios } : o)) } : g)));

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <div className="panel-cabecera mb-0">
        <h1 className="panel-titulo">{inicial ? `Editar: ${inicial.nombre}` : "Nuevo producto"}</h1>
      </div>
      {error ? (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="caja formulario" aria-labelledby="titulo-basico">
        <h2 id="titulo-basico" className="panel-subtitulo">
          Producto
        </h2>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="p-nombre">Nombre</label>
            <input id="p-nombre" type="text" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="p-categoria">Categoría</label>
            <select id="p-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="p-descripcion">
            Descripción <span className="campo-opcional">(qué trae)</span>
          </label>
          <textarea id="p-descripcion" rows={2} maxLength={300} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <div className="campo">
          <span className="text-sm font-semibold">Foto</span>
          <SubirFoto imagen={imagen} onCambiar={setImagen} nombre={nombre} />
        </div>
        <div className="flex flex-wrap gap-x-6">
          <label className="interruptor">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            Aparece en la carta
          </label>
          <label className="interruptor">
            <input type="checkbox" checked={agotado} onChange={(e) => setAgotado(e.target.checked)} />
            Agotado (se ve, pero no se puede pedir)
          </label>
        </div>
        <div className="campo">
          <label htmlFor="p-nota">
            Nota pequeña <span className="campo-opcional">(opcional, p. ej. aviso legal)</span>
          </label>
          <input id="p-nota" type="text" maxLength={200} value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
      </section>

      <section className="caja formulario" aria-labelledby="titulo-precios">
        <div>
          <h2 id="titulo-precios" className="panel-subtitulo">
            Precios
          </h2>
          <p className="panel-texto-suave mt-1">
            Uno o varios (p. ej. «Sencilla» y «Con 2 toppings»). Si el producto lleva toppings, indica cuántos incluye cada precio: el sistema
            cobra siempre la combinación más económica para el cliente.
          </p>
        </div>
        {niveles.map((nivel, i) => (
          <div key={nivel.clave} className="fila">
            <div className="campo fila-principal">
              <label htmlFor={`n-nombre-${nivel.clave}`}>Nombre del precio</label>
              <input id={`n-nombre-${nivel.clave}`} type="text" maxLength={40} value={nivel.nombre} onChange={(e) => cambiarNivel(i, { nombre: e.target.value })} />
            </div>
            <div className="campo fila-principal">
              <label htmlFor={`n-detalle-${nivel.clave}`}>
                Qué incluye <span className="campo-opcional">(opcional)</span>
              </label>
              <input id={`n-detalle-${nivel.clave}`} type="text" maxLength={120} value={nivel.detalle} onChange={(e) => cambiarNivel(i, { detalle: e.target.value })} />
            </div>
            <div className="campo w-32">
              <label htmlFor={`n-precio-${nivel.clave}`}>Precio ($)</label>
              <input
                id={`n-precio-${nivel.clave}`}
                type="text"
                inputMode="numeric"
                value={nivel.precio}
                onChange={(e) => cambiarNivel(i, { precio: e.target.value })}
                placeholder="16900"
              />
            </div>
            {lista ? (
              <div className="campo w-32">
                <label htmlFor={`n-incl-${nivel.clave}`}>Toppings incluidos</label>
                <input
                  id={`n-incl-${nivel.clave}`}
                  type="number"
                  min={0}
                  max={20}
                  value={nivel.toppingsIncluidos}
                  onChange={(e) => cambiarNivel(i, { toppingsIncluidos: e.target.value })}
                />
              </div>
            ) : null}
            <div className="flex gap-1 self-end">
              <button type="button" className="boton-panel boton-panel-mini" aria-label="Subir precio" disabled={i === 0} onClick={() => setNiveles((ns) => mover(ns, i, -1))}>
                <IconoArriba className="size-4" />
              </button>
              <button
                type="button"
                className="boton-panel boton-panel-mini"
                aria-label="Bajar precio"
                disabled={i === niveles.length - 1}
                onClick={() => setNiveles((ns) => mover(ns, i, 1))}
              >
                <IconoAbajo className="size-4" />
              </button>
              <button
                type="button"
                className="boton-panel boton-panel-mini boton-panel-peligro"
                aria-label={`Quitar el precio ${nivel.nombre}`}
                disabled={niveles.length === 1}
                onClick={() => setNiveles((ns) => ns.filter((_, j) => j !== i))}
              >
                <IconoPapelera className="size-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="boton-panel justify-self-start"
          onClick={() => setNiveles((ns) => [...ns, { clave: nuevaClave(), nombre: "", detalle: "", precio: "", toppingsIncluidos: "0" }])}
        >
          <IconoMas className="size-4" /> Agregar precio
        </button>
      </section>

      <section className="caja formulario" aria-labelledby="titulo-toppings">
        <h2 id="titulo-toppings" className="panel-subtitulo">
          Toppings
        </h2>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="p-lista">Lista de toppings</label>
            <select id="p-lista" value={listaId} onChange={(e) => setListaId(e.target.value)}>
              <option value="">No lleva toppings</option>
              {listas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
          {lista ? (
            <>
              <div className="campo">
                <label htmlFor="p-adicional">
                  Topping adicional ($) <span className="campo-opcional">(vacío: no se venden extra)</span>
                </label>
                <input id="p-adicional" type="text" inputMode="numeric" value={adicional} onChange={(e) => setAdicional(e.target.value)} placeholder="3900" />
              </div>
              <div className="campo">
                <label htmlFor="p-maximo">
                  Máximo de toppings <span className="campo-opcional">(vacío: sin tope)</span>
                </label>
                <input id="p-maximo" type="number" min={0} max={30} value={maximo} onChange={(e) => setMaximo(e.target.value)} />
              </div>
            </>
          ) : null}
        </div>
        {lista ? (
          <p className="panel-texto-suave">
            {lista.toppings.length} {plural(lista.toppings.length, "topping", "toppings")}: {lista.toppings.map((t) => t.nombre).join(", ")}.{" "}
            <Link href="/admin/carta/toppings" className="underline">
              Editar listas
            </Link>
          </p>
        ) : null}
        {ejemplos.length ? (
          <div className="rounded-xl border border-oro-500/25 p-3">
            <p className="mb-1 text-sm font-semibold text-oro-300">Así se cobrará</p>
            <ul className="grid gap-0.5 text-sm">
              {ejemplos.map((e) => (
                <li key={e.n}>
                  Con {e.n} {plural(e.n, "topping", "toppings")}: {e.texto}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="caja formulario" aria-labelledby="titulo-elecciones">
        <div>
          <h2 id="titulo-elecciones" className="panel-subtitulo">
            Elecciones
          </h2>
          <p className="panel-texto-suave mt-1">
            Algo que el cliente debe escoger, una sola opción (p. ej. «Elige tu carne: Res o Pollo»). Puedes cobrar un recargo por opción.
          </p>
        </div>
        {grupos.map((grupo, gi) => (
          <div key={grupo.clave} className="grid gap-3 rounded-xl border border-oro-500/25 p-3">
            <div className="fila-campos">
              <div className="campo">
                <label htmlFor={`g-titulo-${grupo.clave}`}>Lo que ve el cliente</label>
                <input
                  id={`g-titulo-${grupo.clave}`}
                  type="text"
                  maxLength={60}
                  value={grupo.titulo}
                  onChange={(e) => cambiarGrupo(gi, { titulo: e.target.value })}
                  placeholder="Elige tu carne"
                />
              </div>
              <div className="campo">
                <label htmlFor={`g-etiqueta-${grupo.clave}`}>
                  En el recibo <span className="campo-opcional">(p. ej. «Carne» → «Carne: Res»)</span>
                </label>
                <input id={`g-etiqueta-${grupo.clave}`} type="text" maxLength={30} value={grupo.etiqueta} onChange={(e) => cambiarGrupo(gi, { etiqueta: e.target.value })} />
              </div>
            </div>
            {grupo.opciones.map((opcion, oi) => (
              <div key={opcion.clave} className="fila">
                <SubirFoto pequena imagen={opcion.imagen} nombre={opcion.nombre} onCambiar={(img) => cambiarOpcion(gi, oi, { imagen: img })} />
                <div className="campo fila-principal">
                  <label htmlFor={`o-nombre-${opcion.clave}`}>Opción</label>
                  <input id={`o-nombre-${opcion.clave}`} type="text" maxLength={40} value={opcion.nombre} onChange={(e) => cambiarOpcion(gi, oi, { nombre: e.target.value })} />
                </div>
                <div className="campo w-32">
                  <label htmlFor={`o-extra-${opcion.clave}`}>Recargo ($)</label>
                  <input
                    id={`o-extra-${opcion.clave}`}
                    type="text"
                    inputMode="numeric"
                    value={opcion.precioExtra}
                    onChange={(e) => cambiarOpcion(gi, oi, { precioExtra: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <label className="interruptor self-end">
                  <input type="checkbox" checked={opcion.disponible} onChange={(e) => cambiarOpcion(gi, oi, { disponible: e.target.checked })} />
                  Disponible
                </label>
                <button
                  type="button"
                  className="boton-panel boton-panel-mini boton-panel-peligro self-end"
                  aria-label={`Quitar la opción ${opcion.nombre}`}
                  onClick={() => cambiarGrupo(gi, { opciones: grupo.opciones.filter((_, k) => k !== oi) })}
                >
                  <IconoPapelera className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="boton-panel"
                onClick={() =>
                  cambiarGrupo(gi, { opciones: [...grupo.opciones, { clave: nuevaClave(), nombre: "", precioExtra: "", imagen: null, disponible: true }] })
                }
              >
                <IconoMas className="size-4" /> Agregar opción
              </button>
              <button type="button" className="boton-panel boton-panel-peligro" onClick={() => setGrupos((gs) => gs.filter((_, j) => j !== gi))}>
                Quitar esta elección
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="boton-panel justify-self-start"
          onClick={() =>
            setGrupos((gs) => [
              ...gs,
              {
                clave: nuevaClave(),
                titulo: "",
                etiqueta: "",
                opciones: [
                  { clave: nuevaClave(), nombre: "", precioExtra: "", imagen: null, disponible: true },
                  { clave: nuevaClave(), nombre: "", precioExtra: "", imagen: null, disponible: true },
                ],
              },
            ])
          }
        >
          <IconoMas className="size-4" /> Agregar elección
        </button>
      </section>

      <div className="sticky bottom-(--alto-menu-movil) z-20 -mx-1 flex flex-wrap items-center gap-2 border-t border-oro-500/25 bg-carbon-950 px-1 py-3 shadow-[0_-14px_28px_rgb(0_0_0/0.5)]">
        <button type="submit" className="boton-panel boton-panel-principal" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar producto"}
        </button>
        <Link href="/admin/carta" className="boton-panel">
          Cancelar
        </Link>
        {inicial ? (
          <button type="button" className="boton-panel boton-panel-peligro ml-auto" onClick={() => setEliminando(true)} title="Eliminar producto">
            <IconoPapelera className="size-4" /> <span className="max-sm:sr-only">Eliminar</span>
          </button>
        ) : null}
      </div>

      <DialogoConfirmar
        abierto={eliminando}
        titulo={`¿Eliminar «${inicial?.nombre ?? ""}»?`}
        mensaje="Sale de la carta para siempre. Los pedidos y ventas pasados se conservan. Si solo se acabó por hoy, mejor márcalo «Agotado»."
        textoConfirmar="Eliminar producto"
        peligroso
        onCerrar={() => setEliminando(false)}
        onConfirmar={async () => {
          if (!inicial) return null;
          const resultado = await eliminarProducto(inicial.id);
          if (!resultado.ok) return resultado.error;
          router.push("/admin/carta");
          router.refresh();
          return null;
        }}
      />
    </form>
  );
}
