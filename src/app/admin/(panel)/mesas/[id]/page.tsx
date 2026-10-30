import Link from "next/link";
import { CuentaMesa } from "@/components/panel/CuentaMesa";
import { RefrescoVivo } from "@/components/panel/RefrescoVivo";
import { IconoAtras } from "@/components/Iconos";
import { leerAjustes } from "@/server/ajustes";
import { requerirPagina } from "@/server/auth/acceso";
import { cuentaMesa } from "@/server/mesas";

export const metadata = { title: "Cuenta de mesa" };

export default async function PaginaCuentaMesa({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await requerirPagina();
  const { id } = await params;
  const [cuenta, ajustes] = await Promise.all([cuentaMesa(id), leerAjustes()]);
  return (
    <>
      <RefrescoVivo />
      <Link href="/admin/mesas" className="boton-texto mb-2 inline-flex items-center gap-1 px-0">
        <IconoAtras className="size-4" /> Todas las mesas
      </Link>
      <CuentaMesa cuenta={cuenta} metodosPago={ajustes.metodosPago} esAdmin={usuario.rol === "ADMIN"} />
    </>
  );
}
