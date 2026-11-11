import type { ReactNode } from "react";
import { fechaHora, formatearTelefono, pesos } from "@/lib/formato";
import { lugarPedido, type PedidoDTO } from "@/lib/pedido";

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
        <span>{lugarPedido(pedido).toUpperCase()}</span>
      </div>
      <p>
        <strong>Cliente:</strong> {pedido.cliente}
      </p>
      {pedido.tipo === "DOMICILIO" ? (
        <>
          <p>
            <strong>Tel.:</strong> {formatearTelefono(pedido.telefono ?? "")}
          </p>
          <p>
            <strong>Dirección:</strong> {pedido.direccion}
          </p>
          <p>
            <strong>Barrio:</strong> {pedido.barrio}
          </p>
          {pedido.referencia ? (
            <p>
              <strong>Ref.:</strong> {pedido.referencia}
            </p>
          ) : null}
        </>
      ) : null}
      <p>{fechaHora(pedido.creadoEn)}</p>
    </>
  );
}

/** Domicilios: productos y valor del domicilio antes del total. */
export function ValoresDomicilio({ pedido }: { pedido: PedidoDTO }) {
  const envio = pedido.costoEnvio;
  return (
    <>
      <div className="recibo-fila">
        <span>Productos</span>
        <span>{pesos(pedido.total - (envio ?? 0))}</span>
      </div>
      <div className="recibo-fila">
        <span>Domicilio</span>
        <span>{envio === null ? "por confirmar" : envio === 0 ? "gratis" : pesos(envio)}</span>
      </div>
    </>
  );
}

/** Cómo y con cuánto paga: lo que el domiciliario necesita para llevar el cambio. */
export function PagoRecibo({ pedido }: { pedido: PedidoDTO }) {
  if (pedido.pagadoEn) return <p className="recibo-centro">PAGADO · {pedido.metodoPago ?? ""}</p>;
  if (pedido.tipo !== "DOMICILIO") return <p className="recibo-centro">POR COBRAR</p>;
  return (
    <>
      <p className="recibo-centro">POR COBRAR · {pedido.pagoPreferido}</p>
      {pedido.pagaCon !== null ? (
        <p className="recibo-centro">
          Trae {pesos(pedido.pagaCon)}
          {pedido.pagaCon > pedido.total ? ` · cambio ${pesos(pedido.pagaCon - pedido.total)}` : ""}
        </p>
      ) : null}
    </>
  );
}
