"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { anularCobro, cambiarEstadoPedido, cobrarMesa, cobrarPedidos } from "@/app/admin/acciones";
import { hora, pesos } from "@/lib/formato";
import { NOMBRE_ESTADO, type PedidoDTO } from "@/lib/pedido";
import type { MesaResumen } from "@/server/mesas";
import { IconoImpresora } from "../Iconos";
import { DialogoCobro } from "./Dialogos";
import { useVivo } from "./PanelVivo";
import { CLASE_ESTADO } from "./TarjetaPedido";

interface Props {
  cuenta: { mesa: MesaResumen; pendientes: PedidoDTO[]; cobradosHoy: PedidoDTO[] };
  metodosPago: string[];
  esAdmin: boolean;
}

type Cobro = { tipo: "pedido"; pedido: PedidoDTO } | { tipo: "mesa" } | null;

/** Cuenta de una mesa: cada pedido con su cliente y total, para cobrar por persona o todo junto. */
export function CuentaMesa({ cuenta, metodosPago, esAdmin }: Props) {
  const { mesa, pendientes, cobradosHoy } = cuenta;
  const vivo = useVivo();
  const router = useRouter();
  const [cobro, setCobro] = useState<Cobro>(null);
  const [error, setError] = useState<string | null>(null);
  const total = pendientes.reduce((suma, p) => suma + p.total, 0);

  async function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    const resultado = await tarea();
    router.refresh();
    if (!resultado.ok) setError(resultado.error ?? "No se pudo completar.");
    return resultado.ok ? null : (resultado.error ?? "No se pudo completar.");
  }

  return (
    <div className="grid gap-6">
      <div className="panel-cabecera mb-0">
        <div>
          <h1 className="panel-titulo">
            Mesa {mesa.numero}
            {mesa.nombre ? <span className="text-crema/60"> · {mesa.nombre}</span> : null}
          </h1>
          <p className="panel-texto-suave mt-1">
            Por cobrar: <strong className="text-mostaza">{pesos(total)}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="boton-panel" onClick={() => vivo.imprimir(`/admin/imprimir/cuenta/${mesa.id}`)} disabled={pendientes.length === 0}>
            <IconoImpresora className="size-4" /> Imprimir cuenta
          </button>
          <button type="button" className="boton-panel boton-panel-principal" onClick={() => setCobro({ tipo: "mesa" })} disabled={pendientes.length === 0}>
            Cobrar todo {pesos(total)}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      ) : null}

      <section aria-labelledby="titulo-pendientes" className="grid gap-3">
        <h2 id="titulo-pendientes" className="panel-subtitulo">
          Pendiente por cobrar
        </h2>
        {pendientes.length === 0 ? <p className="tablero-vacio">Esta mesa no tiene nada pendiente por cobrar.</p> : null}
        {pendientes.map((pedido) => (
          <article key={pedido.id} className="caja grid gap-3" aria-label={`Pedido ${pedido.numero} de ${pedido.cliente}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold">
                  #{pedido.numero} · {pedido.cliente}
                </p>
                <p className="text-sm text-crema/70">Pedido a las {hora(pedido.creadoEn)}</p>
              </div>
              <span className={`etiqueta ${CLASE_ESTADO[pedido.estado]}`}>{NOMBRE_ESTADO[pedido.estado]}</span>
            </div>
            <ul className="grid gap-1 text-sm">
              {pedido.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.cantidad} × {item.nombre}
                    {item.detalles.length ? <span className="block text-xs text-crema/65">{item.detalles.join(" · ")}</span> : null}
                  </span>
                  <span className="whitespace-nowrap">{pesos(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-oro-500/20 pt-3">
              <strong className="font-display text-2xl">{pesos(pedido.total)}</strong>
              <button type="button" className="boton-panel boton-panel-principal" onClick={() => setCobro({ tipo: "pedido", pedido })}>
                Cobrar este pedido
              </button>
            </div>
          </article>
        ))}
      </section>

      {cobradosHoy.length > 0 ? (
        <section aria-labelledby="titulo-cobrados" className="grid gap-3">
          <h2 id="titulo-cobrados" className="panel-subtitulo">
            Cobrado hoy
          </h2>
          <div className="lista-filas">
            {cobradosHoy.map((pedido) => (
              <div key={pedido.id} className="fila">
                <div className="fila-principal">
                  <p className="fila-nombre">
                    #{pedido.numero} · {pedido.cliente}
                  </p>
                  <p className="fila-detalle">
                    {pedido.metodoPago} · {pedido.pagadoEn ? hora(pedido.pagadoEn) : ""} · {NOMBRE_ESTADO[pedido.estado]}
                  </p>
                </div>
                <strong>{pesos(pedido.total)}</strong>
                {esAdmin ? (
                  <button type="button" className="boton-panel boton-panel-mini" onClick={() => void ejecutar(() => anularCobro(pedido.id))}>
                    Anular cobro
                  </button>
                ) : null}
                {pedido.estado !== "ENTREGADO" ? (
                  <button
                    type="button"
                    className="boton-panel boton-panel-mini"
                    onClick={() => void ejecutar(() => cambiarEstadoPedido(pedido.id, "ENTREGADO"))}
                  >
                    Marcar entregado
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <DialogoCobro
        abierto={cobro !== null}
        titulo={cobro?.tipo === "pedido" ? `Cobrar #${cobro.pedido.numero} · ${cobro.pedido.cliente}` : `Cobrar toda la mesa ${mesa.numero}`}
        total={cobro?.tipo === "pedido" ? cobro.pedido.total : total}
        metodos={metodosPago}
        onCerrar={() => setCobro(null)}
        onConfirmar={async (metodo) => {
          if (!cobro) return null;
          const problema = await ejecutar(() => (cobro.tipo === "pedido" ? cobrarPedidos([cobro.pedido.id], metodo) : cobrarMesa(mesa.id, metodo)));
          if (!problema) setCobro(null);
          return problema;
        }}
      />
    </div>
  );
}
