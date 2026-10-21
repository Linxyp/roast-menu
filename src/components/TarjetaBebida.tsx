import type { ProductoSimple } from "@/data/tipos";
import { Foto } from "./Foto";
import { Precio } from "./Precio";

export function TarjetaBebida({ producto }: { producto: ProductoSimple }) {
  return (
    <article className="bebida" aria-labelledby={`bebida-${producto.id}`}>
      <div className="bebida-foto">
        <Foto id={producto.imagen} alt="" sizes="150px" />
      </div>
      <h3 id={`bebida-${producto.id}`} className="bebida-nombre">
        {producto.nombre}
      </h3>
      <Precio valor={producto.precio} />
    </article>
  );
}
