import Link from "next/link";
import { ConfigurarMesas } from "@/components/panel/ConfigurarMesas";
import { IconoAtras } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { listarMesas, urlMesa } from "@/server/mesas";

export const metadata = { title: "Configurar mesas" };

export default async function PaginaConfigurarMesas() {
  await requerirPagina("ADMIN");
  const mesas = await listarMesas();
  return (
    <>
      <Link href="/admin/mesas" className="boton-texto mb-2 inline-flex items-center gap-1 px-0">
        <IconoAtras className="size-4" /> Mesas
      </Link>
      <ConfigurarMesas mesas={mesas.map((m) => ({ ...m, url: urlMesa(m.codigo) }))} />
    </>
  );
}
