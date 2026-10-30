"use client";

import { IconoFlecha, IconoMas } from "../Iconos";
import { usePedido } from "../pedido/ProveedorPedido";

/** Abre el producto: en la mesa para armarlo y agregarlo; sin mesa, para ver opciones y precios. */
export function BotonProducto({ productoId, nombre, agotado, armable }: { productoId: string; nombre: string; agotado: boolean; armable: boolean }) {
  const { abrirProducto, conMesa } = usePedido();
  if (!conMesa) {
    if (!armable) return null;
    return (
      <button type="button" className="boton-secundario w-full" aria-haspopup="dialog" data-producto={productoId} onClick={() => abrirProducto(productoId)}>
        Ver opciones<span className="sr-only"> de {nombre}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={agotado ? "boton-agotado w-full" : armable ? "boton-primario w-full" : "boton-secundario w-full"}
      aria-haspopup="dialog"
      data-producto={productoId}
      onClick={() => abrirProducto(productoId)}
    >
      {agotado ? (
        <span>
          Agotado por hoy<span className="sr-only">: {nombre}</span>
        </span>
      ) : armable ? (
        <>
          <span>
            Armar y agregar<span className="sr-only"> {nombre}</span>
          </span>
          <IconoFlecha className="size-5" />
        </>
      ) : (
        <>
          <IconoMas className="size-4" />
          <span>
            Agregar<span className="sr-only"> {nombre}</span>
          </span>
        </>
      )}
    </button>
  );
}
