"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  abierta: boolean;
  /** Se llama cuando el cliente cierra la hoja (Esc, fondo oscuro o botón cerrar). */
  onCerrar: () => void;
  /** Id del título que nombra la hoja para lectores de pantalla. */
  etiquetaId: string;
  children: ReactNode;
  ancha?: boolean;
}

/**
 * Hoja modal sobre <dialog> nativo: atrapa el foco, cierra con Esc y deja el resto de la página
 * inerte sin librerías. En el celular sube desde abajo; en pantallas grandes queda centrada.
 */
export function Hoja({ abierta, onCerrar, etiquetaId, children, ancha = false }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const abiertaRef = useRef(abierta);
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => {
    abiertaRef.current = abierta;
    onCerrarRef.current = onCerrar;
  });

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (abierta && !elemento.open) elemento.showModal();
    if (!abierta && elemento.open) elemento.close();
  }, [abierta]);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    // «close» también se dispara al cerrarla por código: solo avisa si la cerró el cliente.
    const alCerrar = () => {
      if (abiertaRef.current) onCerrarRef.current();
    };
    elemento.addEventListener("close", alCerrar);
    return () => elemento.removeEventListener("close", alCerrar);
  }, []);

  useEffect(() => {
    if (!abierta) return;
    const raiz = document.documentElement;
    const anterior = raiz.style.overflow;
    raiz.style.overflow = "hidden";
    return () => {
      raiz.style.overflow = anterior;
    };
  }, [abierta]);

  return (
    <dialog
      ref={dialogo}
      className={`hoja ${ancha ? "hoja-ancha" : ""}`}
      aria-labelledby={etiquetaId}
      onClick={(evento) => {
        // Un clic en el fondo oscuro llega al <dialog> mismo; dentro de la hoja llega a sus hijos.
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      {abierta ? children : null}
    </dialog>
  );
}
