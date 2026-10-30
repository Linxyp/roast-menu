import Link from "next/link";
import { RefrescoVivo } from "@/components/panel/RefrescoVivo";
import { pesos, plural } from "@/lib/formato";
import { requerirPagina } from "@/server/auth/acceso";
import { listarMesas } from "@/server/mesas";

export const metadata = { title: "Mesas" };

export default async function PaginaMesas() {
  const usuario = await requerirPagina();
  const mesas = await listarMesas();
  const activas = mesas.filter((m) => m.activa);
  const porCobrar = activas.reduce((suma, m) => suma + m.porCobrar, 0);
  return (
    <>
      <RefrescoVivo />
      <div className="panel-cabecera">
        <div>
          <h1 className="panel-titulo">Mesas</h1>
          <p className="panel-texto-suave mt-1">
            {activas.filter((m) => m.abiertos > 0).length} con pedidos · por cobrar {pesos(porCobrar)}
          </p>
        </div>
        {usuario.rol === "ADMIN" ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/mesas/configurar" className="boton-panel">
              Configurar mesas
            </Link>
            <Link href="/admin/mesas/qr" className="boton-panel boton-panel-principal">
              Imprimir códigos QR
            </Link>
          </div>
        ) : null}
      </div>
      <div className="mesas">
        {activas.map((mesa) => {
          const estado = mesa.enCocina ? "cocina" : mesa.porCobrar > 0 ? "cobrar" : "libre";
          return (
            <Link key={mesa.id} href={`/admin/mesas/${mesa.id}`} className="mesa-tarjeta" data-estado={estado}>
              <span className="mesa-tarjeta-numero">Mesa {mesa.numero}</span>
              {mesa.nombre ? <span className="text-sm text-crema/70">{mesa.nombre}</span> : null}
              {mesa.abiertos > 0 ? (
                <>
                  <span className="text-sm">
                    {mesa.abiertos} {plural(mesa.abiertos, "pedido abierto", "pedidos abiertos")}
                  </span>
                  <span className={`etiqueta ${mesa.porCobrar > 0 ? "etiqueta-por-cobrar" : "etiqueta-pagado"}`}>
                    {mesa.porCobrar > 0 ? `Por cobrar ${pesos(mesa.porCobrar)}` : "Pagado"}
                  </span>
                </>
              ) : (
                <span className="text-sm text-crema/60">Libre</span>
              )}
            </Link>
          );
        })}
      </div>
      {activas.length === 0 ? <p className="tablero-vacio">No hay mesas activas. Agrégalas en «Configurar mesas».</p> : null}
    </>
  );
}
