"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  categorias: { id: string; nombre: string }[];
}

/** Barra fija de categorías: lleva a cada sección y marca en cuál va el cliente. */
export function NavCategorias({ categorias }: Props) {
  const [activa, setActiva] = useState(categorias[0]?.id);
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const secciones = categorias
      .map((categoria) => document.getElementById(categoria.id))
      .filter((seccion): seccion is HTMLElement => seccion !== null);
    // Activa la sección que cruza una franja delgada cerca del centro de la pantalla.
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) if (entrada.isIntersecting) setActiva(entrada.target.id);
      },
      { rootMargin: "-38% 0px -58% 0px" },
    );
    secciones.forEach((seccion) => observador.observe(seccion));
    return () => observador.disconnect();
  }, [categorias]);

  useEffect(() => {
    const contenedor = lista.current;
    const enlace = contenedor?.querySelector<HTMLElement>(`[data-categoria="${activa}"]`);
    if (!contenedor || !enlace) return;
    const izquierda = enlace.offsetLeft - (contenedor.clientWidth - enlace.offsetWidth) / 2;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    contenedor.scrollTo({ left: izquierda, behavior: suave ? "smooth" : "auto" });
  }, [activa]);

  return (
    <nav aria-label="Categorías del menú" className="nav-categorias">
      <ul ref={lista} className="nav-categorias-lista">
        {categorias.map((categoria) => (
          <li key={categoria.id}>
            <a
              href={`#${categoria.id}`}
              data-categoria={categoria.id}
              aria-current={activa === categoria.id ? "true" : undefined}
              className="nav-categoria"
              onClick={() => setActiva(categoria.id)}
            >
              {categoria.nombre}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
