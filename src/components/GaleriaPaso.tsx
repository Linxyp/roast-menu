import type { CSSProperties } from "react";
import type { Paso } from "@/data/tipos";
import { Foto } from "./Foto";

/**
 * «1 · Elige tu carne», «2 · Elige tus toppings»: fotos con su nombre, como en el afiche. Solo se miran.
 * Sin número cuando el producto tiene un solo paso (las salchipapas en el afiche).
 */
export function GaleriaPaso({ paso, numero, id }: { paso: Paso; numero?: number; id: string }) {
  const unaSola = paso.eleccion === "una";
  // En pantallas grandes, filas completas: 10 toppings en 5 columnas, 8 en 4.
  const columnas = unaSola ? paso.opciones.length : paso.opciones.length % 5 === 0 ? 5 : 4;
  return (
    <div className="paso">
      <h3 id={id} className="paso-titulo">
        {numero ? (
          <span className="paso-numero" aria-hidden="true">
            {numero}
          </span>
        ) : null}
        {paso.titulo}
      </h3>
      {paso.ayuda ? <p className="paso-ayuda">{paso.ayuda}</p> : null}
      <ul
        className={unaSola ? "opciones opciones-una" : "opciones"}
        style={{ "--columnas": columnas } as CSSProperties}
      >
        {paso.opciones.map((opcion) => (
          <li key={opcion.id} className="opcion">
            <span className="opcion-foto">
              <Foto id={opcion.imagen} alt="" sizes={unaSola ? "(min-width: 768px) 260px, 45vw" : "(min-width: 768px) 200px, 31vw"} />
            </span>
            <span className="opcion-nombre">{opcion.nombre}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
