import type { ReactNode } from "react";
import { fechaHora, pesos } from "@/lib/formato";
import type { PedidoDTO } from "@/lib/pedido";

/** Encabezado y pie comunes de los recibos. */
export function Recibo({ ancho, negocio, pie, children }: { ancho: number; negocio: string; pie: string; children: ReactNode }) {
  const [marca, ...resto] = negocio.split(" ");
  return (
    <div className={`recibo ${ancho === 58 ? "recibo-58" : ""}`}>
      {/* Tamaño de papel según la impresora configurada en Ajustes. */}
      <style>{`@media print { @page { size: ${ancho}mm auto; margin: 0; } }`}</style>
      <div className="recibo-centro">
        <p className="recibo-marca">{marca}</p>
        {resto.length ? <p>{resto.join(" ")}</p> : null}
      </div>
      {children}
      {pie ? (
        <>
          <hr className="recibo-separador" />
          <p className="recibo-centro">{pie}</p>
        </>
      ) : null}
    </div>
  );
}

/** Productos de un pedido con sus detalles y notas, como los lee la cocina. */
export function ItemsRecibo({ pedido }: { pedido: PedidoDTO }) {
  return (
    <>
      {pedido.items.map((item) => (
        <div key={item.id} className="recibo-item">
          <span className="recibo-item-nombre">
            {item.cantidad} x {item.nombre}
          </span>
          <span>{pesos(item.subtotal)}</span>
          {item.detalles.map((detalle) => (
            <span key={detalle} className="recibo-item-detalle">
              {detalle}
            </span>
          ))}
          {item.nota ? <span className="recibo-item-nota">«{item.nota}»</span> : null}
        </div>
      ))}
    </>
  );
}

export function CabeceraPedido({ pedido }: { pedido: PedidoDTO }) {
  return (
    <>
      <div className="recibo-fila recibo-grande">
        <span>#{pedido.numero}</span>
        <span>MESA {pedido.mesaNumero}</span>
      </div>
      <p>
        <strong>Cliente:</strong> {pedido.cliente}
      </p>
      <p>{fechaHora(pedido.creadoEn)}</p>
    </>
  );
}
