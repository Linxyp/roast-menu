import type { ImagenDTO } from "@/lib/carta";
import { Foto } from "../carta/Foto";
import { IconoCheck } from "../Iconos";

interface Props {
  tipo: "radio" | "checkbox";
  nombreGrupo: string;
  valor: string;
  nombre: string;
  imagen: ImagenDTO | null;
  marcada: boolean;
  bloqueada?: boolean;
  /** Etiqueta sobre la foto: «Incluido», «+$3.900», «Agotado»… */
  etiqueta?: string;
  etiquetaDestacada?: boolean;
  onCambiar: () => void;
}

/**
 * Opción con foto para elegir carne o toppings: un input nativo (radio o checkbox) dentro de
 * su label, así funciona con teclado, lector de pantalla y toque sin código extra.
 */
export function OpcionFoto({
  tipo,
  nombreGrupo,
  valor,
  nombre,
  imagen,
  marcada,
  bloqueada = false,
  etiqueta,
  etiquetaDestacada = false,
  onCambiar,
}: Props) {
  return (
    <label className={`opcion ${bloqueada ? "opcion-bloqueada" : ""} ${imagen ? "" : "opcion-sin-foto"}`}>
      <input
        type={tipo}
        name={nombreGrupo}
        value={valor}
        checked={marcada}
        disabled={bloqueada}
        onChange={onCambiar}
        className="sr-only"
      />
      {imagen ? (
        <span className="opcion-foto">
          <Foto imagen={imagen} alt="" sizes="160px" />
        </span>
      ) : null}
      <span className="opcion-nombre">{nombre}</span>
      {etiqueta ? <span className={`opcion-etiqueta ${etiquetaDestacada ? "opcion-etiqueta-destacada" : ""}`}>{etiqueta}</span> : null}
      <span className="opcion-marca" aria-hidden="true">
        <IconoCheck className="size-3.5" />
      </span>
    </label>
  );
}
