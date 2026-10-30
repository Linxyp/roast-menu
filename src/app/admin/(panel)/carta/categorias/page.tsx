import Link from "next/link";
import { EditorCategorias } from "@/components/panel/carta/EditorCategorias";
import { IconoAtras } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { listarCategoriasAdmin } from "@/server/carta-admin";

export const metadata = { title: "Categorías" };

export default async function PaginaCategorias() {
  await requerirPagina("ADMIN");
  const categorias = await listarCategoriasAdmin();
  return (
    <>
      <Link href="/admin/carta" className="boton-texto mb-2 inline-flex items-center gap-1 px-0">
        <IconoAtras className="size-4" /> Carta
      </Link>
      <EditorCategorias
        categorias={categorias.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          tituloPrincipal: c.tituloPrincipal ?? "",
          tituloPincel: c.tituloPincel ?? "",
          pincelPrimero: c.pincelPrimero,
          lema: c.lema ?? "",
          visible: c.visible,
          productos: c._count.productos,
        }))}
      />
    </>
  );
}
