"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cambiarDisponibleTopping,
  eliminarLista,
  eliminarTopping,
  guardarLista,
  guardarTopping,
  moverTopping,
} from "@/app/admin/acciones";
import type { ImagenDTO, ToppingDTO } from "@/lib/carta";
import { IconoAbajo, IconoArriba, IconoMas, IconoPapelera } from "../../Iconos";
import { InterruptorServidor } from "../InterruptorServidor";
import { SubirFoto } from "./SubirFoto";

interface Lista {
  id: string;
  nombre: string;
  productos: string[];
  toppings: ToppingDTO[];
}

export function EditorToppings({ listas }: { listas: Lista[] }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [nuevaLista, setNuevaLista] = useState("");

  async function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>, exito?: string) {
    const r = await tarea();
    setMensaje(r.ok ? (exito ? { ok: true, texto: exito } : null) : { ok: false, texto: r.error ?? "No se pudo." });
    router.refresh();
    return r.ok;
  }

  return (
    <div className="grid gap-6">
      <div className="panel-cabecera mb-0">
        <div>
          <h1 className="panel-titulo">Toppings</h1>
          <p className="panel-texto-suave mt-1">
            Cada lista se comparte entre productos: marcar un topping como agotado lo quita de todos los que usan esa lista.
          </p>
        </div>
      </div>
      {mensaje ? (
        <p className={mensaje.ok ? "mensaje-exito" : "mensaje-error"} role={mensaje.ok ? "status" : "alert"}>
          {mensaje.texto}
        </p>
      ) : null}

      {listas.map((lista) => (
        <section key={lista.id} className="caja grid gap-4" aria-labelledby={`lista-${lista.id}`}>
          <NombreLista lista={lista} onGuardar={(nombre) => ejecutar(() => guardarLista({ id: lista.id, nombre }), "Lista renombrada.")} />
          <p className="panel-texto-suave">
            {lista.productos.length ? `La usan: ${lista.productos.join(", ")}.` : "Ningún producto usa esta lista todavía."}
          </p>
          <div className="lista-filas">
            {lista.toppings.map((topping, i) => (
              <FilaTopping
                key={`${topping.id}-${topping.nombre}-${topping.imagen?.id ?? ""}`}
                topping={topping}
                primero={i === 0}
                ultimo={i === lista.toppings.length - 1}
                onGuardar={(nombre, imagen) =>
                  ejecutar(() => guardarTopping({ id: topping.id, listaId: lista.id, nombre, imagenId: imagen?.id ?? null, disponible: topping.disponible }))
                }
                onDisponible={(disponible) => ejecutar(() => cambiarDisponibleTopping(topping.id, disponible))}
                onMover={(d) => ejecutar(() => moverTopping(topping.id, d))}
                onEliminar={() => ejecutar(() => eliminarTopping(topping.id))}
              />
            ))}
          </div>
          <NuevoTopping listaId={lista.id} onAgregar={(nombre, imagen) => ejecutar(() => guardarTopping({ listaId: lista.id, nombre, imagenId: imagen?.id ?? null }), "Topping agregado.")} />
          {lista.productos.length === 0 ? (
            <button type="button" className="boton-panel boton-panel-peligro justify-self-start" onClick={() => void ejecutar(() => eliminarLista(lista.id), "Lista eliminada.")}>
              <IconoPapelera className="size-4" /> Eliminar lista
            </button>
          ) : null}
        </section>
      ))}

      <form
        className="caja flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await ejecutar(() => guardarLista({ nombre: nuevaLista }), "Lista creada.")) setNuevaLista("");
        }}
      >
        <div className="campo fila-principal">
          <label htmlFor="nueva-lista">Nueva lista de toppings</label>
          <input id="nueva-lista" type="text" maxLength={60} value={nuevaLista} onChange={(e) => setNuevaLista(e.target.value)} placeholder="Toppings de perros" required />
        </div>
        <button type="submit" className="boton-panel boton-panel-principal">
          <IconoMas className="size-4" /> Crear lista
        </button>
      </form>
    </div>
  );
}

function NombreLista({ lista, onGuardar }: { lista: Lista; onGuardar: (nombre: string) => Promise<boolean> }) {
  const [nombre, setNombre] = useState(lista.nombre);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onGuardar(nombre);
      }}
    >
      <div className="campo fila-principal">
        <label htmlFor={`lista-${lista.id}`} className="panel-subtitulo">
          Lista
        </label>
        <input id={`lista-${lista.id}`} type="text" maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      {nombre !== lista.nombre ? (
        <button type="submit" className="boton-panel boton-panel-principal">
          Guardar nombre
        </button>
      ) : null}
    </form>
  );
}

function FilaTopping({
  topping,
  primero,
  ultimo,
  onGuardar,
  onDisponible,
  onMover,
  onEliminar,
}: {
  topping: ToppingDTO;
  primero: boolean;
  ultimo: boolean;
  onGuardar: (nombre: string, imagen: ImagenDTO | null) => Promise<boolean>;
  onDisponible: (disponible: boolean) => Promise<boolean>;
  onMover: (direccion: -1 | 1) => Promise<boolean>;
  onEliminar: () => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState(topping.nombre);
  return (
    <div className="fila">
      <SubirFoto pequena imagen={topping.imagen} nombre={topping.nombre} onCambiar={(imagen) => void onGuardar(nombre, imagen)} />
      <div className="campo fila-principal">
        <label htmlFor={`t-${topping.id}`} className="sr-only">
          Nombre del topping
        </label>
        <input id={`t-${topping.id}`} type="text" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      {nombre !== topping.nombre ? (
        <button type="button" className="boton-panel boton-panel-principal" onClick={() => void onGuardar(nombre, topping.imagen)}>
          Guardar
        </button>
      ) : null}
      <InterruptorServidor activo={!topping.disponible} onCambiar={(agotado) => onDisponible(!agotado)}>
        Agotado
      </InterruptorServidor>
      <div className="flex gap-1">
        <button type="button" className="boton-panel boton-panel-mini" disabled={primero} aria-label={`Subir ${topping.nombre}`} onClick={() => void onMover(-1)}>
          <IconoArriba className="size-4" />
        </button>
        <button type="button" className="boton-panel boton-panel-mini" disabled={ultimo} aria-label={`Bajar ${topping.nombre}`} onClick={() => void onMover(1)}>
          <IconoAbajo className="size-4" />
        </button>
        <button type="button" className="boton-panel boton-panel-mini boton-panel-peligro" aria-label={`Eliminar ${topping.nombre}`} onClick={() => void onEliminar()}>
          <IconoPapelera className="size-4" />
        </button>
      </div>
    </div>
  );
}

function NuevoTopping({ listaId, onAgregar }: { listaId: string; onAgregar: (nombre: string, imagen: ImagenDTO | null) => Promise<boolean> }) {
  const [nombre, setNombre] = useState("");
  const [imagen, setImagen] = useState<ImagenDTO | null>(null);
  return (
    <form
      className="fila"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onAgregar(nombre, imagen)) {
          setNombre("");
          setImagen(null);
        }
      }}
    >
      <SubirFoto pequena imagen={imagen} nombre={nombre} onCambiar={setImagen} />
      <div className="campo fila-principal">
        <label htmlFor={`nuevo-topping-${listaId}`} className="sr-only">
          Nuevo topping
        </label>
        <input id={`nuevo-topping-${listaId}`} type="text" maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nuevo topping" required />
      </div>
      <button type="submit" className="boton-panel">
        <IconoMas className="size-4" /> Agregar
      </button>
    </form>
  );
}
