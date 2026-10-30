import type { Metadata } from "next";
import { BotonImprimir } from "@/components/panel/BotonImprimir";
import { CabeceraPedido, ItemsRecibo, Recibo } from "@/components/panel/Recibo";
import { pesos } from "@/lib/formato";
import { leerAjustes } from "@/server/ajustes";
import { requerirPagina } from "@/server/auth/acceso";
import { pedidoPorId } from "@/server/pedidos";
import "../../recibo.css";

export const metadata: Metadata = { title: "Comanda", robots: { index: false, follow: false } };

/** Comanda de un pedido para la cocina (con precios, sirve también para cobrar). */
export default async function ComandaPedido({ params }: { params: Promise<{ id: string }> }) {
  await requerirPagina();
  const { id } = await params;
  const [pedido, ajustes] = await Promise.all([pedidoPorId(id), leerAjustes()]);
  return (
    <main className="recibo-pagina">
      <div className="recibo-acciones no-imprimir">
        <BotonImprimir texto="Imprimir comanda" />
      </div>
      <Recibo ancho={ajustes.anchoRecibo} negocio={ajustes.nombreNegocio} pie={ajustes.pieRecibo}>
        <p className="recibo-titulo recibo-centro">{pedido.estado === "CANCELADO" ? "Pedido cancelado" : "Comanda"}</p>
        <hr className="recibo-separador" />
        <CabeceraPedido pedido={pedido} />
        <hr className="recibo-separador" />
        <ItemsRecibo pedido={pedido} />
        {pedido.nota ? <p className="recibo-nota">Comentario: {pedido.nota}</p> : null}
        <hr className="recibo-separador" />
        <div className="recibo-total">
          <span>TOTAL</span>
          <span>{pesos(pedido.total)}</span>
        </div>
        <p className="recibo-centro">{pedido.pagadoEn ? `PAGADO · ${pedido.metodoPago ?? ""}` : "POR COBRAR"}</p>
      </Recibo>
    </main>
  );
}
