import type { FilaPrecio } from "@/data/tipos";
import { Precio } from "./Precio";

/** Los precios del afiche, fila por fila: presentación, qué incluye y valor. */
export function TablaPrecios({ filas }: { filas: FilaPrecio[] }) {
  const unica = filas.length === 1;
  return (
    <dl className={unica ? "tabla-precios tabla-precios-unica" : "tabla-precios"}>
      {filas.map((fila) => (
        <div key={fila.nombre} className="tabla-precios-fila">
          <dt>
            <span className="tabla-precios-nombre">{fila.nombre}</span>
            {fila.detalle ? <span className="tabla-precios-detalle">{fila.detalle}</span> : null}
          </dt>
          <dd>
            <Precio valor={fila.precio} tamano={unica ? "grande" : "normal"} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
