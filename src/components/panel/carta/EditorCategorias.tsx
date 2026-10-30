"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { eliminarCategoria, guardarCategoria, moverCategoria } from "@/app/admin/acciones";
import { IconoAbajo, IconoArriba, IconoMas, IconoPapelera } from "../../Iconos";

interface CategoriaForm {
  id?: string;
  nombre: string;
  tituloPrincipal: string;
  tituloPincel: string;
  pincelPrimero: boolean;
  lema: string;
  visible: boolean;
  productos: number;
}

const VACIA: CategoriaForm = { nombre: "", tituloPrincipal: "", tituloPincel: "", pincelPrimero: false, lema: "", visible: true, productos: 0 };

export function EditorCategorias({ categorias }: { categorias: CategoriaForm[] }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [nueva, setNueva] = useState(false);

  async function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string; mensaje?: string }>) {
    const r = await tarea();
    setMensaje(r.ok ? (r.mensaje ? { ok: true, texto: r.mensaje } : null) : { ok: false, texto: r.error ?? "No se pudo." });
    router.refresh();
    return r.ok;
  }

  return (
    <div className="grid gap-5">
      <div className="panel-cabecera mb-0">
        <div>
          <h1 className="panel-titulo">Categorías</h1>
          <p className="panel-texto-suave mt-1">El orden de aquí es el orden de la carta y de la barra de categorías.</p>
        </div>
        <button type="button" className="boton-panel boton-panel-principal" onClick={() => setNueva(true)}>
          <IconoMas className="size-4" /> Nueva categoría
        </button>
      </div>
      {mensaje ? (
        <p className={mensaje.ok ? "mensaje-exito" : "mensaje-error"} role={mensaje.ok ? "status" : "alert"}>
          {mensaje.texto}
        </p>
      ) : null}
      {nueva ? (
        <FormCategoria
          inicial={VACIA}
          onGuardar={async (datos) => {
            if (await ejecutar(() => guardarCategoria(datos))) setNueva(false);
          }}
          onCancelar={() => setNueva(false)}
        />
      ) : null}
      {categorias.map((categoria, i) => (
        <FormCategoria
          key={`${categoria.id}-${categoria.nombre}-${categoria.visible}-${categoria.lema}-${categoria.tituloPincel}-${categoria.tituloPrincipal}`}
          inicial={categoria}
          primera={i === 0}
          ultima={i === categorias.length - 1}
          onGuardar={(datos) => void ejecutar(() => guardarCategoria(datos))}
          onMover={(direccion) => void ejecutar(() => moverCategoria(categoria.id!, direccion))}
          onEliminar={() => void ejecutar(() => eliminarCategoria(categoria.id!))}
        />
      ))}
    </div>
  );
}

function FormCategoria({
  inicial,
  primera,
  ultima,
  onGuardar,
  onCancelar,
  onMover,
  onEliminar,
}: {
  inicial: CategoriaForm;
  primera?: boolean;
  ultima?: boolean;
  onGuardar: (datos: Omit<CategoriaForm, "productos">) => void;
  onCancelar?: () => void;
  onMover?: (direccion: -1 | 1) => void;
  onEliminar?: () => void;
}) {
  const [datos, setDatos] = useState(inicial);
  const cambio = JSON.stringify(datos) !== JSON.stringify(inicial);
  const id = inicial.id ?? "nueva";
  const fijar = (cambios: Partial<CategoriaForm>) => setDatos((d) => ({ ...d, ...cambios }));
  return (
    <form
      className="caja formulario"
      onSubmit={(e) => {
        e.preventDefault();
        const { productos, ...resto } = datos;
        void productos;
        onGuardar(resto);
      }}
    >
      <div className="fila-campos">
        <div className="campo">
          <label htmlFor={`c-nombre-${id}`}>Nombre en la barra</label>
          <input id={`c-nombre-${id}`} type="text" maxLength={40} value={datos.nombre} onChange={(e) => fijar({ nombre: e.target.value })} required />
        </div>
        <div className="campo">
          <label htmlFor={`c-principal-${id}`}>
            Título (letra recta) <span className="campo-opcional">p. ej. «Arma tu»</span>
          </label>
          <input id={`c-principal-${id}`} type="text" maxLength={40} value={datos.tituloPrincipal} onChange={(e) => fijar({ tituloPrincipal: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor={`c-pincel-${id}`}>
            Título (letra de pincel) <span className="campo-opcional">p. ej. «hamburguesa»</span>
          </label>
          <input id={`c-pincel-${id}`} type="text" maxLength={40} value={datos.tituloPincel} onChange={(e) => fijar({ tituloPincel: e.target.value })} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor={`c-lema-${id}`}>
          Frase bajo el título <span className="campo-opcional">(opcional)</span>
        </label>
        <input id={`c-lema-${id}`} type="text" maxLength={160} value={datos.lema} onChange={(e) => fijar({ lema: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="interruptor">
          <input type="checkbox" checked={datos.pincelPrimero} onChange={(e) => fijar({ pincelPrimero: e.target.checked })} />
          La parte en pincel va primero
        </label>
        <label className="interruptor">
          <input type="checkbox" checked={datos.visible} onChange={(e) => fijar({ visible: e.target.checked })} />
          Visible en la carta
        </label>
        {inicial.id ? <span className="panel-texto-suave">{inicial.productos} productos</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {cambio || !inicial.id ? (
          <button type="submit" className="boton-panel boton-panel-principal">
            Guardar
          </button>
        ) : null}
        {onCancelar ? (
          <button type="button" className="boton-panel" onClick={onCancelar}>
            Cancelar
          </button>
        ) : null}
        {onMover ? (
          <>
            <button type="button" className="boton-panel boton-panel-mini" disabled={primera} aria-label={`Subir ${inicial.nombre}`} onClick={() => onMover(-1)}>
              <IconoArriba className="size-4" />
            </button>
            <button type="button" className="boton-panel boton-panel-mini" disabled={ultima} aria-label={`Bajar ${inicial.nombre}`} onClick={() => onMover(1)}>
              <IconoAbajo className="size-4" />
            </button>
          </>
        ) : null}
        {onEliminar && inicial.productos === 0 ? (
          <button type="button" className="boton-panel boton-panel-peligro ml-auto" onClick={onEliminar}>
            <IconoPapelera className="size-4" /> Eliminar
          </button>
        ) : null}
      </div>
    </form>
  );
}
