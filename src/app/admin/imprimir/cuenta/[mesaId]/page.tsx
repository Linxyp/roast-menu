import type { Metadata } from "next";
import { BotonImprimir } from "@/components/panel/BotonImprimir";
import { ItemsRecibo, Recibo } from "@/components/panel/Recibo";
import { fechaHora, pesos } from "@/lib/formato";
import { leerAjustes } from "@/server/ajustes";
import { requerirPagina } from "@/server/auth/acceso";
import { cuentaMesa } from "@/server/mesas";
import "../../recibo.css";

export const metadata: Metadata = { title: "Cuenta", robots: { index: false, follow: false } };

/** Cuenta de la mesa: lo pendiente por cobrar, separado por pedido (cada cliente ve lo suyo). */
export default async function CuentaMesa({ params }: { params: Promise<{ mesaId: string }> }) {
  await requerirPagina();
  const { mesaId } = await params;
  const [{ mesa, pendientes }, ajustes] = await Promise.all([cuentaMesa(mesaId), leerAjustes()]);
  const total = pendientes.reduce((suma, p) => suma + p.total, 0);
  return (
    <main className="recibo-pagina">
      <div className="recibo-acciones no-imprimir">
        <BotonImprimir texto="Imprimir cuenta" />
      </div>
      <Recibo ancho={ajustes.anchoRecibo} negocio={ajustes.nombreNegocio} pie={ajustes.pieRecibo}>
        <p className="recibo-titulo recibo-centro">Cuenta · Mesa {mesa.numero}</p>
        <p className="recibo-centro">{fechaHora(new Date())}</p>
        {pendientes.length === 0 ? <p className="recibo-centro">No hay nada pendiente por cobrar.</p> : null}
        {pendientes.map((pedido) => (
          <section key={pedido.id}>
            <hr className="recibo-separador" />
            <div className="recibo-fila">
              <strong>
                #{pedido.numero} · {pedido.cliente}
              </strong>
              <strong>{pesos(pedido.total)}</strong>
            </div>
            <ItemsRecibo pedido={pedido} />
          </section>
        ))}
        <hr className="recibo-separador" />
        <div className="recibo-total">
          <span>TOTAL MESA</span>
          <span>{pesos(total)}</span>
        </div>
      </Recibo>
    </main>
  );
}
