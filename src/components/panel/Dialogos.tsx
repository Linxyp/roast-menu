"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { pesos } from "@/lib/formato";

/** Diálogo modal nativo del panel (cierra con Esc o tocando fuera). */
export function DialogoPanel({ abierto, onCerrar, titulo, children }: { abierto: boolean; onCerrar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  });
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const alCerrar = () => onCerrarRef.current();
    d.addEventListener("close", alCerrar);
    return () => d.removeEventListener("close", alCerrar);
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialogo-panel"
      aria-label={titulo}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      {abierto ? (
        <div className="dialogo-panel-cuerpo">
          <h2 className="panel-subtitulo">{titulo}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

/** Elegir con qué se pagó: un botón por método de pago configurado. */
export function DialogoCobro({
  abierto,
  titulo,
  total,
  metodos,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  total: number;
  metodos: string[];
  onConfirmar: (metodo: string) => Promise<string | null>;
  onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <DialogoPanel abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      <p className="font-display text-4xl font-bold text-mostaza">{pesos(total)}</p>
      <p className="panel-texto-suave">¿Cómo pagó?</p>
      <div className="metodos-pago">
        {metodos.map((metodo) => (
          <button
            key={metodo}
            type="button"
            className="boton-panel"
            disabled={enviando}
            onClick={async () => {
              setEnviando(true);
              setError(null);
              const problema = await onConfirmar(metodo);
              setEnviando(false);
              if (problema) setError(problema);
            }}
          >
            {metodo}
          </button>
        ))}
      </div>
      {error ? (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" className="boton-panel" onClick={onCerrar}>
        Cancelar
      </button>
    </DialogoPanel>
  );
}

export function DialogoConfirmar({
  abierto,
  titulo,
  mensaje,
  textoConfirmar,
  peligroso = false,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean;
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar: string;
  peligroso?: boolean;
  onConfirmar: () => Promise<string | null>;
  onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <DialogoPanel abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      <div className="panel-texto-suave">{mensaje}</div>
      {error ? (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="boton-panel" onClick={onCerrar}>
          Volver
        </button>
        <button
          type="button"
          className={`boton-panel ${peligroso ? "boton-panel-peligro" : "boton-panel-principal"}`}
          disabled={enviando}
          onClick={async () => {
            setEnviando(true);
            const problema = await onConfirmar();
            setEnviando(false);
            if (problema) setError(problema);
          }}
        >
          {textoConfirmar}
        </button>
      </div>
    </DialogoPanel>
  );
}
