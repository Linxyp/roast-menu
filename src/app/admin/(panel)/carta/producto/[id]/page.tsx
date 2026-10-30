import Link from "next/link";
import { EditorProducto } from "@/components/panel/carta/EditorProducto";
import { IconoAtras } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { listarCategoriasAdmin, listarListasToppings, productoParaEditar } from "@/server/carta-admin";

export const metadata = { title: "Producto" };

export default async function PaginaProducto({ params }: { params: Promise<{ id: string }> }) {
  await requerirPagina("ADMIN");
  const { id } = await params;
  const [categorias, listas, producto] = await Promise.all([
    listarCategoriasAdmin(),
    listarListasToppings(),
    id === "nuevo" ? Promise.resolve(null) : productoParaEditar(id),
  ]);
  return (
    <>
      <Link href="/admin/carta" className="boton-texto mb-2 inline-flex items-center gap-1 px-0">
        <IconoAtras className="size-4" /> Carta
      </Link>
      <EditorProducto
        inicial={producto}
        categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        listas={listas.map((l) => ({ id: l.id, nombre: l.nombre, toppings: l.toppings }))}
      />
    </>
  );
}
