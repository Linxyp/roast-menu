import Link from "next/link";
import { EditorToppings } from "@/components/panel/carta/EditorToppings";
import { IconoAtras } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { listarListasToppings } from "@/server/carta-admin";

export const metadata = { title: "Toppings" };

export default async function PaginaToppings() {
  await requerirPagina("ADMIN");
  const listas = await listarListasToppings();
  return (
    <>
      <Link href="/admin/carta" className="boton-texto mb-2 inline-flex items-center gap-1 px-0">
        <IconoAtras className="size-4" /> Carta
      </Link>
      <EditorToppings listas={listas} />
    </>
  );
}
