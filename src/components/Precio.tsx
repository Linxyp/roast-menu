import { pesos } from "@/lib/formato";

/** Precio en franja de pincel amarillo mostaza, como en los afiches. */
export function Precio({ valor, tamano = "normal" }: { valor: number; tamano?: "normal" | "grande" }) {
  return <span className={`precio-tag precio-${tamano}`}>{pesos(valor)}</span>;
}
