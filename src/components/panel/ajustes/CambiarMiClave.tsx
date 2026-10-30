"use client";

import { useState } from "react";
import { cambiarMiClave } from "@/app/admin/acciones";

export function CambiarMiClave() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <form
      className="caja formulario"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await cambiarMiClave(actual, nueva);
        setMensaje(r.ok ? { ok: true, texto: r.mensaje ?? "Listo." } : { ok: false, texto: r.error });
        if (r.ok) {
          setActual("");
          setNueva("");
        }
      }}
    >
      <h2 className="panel-subtitulo">Mi contraseña</h2>
      <div className="fila-campos">
        <div className="campo">
          <label htmlFor="mi-actual">Contraseña actual</label>
          <input id="mi-actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="mi-nueva">Contraseña nueva</label>
          <input id="mi-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} required />
          <p className="campo-ayuda">Al menos 8 caracteres, con letras y números.</p>
        </div>
      </div>
      {mensaje ? (
        <p className={mensaje.ok ? "mensaje-exito" : "mensaje-error"} role={mensaje.ok ? "status" : "alert"}>
          {mensaje.texto}
        </p>
      ) : null}
      <button type="submit" className="boton-panel boton-panel-principal justify-self-start">
        Cambiar mi contraseña
      </button>
    </form>
  );
}
