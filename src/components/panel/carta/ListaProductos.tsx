"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cambiarEstadoProducto, moverProducto } from "@/app/admin/acciones";
import type { ImagenDTO } from "@/lib/carta";
import { pesos } from "@/lib/formato";
import { Foto } from "../../carta/Foto";
import { IconoAbajo, IconoArriba, IconoLapiz } from "../../Iconos";
import { InterruptorServidor } from "../InterruptorServidor";

interface ProductoFila {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen: ImagenDTO | null;
  visible: boolean;
  agotado: boolean;
  desde: number;
  precios: number;
  toppings: string | null;
}

interface CategoriaFila {
  id: string;
  nombre: string;
  visible: boolean;
  productos: ProductoFila[];
}

export function ListaProductos({ categorias }: { categorias: CategoriaFila[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>) {
    const resultado = await tarea();
    setError(resultado.ok ? null : (resultado.error ?? "No se pudo guardar."));
    router.refresh();
  }

  return (
    <div className="grid gap-7">
      {error ? (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      ) : null}
      {categorias.map((categoria) => (
        <section key={categoria.id} aria-labelledby={`cat-${categoria.id}`} className="grid gap-3">
          <h2 id={`cat-${categoria.id}`} className="panel-subtitulo flex items-center gap-2">
            {categoria.nombre}
            {!categoria.visible ? <span className="etiqueta etiqueta-neutra">Oculta</span> : null}
          </h2>
          {categoria.productos.length === 0 ? <p className="tablero-vacio">Sin productos en esta categoría.</p> : null}
          <div className="lista-filas">
            {categoria.productos.map((producto, i) => (
              <div key={producto.id} className="fila">
                <div className="miniatura">
                  <Foto imagen={producto.imagen} alt="" sizes="56px" nombre={producto.nombre} />
                </div>
                <div className="fila-principal">
                  <p className="fila-nombre">
                    {producto.nombre}{" "}
                    {producto.agotado ? <span className="etiqueta etiqueta-por-cobrar">Agotado</span> : null}{" "}
                    {!producto.visible ? <span className="etiqueta etiqueta-neutra">Oculto</span> : null}
                  </p>
                  <p className="fila-detalle">
                    {producto.precios > 1 ? "Desde " : ""}
                    {pesos(producto.desde)}
                    {producto.toppings ? ` · ${producto.toppings}` : ""}
                  </p>
                </div>
                <InterruptorServidor activo={producto.agotado} onCambiar={(agotado) => ejecutar(() => cambiarEstadoProducto(producto.id, { agotado }))}>
                  Agotado
                </InterruptorServidor>
                <InterruptorServidor activo={producto.visible} onCambiar={(visible) => ejecutar(() => cambiarEstadoProducto(producto.id, { visible }))}>
                  En la carta
                </InterruptorServidor>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="boton-panel boton-panel-mini"
                    disabled={i === 0}
                    aria-label={`Subir ${producto.nombre}`}
                    onClick={() => void ejecutar(() => moverProducto(producto.id, -1))}
                  >
                    <IconoArriba className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="boton-panel boton-panel-mini"
                    disabled={i === categoria.productos.length - 1}
                    aria-label={`Bajar ${producto.nombre}`}
                    onClick={() => void ejecutar(() => moverProducto(producto.id, 1))}
                  >
                    <IconoAbajo className="size-4" />
                  </button>
                </div>
                <Link href={`/admin/carta/producto/${producto.id}`} className="boton-panel">
                  <IconoLapiz className="size-4" /> Editar<span className="sr-only"> {producto.nombre}</span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
