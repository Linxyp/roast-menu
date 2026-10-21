"use client";

export function BotonImprimir() {
  return (
    <button type="button" className="boton-primario" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
