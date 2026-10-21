import type { Categoria, Producto, ProductoArmable, ProductoSimple } from "@/data/tipos";
import { Foto } from "./Foto";
import { GaleriaPaso } from "./GaleriaPaso";
import { IconoBebida, IconoHamburguesa, IconoMas, IconoPapas } from "./Iconos";
import { TablaPrecios } from "./TablaPrecios";
import { TarjetaBebida } from "./TarjetaBebida";

interface Props {
  categoria: Categoria;
  productos: Producto[];
  /** La primera sección carga su foto de inmediato: es lo primero que se ve. */
  primera?: boolean;
}

export function SeccionCategoria({ categoria, productos, primera = false }: Props) {
  const armables = productos.filter((p): p is ProductoArmable => p.tipo === "armable");
  const simples = productos.filter((p): p is ProductoSimple => p.tipo === "simple");
  const notas = [...new Set(simples.flatMap((p) => p.nota ?? []))];
  const tituloId = `titulo-${categoria.id}`;

  return (
    <section id={categoria.id} aria-labelledby={tituloId} className="seccion">
      <div className="seccion-cabecera">
        <TituloSeccion id={tituloId} titulo={categoria.titulo} />
        {categoria.lema ? <p className="seccion-lema">{categoria.lema}</p> : null}
        {categoria.id === "combo" ? <IconosCombo /> : null}
      </div>

      {armables.map((producto, indice) => (
        <Destacado key={producto.id} producto={producto} prioridad={primera && indice === 0} />
      ))}

      {simples.length > 0 ? (
        <div className="mx-auto max-w-2xl">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {simples.map((producto) => (
              <TarjetaBebida key={producto.id} producto={producto} />
            ))}
          </div>
          {notas.map((nota) => (
            <p key={nota} className="nota-legal">
              {nota}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TituloSeccion({ id, titulo }: { id: string; titulo: Categoria["titulo"] }) {
  const pincel = <span className="titulo-pincel">{titulo.pincel}</span>;
  const principal = titulo.principal ? <span className="titulo-principal">{titulo.principal}</span> : null;
  return (
    <h2 id={id} className="titulo-seccion">
      {titulo.pincelPrimero ? pincel : principal} {titulo.pincelPrimero ? principal : pincel}
    </h2>
  );
}

function IconosCombo() {
  return (
    <div className="iconos-combo" aria-hidden="true">
      <IconoHamburguesa className="size-11" />
      <IconoMas className="size-5 text-crema/70" />
      <IconoPapas className="size-11" />
      <IconoMas className="size-5 text-crema/70" />
      <IconoBebida className="size-11" />
    </div>
  );
}

function Destacado({ producto, prioridad }: { producto: ProductoArmable; prioridad: boolean }) {
  return (
    <div className="destacado">
      <div className="destacado-principal">
        <div className="destacado-foto">
          <Foto
            id={producto.imagen}
            alt={producto.altImagen}
            sizes="(min-width: 1024px) 540px, (min-width: 768px) 50vw, 100vw"
            prioridad={prioridad}
          />
        </div>
        <TablaPrecios filas={producto.precios} />
      </div>
      {producto.pasos?.length ? (
        <div className="destacado-pasos">
          {producto.pasos.map((paso, indice) => (
            <GaleriaPaso
              key={paso.titulo}
              paso={paso}
              numero={producto.pasos && producto.pasos.length > 1 ? indice + 1 : undefined}
              id={`${producto.id}-paso-${indice + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
