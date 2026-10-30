"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { reportarDiagnostico } from "@/lib/diagnostico";

interface Props {
  abierta: boolean;
  /** Se llama cuando el cliente cierra la hoja (Esc, fondo oscuro o botón cerrar). */
  onCerrar: () => void;
  /** Id del título que nombra la hoja para lectores de pantalla. */
  etiquetaId: string;
  children: ReactNode;
  ancha?: boolean;
}

/** ¿El toque cayó fuera de la caja de la hoja (en el fondo oscuro)? */
function fueraDeLaHoja(evento: { clientX: number; clientY: number; currentTarget: HTMLDialogElement }) {
  const caja = evento.currentTarget.getBoundingClientRect();
  return evento.clientX < caja.left || evento.clientX > caja.right || evento.clientY < caja.top || evento.clientY > caja.bottom;
}

/**
 * Hoja modal sobre <dialog> nativo: atrapa el foco, cierra con Esc y deja el resto de la página
 * inerte sin librerías. En el celular sube desde abajo; en pantallas grandes queda centrada.
 */
export function Hoja({ abierta, onCerrar, etiquetaId, children, ancha = false }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const abiertaRef = useRef(abierta);
  const onCerrarRef = useRef(onCerrar);
  const presionFuera = useRef(false);

  useEffect(() => {
    abiertaRef.current = abierta;
    onCerrarRef.current = onCerrar;
  });

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (abierta && !elemento.open) {
      try {
        elemento.showModal();
      } catch {
        elemento.setAttribute("open", ""); // si el navegador no la abre como modal, que al menos se vea
      }
      // Respaldo: si un navegador la dibuja aplastada (le pasaba a Safari en iPhone), se le da alto fijo
      // para que se vea igual, y se avisa al servidor.
      window.setTimeout(() => {
        if (!elemento.open || elemento.getBoundingClientRect().height >= 40) return;
        elemento.style.height = "92dvh";
        reportarDiagnostico("hoja-aplastada", `pantalla ${window.innerWidth}x${window.innerHeight}`);
      }, 400);
    }
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
      onPointerDown={(evento) => {
        presionFuera.current = evento.target === evento.currentTarget && fueraDeLaHoja(evento);
      }}
      onClick={(evento) => {
        // El fondo oscuro y la barra de desplazamiento de la hoja llegan ambos al <dialog>: solo cierra
        // un toque que empezó y terminó fuera de la hoja.
        if (presionFuera.current && evento.target === evento.currentTarget && fueraDeLaHoja(evento)) onCerrar();
        presionFuera.current = false;
      }}
    >
      {abierta ? children : null}
    </dialog>
  );
}
