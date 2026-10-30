import type { ProductoDTO } from "@/lib/carta";
import { Precio } from "./Precio";

/** Los precios del producto fila por fila: presentación, qué incluye y valor (más el topping adicional). */
export function TablaPrecios({ producto, compacta = false }: { producto: ProductoDTO; compacta?: boolean }) {
  const filas = producto.niveles.map((n) => ({ clave: n.id, nombre: n.nombre, detalle: n.detalle, precio: n.precio }));
  if (producto.toppings.length > 0 && producto.precioToppingAdicional != null) {
    filas.push({ clave: "adicional", nombre: "Topping adicional", detalle: "Cada topping extra", precio: producto.precioToppingAdicional });
  }
  return (
    <dl className={`tabla-precios ${compacta ? "tabla-precios-compacta" : ""}`}>
      {filas.map((fila) => (
        <div key={fila.clave} className="tabla-precios-fila">
          <dt>
            <span className="tabla-precios-nombre">{fila.nombre}</span>
            {fila.detalle ? <span className="tabla-precios-detalle">{fila.detalle}</span> : null}
          </dt>
          <dd>
            <Precio valor={fila.precio} tamano={compacta ? "pequeno" : "normal"} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
