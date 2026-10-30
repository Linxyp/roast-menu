"use client";

import { MAX_CANTIDAD } from "@/lib/pedido";
import { IconoMas, IconoMenos } from "../Iconos";

interface Props {
  valor: number;
  onCambiar: (valor: number) => void;
  /** Nombre del grupo para lectores de pantalla. Ej.: «Cantidad de hamburguesa». */
  etiqueta: string;
  min?: number;
  max?: number;
  compacta?: boolean;
}

/** Selector − 1 +. En el límite los botones quedan aria-disabled (no disabled) para no perder el foco. */
export function Cantidad({ valor, onCambiar, etiqueta, min = 1, max = MAX_CANTIDAD, compacta = false }: Props) {
  const baja = valor > min;
  const sube = valor < max;
  return (
    <div role="group" aria-label={etiqueta} className={`cantidad ${compacta ? "cantidad-compacta" : ""}`}>
      <button type="button" className="cantidad-boton" aria-label="Quitar uno" aria-disabled={!baja} onClick={() => baja && onCambiar(valor - 1)}>
        <IconoMenos className="size-4" />
      </button>
      <output className="cantidad-valor" aria-live="polite" aria-atomic="true">
        {valor}
      </output>
      <button type="button" className="cantidad-boton" aria-label="Agregar uno" aria-disabled={!sube} onClick={() => sube && onCambiar(valor + 1)}>
        <IconoMas className="size-4" />
      </button>
    </div>
  );
}
