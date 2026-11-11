"use client";

import { useEffect, useState } from "react";
import type { DestinoPedido } from "@/lib/carta";
import { formatearTelefono, hora, pesos } from "@/lib/formato";
import { NOMBRE_ESTADO, type EstadoPedido, type PedidoClienteDTO } from "@/lib/pedido";
import { IconoCerrar } from "../Iconos";
import type { PedidoEnviado } from "./almacen";

const PASOS: EstadoPedido[] = ["NUEVO", "PREPARANDO", "LISTO", "ENTREGADO"];

/** Nombre de cada paso como lo lee el cliente: en un domicilio, «Listo» es que ya va en camino. */
export function nombrePaso(estado: EstadoPedido, domicilio: boolean): string {
  if (estado === "NUEVO") return "Recibido";
  if (estado === "LISTO" && domicilio) return "En camino";
  return NOMBRE_ESTADO[estado];
}

/** Dónde se envían y se consultan los pedidos de esta mesa o de los domicilios. */
export function rutaPedidos(destino: DestinoPedido): string {
  return destino.tipo === "mesa" ? `/api/m/${destino.mesa.codigo}/pedidos` : "/api/domicilio/pedidos";
}

export async function consultarPedido(ruta: string, id: string): Promise<PedidoClienteDTO | null> {
  try {
    const respuesta = await fetch(`${ruta}/${id}`, { cache: "no-store" });
    return respuesta.ok ? ((await respuesta.json()) as PedidoClienteDTO) : null;
  } catch {
    return null;
  }
}

interface Props {
  destino: DestinoPedido;
  pedidos: PedidoEnviado[];
  onCerrar: () => void;
  onPedirMas: () => void;
}

/** Seguimiento en vivo de los pedidos enviados desde este celular. */
export function MisPedidos({ destino, pedidos, onCerrar, onPedirMas }: Props) {
  const [estados, setEstados] = useState<Record<string, PedidoClienteDTO | null>>({});
  const domicilio = destino.tipo === "domicilio";
  const telefono = destino.tipo === "domicilio" ? destino.domicilio.telefono : "";
  const ruta = rutaPedidos(destino);

  useEffect(() => {
    let vigente = true;
    async function actualizar() {
      const resultados = await Promise.all(pedidos.map(async (p) => [p.id, await consultarPedido(ruta, p.id)] as const));
      if (vigente) setEstados(Object.fromEntries(resultados));
    }
    actualizar();
    const intervalo = window.setInterval(actualizar, 6000);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, [ruta, pedidos]);

  return (
    <div>
      <header className="pedido-cabecera">
        <div>
          <h2 id="titulo-mis-pedidos" className="pedido-titulo">
            Mis pedidos
          </h2>
          <p className="pedido-mesa">{destino.tipo === "mesa" ? `Mesa ${destino.mesa.numero}` : "A domicilio"} · se actualiza solo</p>
        </div>
        <button type="button" className="boton-cerrar" onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar className="size-5" />
        </button>
      </header>
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {pedidos.map((enviado) => {
          const pedido = estados[enviado.id];
          const indice = pedido ? PASOS.indexOf(pedido.estado) : 0;
          return (
            <article key={enviado.id} className="seguimiento" aria-labelledby={`seg-${enviado.id}`}>
              <header className="seguimiento-cabecera">
                <h3 id={`seg-${enviado.id}`}>Pedido #{enviado.numero}</h3>
                <span>{hora(new Date(enviado.enviadoEn))}</span>
              </header>
              {pedido?.estado === "CANCELADO" ? (
                <p className="seguimiento-cancelado">
                  {domicilio
                    ? `Este pedido fue cancelado.${telefono ? ` Si tienes dudas, llámanos al ${formatearTelefonoLibre(telefono)}.` : ""}`
                    : "Este pedido fue cancelado. Habla con el personal si tienes dudas."}
                </p>
              ) : (
                <ol className="seguimiento-pasos" aria-label="Estado del pedido">
                  {PASOS.map((paso, i) => (
                    <li key={paso} className={i < indice ? "hecho" : i === indice ? "actual" : ""} aria-current={i === indice ? "step" : undefined}>
                      <span className="seguimiento-punto" aria-hidden="true" />
                      {nombrePaso(paso, domicilio)}
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
                    {pedido.tipo === "DOMICILIO" ? (
                      <li>
                        <span>Domicilio</span>
                        <span>{pedido.costoEnvio === null ? "por confirmar" : pedido.costoEnvio === 0 ? "gratis" : pesos(pedido.costoEnvio)}</span>
                      </li>
                    ) : null}
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
        {domicilio && telefono ? (
          <p className="pedido-pago">
            ¿Dudas con tu domicilio? Llámanos o escríbenos al <a href={`tel:${telefono.replace(/\s/g, "")}`}>{formatearTelefonoLibre(telefono)}</a>.
          </p>
        ) : null}
      </div>
      <footer className="hoja-pie">
        <button type="button" className="boton-secundario w-full" onClick={onPedirMas}>
          Pedir algo más
        </button>
      </footer>
    </div>
  );
}

/** El teléfono del negocio lo escriben a mano en Ajustes: si son 10 dígitos se agrupa, si no queda tal cual. */
function formatearTelefonoLibre(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  return digitos.length === 10 ? formatearTelefono(digitos) : telefono;
}
