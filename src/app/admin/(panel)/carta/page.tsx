import Link from "next/link";
import { ListaProductos } from "@/components/panel/carta/ListaProductos";
import { IconoMas } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { listarProductosAdmin } from "@/server/carta-admin";

export const metadata = { title: "Carta" };

export default async function PaginaCarta() {
  await requerirPagina("ADMIN");
  const categorias = await listarProductosAdmin();
  return (
    <>
      <div className="panel-cabecera">
        <div>
          <h1 className="panel-titulo">Carta</h1>
          <p className="panel-texto-suave mt-1">Los cambios se ven de inmediato en la carta de las mesas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/carta/categorias" className="boton-panel">
            Categorías
          </Link>
          <Link href="/admin/carta/toppings" className="boton-panel">
            Toppings
          </Link>
          <Link href="/admin/carta/producto/nuevo" className="boton-panel boton-panel-principal">
            <IconoMas className="size-4" /> Nuevo producto
          </Link>
          <Link href="/" target="_blank" className="boton-panel">
            Ver carta
          </Link>
        </div>
      </div>
      <ListaProductos categorias={categorias} />
    </>
  );
}
