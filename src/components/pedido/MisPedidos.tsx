"use client";

import { useEffect, useState } from "react";
import type { MesaDTO } from "@/lib/carta";
import { hora, pesos } from "@/lib/formato";
import type { EstadoPedido, PedidoClienteDTO } from "@/lib/pedido";
import { IconoCerrar } from "../Iconos";
import type { PedidoEnviado } from "./almacen";

const PASOS: { estado: EstadoPedido; nombre: string }[] = [
  { estado: "NUEVO", nombre: "Recibido" },
  { estado: "PREPARANDO", nombre: "En preparación" },
  { estado: "LISTO", nombre: "Listo" },
  { estado: "ENTREGADO", nombre: "Entregado" },
];

export async function consultarPedido(codigo: string, id: string): Promise<PedidoClienteDTO | null> {
  try {
    const respuesta = await fetch(`/api/m/${codigo}/pedidos/${id}`, { cache: "no-store" });
    return respuesta.ok ? ((await respuesta.json()) as PedidoClienteDTO) : null;
  } catch {
    return null;
  }
}

interface Props {
  mesa: MesaDTO;
  pedidos: PedidoEnviado[];
  onCerrar: () => void;
  onPedirMas: () => void;
}

/** Seguimiento en vivo de los pedidos enviados desde este celular. */
export function MisPedidos({ mesa, pedidos, onCerrar, onPedirMas }: Props) {
  const [estados, setEstados] = useState<Record<string, PedidoClienteDTO | null>>({});

  useEffect(() => {
    let vigente = true;
    async function actualizar() {
      const resultados = await Promise.all(pedidos.map(async (p) => [p.id, await consultarPedido(mesa.codigo, p.id)] as const));
      if (vigente) setEstados(Object.fromEntries(resultados));
    }
    actualizar();
    const intervalo = window.setInterval(actualizar, 6000);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, [mesa.codigo, pedidos]);

  return (
    <div>
      <header className="pedido-cabecera">
        <div>
          <h2 id="titulo-mis-pedidos" className="pedido-titulo">
            Mis pedidos
          </h2>
          <p className="pedido-mesa">Mesa {mesa.numero} · se actualiza solo</p>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar className="size-5" />
        </button>
      </header>
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {pedidos.map((enviado) => {
          const pedido = estados[enviado.id];
          const indice = pedido ? PASOS.findIndex((p) => p.estado === pedido.estado) : 0;
          return (
            <article key={enviado.id} className="seguimiento" aria-labelledby={`seg-${enviado.id}`}>
              <header className="seguimiento-cabecera">
                <h3 id={`seg-${enviado.id}`}>Pedido #{enviado.numero}</h3>
                <span>{hora(new Date(enviado.enviadoEn))}</span>
              </header>
              {pedido?.estado === "CANCELADO" ? (
                <p className="seguimiento-cancelado">Este pedido fue cancelado. Habla con el personal si tienes dudas.</p>
              ) : (
                <ol className="seguimiento-pasos" aria-label="Estado del pedido">
                  {PASOS.map((paso, i) => (
                    <li key={paso.estado} className={i < indice ? "hecho" : i === indice ? "actual" : ""} aria-current={i === indice ? "step" : undefined}>
                      <span className="seguimiento-punto" aria-hidden="true" />
                      {paso.nombre}
                    </li>
                  ))}
                </ol>
              )}
              {pedido ? (
                <>
                  <ul className="seguimiento-items">
                    {pedido.items.map((item, i) => (
                      <li key={i}>
                        <span>
                          {item.cantidad} × {item.nombre}
                          {item.detalles.length ? <small>{item.detalles.join(" · ")}</small> : null}
                          {item.nota ? <small className="italic">«{item.nota}»</small> : null}
                        </span>
                        <span>{pesos(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="seguimiento-total">
                    <span>Total {pedido.pagado ? "· pagado" : "· por pagar"}</span>
                    <strong>{pesos(pedido.total)}</strong>
                  </p>
                </>
              ) : (
                <p className="seguimiento-total">
                  <span>Total</span>
                  <strong>{pesos(enviado.total)}</strong>
                </p>
              )}
            </article>
          );
        })}
      </div>
      <footer className="hoja-pie">
        <button type="button" className="boton-secundario w-full" onClick={onPedirMas}>
          Pedir algo más
        </button>
      </footer>
    </div>
  );
}
