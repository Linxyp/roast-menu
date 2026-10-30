"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { actualizarUsuario, crearUsuario, restablecerClave } from "@/app/admin/acciones";
import { IconoMas } from "../../Iconos";
import { InterruptorServidor } from "../InterruptorServidor";

type Rol = "ADMIN" | "PERSONAL";

interface Usuario {
  id: string;
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

const NOMBRE_ROL: Record<Rol, string> = { ADMIN: "Administrador", PERSONAL: "Personal" };

export function Usuarios({ usuarios, yoId }: { usuarios: Usuario[]; yoId: string }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState({ usuario: "", nombre: "", rol: "PERSONAL" as Rol, clave: "" });
  const [claveDe, setClaveDe] = useState<string | null>(null);
  const [claveNueva, setClaveNueva] = useState("");

  async function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string; mensaje?: string }>) {
    const r = await tarea();
    setMensaje(r.ok ? (r.mensaje ? { ok: true, texto: r.mensaje } : null) : { ok: false, texto: r.error ?? "No se pudo." });
    router.refresh();
    return r.ok;
  }

  return (
    <section className="caja grid gap-4" aria-labelledby="t-usuarios">
      <div>
        <h2 id="t-usuarios" className="panel-subtitulo">
          Usuarios del panel
        </h2>
        <p className="panel-texto-suave mt-1">«Personal» ve pedidos, mesas y ventas y cobra; no edita la carta ni los ajustes.</p>
      </div>
      {mensaje ? (
        <p className={mensaje.ok ? "mensaje-exito" : "mensaje-error"} role={mensaje.ok ? "status" : "alert"}>
          {mensaje.texto}
        </p>
      ) : null}
      <div className="lista-filas">
        {usuarios.map((u) => (
          <div key={u.id} className="fila">
            <div className="fila-principal">
              <p className="fila-nombre">
                {u.nombre} {u.id === yoId ? <span className="etiqueta etiqueta-neutra">Tú</span> : null}
              </p>
              <p className="fila-detalle">Usuario: {u.usuario}</p>
            </div>
            <div className="campo">
              <label htmlFor={`rol-${u.id}`} className="sr-only">
                Rol de {u.nombre}
              </label>
              <select id={`rol-${u.id}`} value={u.rol} onChange={(e) => void ejecutar(() => actualizarUsuario(u.id, { rol: e.target.value as Rol }))}>
                {(Object.keys(NOMBRE_ROL) as Rol[]).map((rol) => (
                  <option key={rol} value={rol}>
                    {NOMBRE_ROL[rol]}
                  </option>
                ))}
              </select>
            </div>
            <InterruptorServidor activo={u.activo} disabled={u.id === yoId} onCambiar={(activo) => ejecutar(() => actualizarUsuario(u.id, { activo }))}>
              Activo
            </InterruptorServidor>
            {claveDe === u.id ? (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await ejecutar(() => restablecerClave(u.id, claveNueva))) {
                    setClaveDe(null);
                    setClaveNueva("");
                  }
                }}
              >
                <div className="campo">
                  <label htmlFor={`clave-${u.id}`} className="sr-only">
                    Contraseña nueva para {u.nombre}
                  </label>
                  <input id={`clave-${u.id}`} type="text" autoComplete="new-password" value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} placeholder="Contraseña nueva" required />
                </div>
                <button type="submit" className="boton-panel boton-panel-principal">
                  Guardar
                </button>
                <button type="button" className="boton-panel" onClick={() => setClaveDe(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <button type="button" className="boton-panel" onClick={() => setClaveDe(u.id)}>
                Cambiar contraseña
              </button>
            )}
          </div>
        ))}
      </div>
      <form
        className="grid gap-3 rounded-xl border border-oro-500/25 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await ejecutar(() => crearUsuario(nuevo))) setNuevo({ usuario: "", nombre: "", rol: "PERSONAL", clave: "" });
        }}
      >
        <p className="font-semibold">Nuevo usuario</p>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="n-nombre">Nombre</label>
            <input id="n-nombre" type="text" maxLength={60} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
          </div>
          <div className="campo">
            <label htmlFor="n-usuario">Usuario para ingresar</label>
            <input
              id="n-usuario"
              type="text"
              autoCapitalize="none"
              maxLength={30}
              value={nuevo.usuario}
              onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })}
              placeholder="caja"
              required
            />
          </div>
          <div className="campo">
            <label htmlFor="n-rol">Rol</label>
            <select id="n-rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Rol })}>
              {(Object.keys(NOMBRE_ROL) as Rol[]).map((rol) => (
                <option key={rol} value={rol}>
                  {NOMBRE_ROL[rol]}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="n-clave">Contraseña</label>
            <input id="n-clave" type="text" autoComplete="new-password" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} required />
          </div>
        </div>
        <button type="submit" className="boton-panel boton-panel-principal justify-self-start">
          <IconoMas className="size-4" /> Crear usuario
        </button>
      </form>
    </section>
  );
}
