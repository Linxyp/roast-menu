import { Fragment } from "react";

/** «Hamburguesas · Combo · …»: si no cabe, corta después de un punto, nunca dentro de un nombre. */
export function ListaConPuntos({ items }: { items: string[] }) {
  return items.map((item, indice) => {
    const ultimo = indice === items.length - 1;
    return (
      <Fragment key={item}>
        <span className="whitespace-nowrap">
          {item}
          {ultimo ? "" : " ·"}
        </span>
        {ultimo ? null : " "}
      </Fragment>
    );
  });
}
