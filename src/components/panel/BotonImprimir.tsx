"use client";

export function BotonImprimir({ texto = "Imprimir" }: { texto?: string }) {
  return (
    <button type="button" className="boton-primario justify-center" onClick={() => window.print()}>
      {texto}
    </button>
  );
}
