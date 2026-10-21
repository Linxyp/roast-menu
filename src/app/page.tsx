import { Encabezado } from "@/components/Encabezado";
import { NavCategorias } from "@/components/NavCategorias";
import { PiePagina } from "@/components/PiePagina";
import { SeccionCategoria } from "@/components/SeccionCategoria";
import { CATEGORIAS, productosDe } from "@/data/menu";

export default function PaginaMenu() {
  return (
    <>
      <a href="#menu" className="saltar">
        Saltar al menú
      </a>
      <Encabezado />
      <NavCategorias categorias={CATEGORIAS.map(({ id, nombre }) => ({ id, nombre }))} />
      <main id="menu" tabIndex={-1} className="outline-none">
        {CATEGORIAS.map((categoria, indice) => (
          <SeccionCategoria
            key={categoria.id}
            categoria={categoria}
            productos={productosDe(categoria.id)}
            primera={indice === 0}
          />
        ))}
      </main>
      <PiePagina />
    </>
  );
}
