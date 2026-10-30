"use client";

import { useActionState } from "react";
import { ingresar, type EstadoIngreso } from "@/app/admin/acciones";

export function FormularioIngreso({ siguiente }: { siguiente: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoIngreso, FormData>(ingresar, {});
  return (
    <form action={enviar} className="formulario">
      <input type="hidden" name="siguiente" value={siguiente} />
      <div className="campo">
        <label htmlFor="usuario">Usuario</label>
        <input id="usuario" name="usuario" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
      </div>
      <div className="campo">
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" required />
      </div>
      {estado.error ? (
        <p className="mensaje-error" role="alert">
          {estado.error}
        </p>
      ) : null}
      <button type="submit" className="boton-primario w-full justify-center" disabled={enviando}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
