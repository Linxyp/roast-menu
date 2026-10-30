import { TableroPedidos } from "@/components/panel/TableroPedidos";
import { leerAjustes } from "@/server/ajustes";
import { requerirPagina } from "@/server/auth/acceso";
import { pedidosAbiertos } from "@/server/pedidos";

export const metadata = { title: "Pedidos" };

export default async function PaginaPedidos({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  await requerirPagina();
  const [pedidos, ajustes, { aviso }] = await Promise.all([pedidosAbiertos(), leerAjustes(), searchParams]);
  return (
    <>
      {aviso === "permiso" ? (
        <p className="mensaje-error mb-4" role="alert">
          Esa sección es solo para administradores.
        </p>
      ) : null}
      <TableroPedidos inicial={{ pedidos, metodosPago: ajustes.metodosPago, recibiendoPedidos: ajustes.recibiendoPedidos }} />
    </>
  );
}
