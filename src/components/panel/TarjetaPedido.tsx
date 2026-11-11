"use client";

import { useState } from "react";
import { formatearTelefono, hace, hora, pesos } from "@/lib/formato";
import { NOMBRE_ESTADO, lugarPedido, type EstadoPedido, type PedidoDTO } from "@/lib/pedido";
import { IconoImpresora, IconoMensaje, IconoTelefono } from "../Iconos";

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
  /** Domicilios: fija el valor del domicilio (devuelve el error, si lo hubo). */
  onFijarValor: (valor: number) => Promise<string | null>;
}

export function TarjetaPedido({ pedido, reciente, ocupado, ahora, onEstado, onCobrar, onCancelar, onImprimir, onFijarValor }: Props) {
  const siguiente = SIGUIENTE[pedido.estado];
  const atras = ATRAS[pedido.estado];
  const pagado = pedido.pagadoEn !== null;
  const domicilio = pedido.tipo === "DOMICILIO";
  const faltaValor = domicilio && pedido.costoEnvio === null;
  return (
    <article
      className={`pedido-tarjeta ${pedido.estado === "NUEVO" ? "pedido-tarjeta-nuevo" : ""} ${reciente ? "pedido-tarjeta-recien" : ""}`}
      aria-label={`Pedido ${pedido.numero}, ${lugarPedido(pedido).toLowerCase()}`}
    >
      <header className="pedido-tarjeta-cabecera">
        <div>
          <p className="pedido-numero">#{pedido.numero}</p>
          <p className={`pedido-mesa-grande ${domicilio ? "pedido-domicilio" : ""}`}>{lugarPedido(pedido)}</p>
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

      {domicilio ? <DatosEntrega pedido={pedido} /> : null}

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

      {domicilio ? <ValorDomicilio pedido={pedido} pagado={pagado} ocupado={ocupado} onFijar={onFijarValor} /> : null}

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
          <button
            type="button"
            className={`boton-panel ${siguiente ? "" : "boton-panel-principal flex-1"}`}
            disabled={ocupado || faltaValor}
            title={faltaValor ? "Primero fija el valor del domicilio" : undefined}
            onClick={onCobrar}
          >
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

/** A quién y a dónde se lleva el domicilio, con atajos para llamar o escribir por WhatsApp. */
function DatosEntrega({ pedido }: { pedido: PedidoDTO }) {
  const telefono = pedido.telefono ?? "";
  const celular = telefono.startsWith("3");
  const cambio = pedido.pagaCon !== null ? pedido.pagaCon - pedido.total : null;
  return (
    <div className="pedido-entrega">
      <p className="pedido-entrega-direccion">
        {pedido.direccion}
        {pedido.barrio ? <span> · {pedido.barrio}</span> : null}
      </p>
      {pedido.referencia ? <p className="pedido-entrega-dato">{pedido.referencia}</p> : null}
      <p className="pedido-entrega-dato">
        Paga con {pedido.pagoPreferido}
        {pedido.pagaCon !== null ? ` · trae ${pesos(pedido.pagaCon)}${cambio !== null && cambio > 0 ? `, cambio ${pesos(cambio)}` : ""}` : ""}
      </p>
      <div className="pedido-entrega-contacto">
        <a className="boton-panel boton-panel-mini" href={`tel:+57${telefono}`} aria-label={`Llamar a ${pedido.cliente} al ${formatearTelefono(telefono)}`}>
          <IconoTelefono className="size-4" />
          {formatearTelefono(telefono)}
        </a>
        {celular ? (
          <a
            className="boton-panel boton-panel-mini"
            href={`https://wa.me/57${telefono}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Escribir por WhatsApp a ${pedido.cliente}`}
          >
            <IconoMensaje className="size-4" />
            WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Valor del domicilio: si quedó «por confirmar», se fija aquí antes de cobrar (también se puede corregir). */
function ValorDomicilio({
  pedido,
  pagado,
  ocupado,
  onFijar,
}: {
  pedido: PedidoDTO;
  pagado: boolean;
  ocupado: boolean;
  onFijar: (valor: number) => Promise<string | null>;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(pedido.costoEnvio !== null ? String(pedido.costoEnvio) : "");
  const [error, setError] = useState<string | null>(null);
  const campo = `valor-domicilio-${pedido.id}`;

  if (pedido.costoEnvio !== null && !editando) {
    return (
      <div className="pedido-valor-domicilio">
        <span>
          Productos {pesos(pedido.total - pedido.costoEnvio)} · Domicilio {pedido.costoEnvio === 0 ? "gratis" : pesos(pedido.costoEnvio)}
        </span>
        {!pagado ? (
          <button type="button" className="boton-texto px-0 text-sm" disabled={ocupado} onClick={() => setEditando(true)}>
            Cambiar
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <form
      className="pedido-valor-domicilio pedido-valor-domicilio-pendiente"
      onSubmit={async (e) => {
        e.preventDefault();
        const numero = Number(valor.replace(/\D/g, ""));
        if (valor.trim() === "" || !Number.isFinite(numero)) {
          setError("Escribe el valor (0 si es gratis).");
          return;
        }
        const problema = await onFijar(numero);
        setError(problema);
        if (!problema) setEditando(false);
      }}
    >
      <label htmlFor={campo}>Valor del domicilio {pedido.costoEnvio === null ? "(por confirmar)" : ""}</label>
      <div className="flex gap-2">
        <input
          id={campo}
          inputMode="numeric"
          placeholder="Ej.: 4000"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="pedido-valor-campo"
        />
        <button type="submit" className="boton-panel boton-panel-mini boton-panel-principal" disabled={ocupado}>
          Guardar
        </button>
      </div>
      {error ? (
        <p className="text-sm text-alerta" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
