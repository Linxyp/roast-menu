"use client";

import { hace, hora, pesos } from "@/lib/formato";
import { NOMBRE_ESTADO, type EstadoPedido, type PedidoDTO } from "@/lib/pedido";
import { IconoImpresora } from "../Iconos";

export const CLASE_ESTADO: Record<EstadoPedido, string> = {
  NUEVO: "etiqueta-nuevo",
  PREPARANDO: "etiqueta-preparando",
  LISTO: "etiqueta-listo",
  ENTREGADO: "etiqueta-entregado",
  CANCELADO: "etiqueta-cancelado",
};

/** Siguiente paso natural de cada estado (el botón grande de la tarjeta). */
const SIGUIENTE: Partial<Record<EstadoPedido, { destino: EstadoPedido; texto: string }>> = {
  NUEVO: { destino: "PREPARANDO", texto: "Preparar" },
  PREPARANDO: { destino: "LISTO", texto: "Listo" },
  LISTO: { destino: "ENTREGADO", texto: "Entregado" },
};

const ATRAS: Partial<Record<EstadoPedido, { destino: EstadoPedido; texto: string }>> = {
  PREPARANDO: { destino: "NUEVO", texto: "Volver a nuevo" },
  LISTO: { destino: "PREPARANDO", texto: "Volver a preparación" },
  ENTREGADO: { destino: "LISTO", texto: "Volver a listo" },
};

interface Props {
  pedido: PedidoDTO;
  reciente: boolean;
  ocupado: boolean;
  ahora: number;
  onEstado: (destino: EstadoPedido) => void;
  onCobrar: () => void;
  onCancelar: () => void;
  onImprimir: () => void;
}

export function TarjetaPedido({ pedido, reciente, ocupado, ahora, onEstado, onCobrar, onCancelar, onImprimir }: Props) {
  const siguiente = SIGUIENTE[pedido.estado];
  const atras = ATRAS[pedido.estado];
  const pagado = pedido.pagadoEn !== null;
  return (
    <article
      className={`pedido-tarjeta ${pedido.estado === "NUEVO" ? "pedido-tarjeta-nuevo" : ""} ${reciente ? "pedido-tarjeta-recien" : ""}`}
      aria-label={`Pedido ${pedido.numero}, mesa ${pedido.mesaNumero}`}
    >
      <header className="pedido-tarjeta-cabecera">
        <div>
          <p className="pedido-numero">#{pedido.numero}</p>
          <p className="pedido-mesa-grande">Mesa {pedido.mesaNumero}</p>
          <p className="text-sm text-crema/80">{pedido.cliente}</p>
        </div>
        <div className="grid justify-items-end gap-1.5">
          <span className={`etiqueta ${CLASE_ESTADO[pedido.estado]}`}>{NOMBRE_ESTADO[pedido.estado]}</span>
          <span className={`etiqueta ${pagado ? "etiqueta-pagado" : "etiqueta-por-cobrar"}`}>{pagado ? "Pagado" : "Por cobrar"}</span>
          <span className="pedido-tiempo" title={hora(pedido.creadoEn)}>
            {hace(pedido.creadoEn, ahora)}
          </span>
        </div>
      </header>

      <ul className="pedido-items">
        {pedido.items.map((item) => (
          <li key={item.id} className="pedido-item">
            <span className="pedido-item-cantidad">{item.cantidad}×</span>
            <span className="pedido-item-nombre">{item.nombre}</span>
            {item.detalles.length ? <span className="pedido-item-detalle">{item.detalles.join(" · ")}</span> : null}
            {item.nota ? <span className="pedido-item-nota">«{item.nota}»</span> : null}
          </li>
        ))}
      </ul>
      {pedido.nota ? <p className="pedido-nota-general">{pedido.nota}</p> : null}

      <div className="pedido-pie">
        <span className="pedido-total-panel">{pesos(pedido.total)}</span>
        <button
          type="button"
          className="boton-panel boton-panel-mini"
          disabled={ocupado}
          onClick={onImprimir}
          aria-label={`${pedido.impresoEn ? "Reimprimir" : "Imprimir"} comanda del pedido ${pedido.numero}`}
          title={pedido.impresoEn ? "La comanda ya salió impresa" : "La comanda aún no se ha impreso"}
        >
          <IconoImpresora className="size-4" />
          {pedido.impresoEn ? "Reimprimir" : "Imprimir"}
        </button>
      </div>

      <div className="pedido-acciones">
        {siguiente ? (
          <button type="button" className="boton-panel boton-panel-principal flex-1" disabled={ocupado} onClick={() => onEstado(siguiente.destino)}>
            {siguiente.texto}
          </button>
        ) : null}
        {!pagado ? (
          <button type="button" className={`boton-panel ${siguiente ? "" : "boton-panel-principal flex-1"}`} disabled={ocupado} onClick={onCobrar}>
            Cobrar
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-3">
        {atras ? (
          <button type="button" className="boton-texto px-0 text-sm" disabled={ocupado} onClick={() => onEstado(atras.destino)}>
            {atras.texto}
          </button>
        ) : null}
        {pedido.estado === "NUEVO" || pedido.estado === "PREPARANDO" ? (
          <button type="button" className="boton-texto px-0 text-sm" disabled={ocupado} onClick={() => onEstado("ENTREGADO")}>
            Marcar entregado
          </button>
        ) : null}
        <button type="button" className="boton-texto px-0 text-sm text-alerta" disabled={ocupado} onClick={onCancelar} aria-label={`Cancelar pedido ${pedido.numero}`}>
          Cancelar
        </button>
      </div>
    </article>
  );
}
