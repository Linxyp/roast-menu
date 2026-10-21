import { NEGOCIO } from "@/data/negocio";
import { Foto } from "./Foto";

export function PiePagina() {
  const instagram = NEGOCIO.instagram.replace(/^@/, "");
  const datos = [
    { etiqueta: "Dirección", valor: NEGOCIO.direccion },
    { etiqueta: "Horario", valor: NEGOCIO.horario },
  ].filter((dato) => dato.valor);

  return (
    <footer className="pie">
      <Foto id="logo-roast" alt="" sizes="180px" className="pie-logo" />

      {datos.length > 0 ? (
        <dl className="pie-datos">
          {datos.map((dato) => (
            <div key={dato.etiqueta}>
              <dt>{dato.etiqueta}</dt>
              <dd>{dato.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {instagram ? (
        <a className="pie-enlace" href={`https://www.instagram.com/${instagram}/`} target="_blank" rel="noopener noreferrer">
          @{instagram} en Instagram
        </a>
      ) : null}

      <p className="pie-legal">Precios en pesos colombianos (COP).</p>
      <p className="pie-legal">
        © {new Date().getFullYear()} {NEGOCIO.nombreCompleto}
      </p>
    </footer>
  );
}
