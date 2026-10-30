"use client";

import { useRef, useState } from "react";
import type { DetalleCarrito } from "@/lib/carrito";
import type { MesaDTO } from "@/lib/carta";
import { pesos } from "@/lib/formato";
import { Foto } from "../carta/Foto";
import { NombreProducto } from "../carta/NombreProducto";
import { IconoBolsa, IconoCerrar, IconoLapiz, IconoPapelera } from "../Iconos";
import { Cantidad } from "./Cantidad";

interface Props {
  mesa: MesaDTO;
  detalle: DetalleCarrito;
  cliente: string;
  nota: string;
  onCliente: (valor: string) => void;
  onNota: (valor: string) => void;
  onCantidad: (lineaId: string, cantidad: number) => void;
  onQuitar: (lineaId: string) => void;
  onEditar: (lineaId: string, productoId: string) => void;
  onVaciar: () => void;
  onEnviar: () => void;
  onCerrar: () => void;
  enviando: boolean;
  error: string | null;
  recibiendo: boolean;
}

export function ContenidoCarrito(props: Props) {
  const { mesa, detalle, cliente, nota, enviando, error, recibiendo } = props;
  const [vaciando, setVaciando] = useState(false);
  const [faltaNombre, setFaltaNombre] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const campoNombre = useRef<HTMLInputElement>(null);
  const vacio = detalle.lineas.length === 0;

  const enfocarTitulo = () => requestAnimationFrame(() => titulo.current?.focus());

  function enviar() {
    if (!cliente.trim()) {
      setFaltaNombre(true);
      campoNombre.current?.focus();
      return;
    }
    props.onEnviar();
  }

  return (
    <div>
      <header className="pedido-cabecera">
        <div>
          <h2 id="titulo-carrito" ref={titulo} tabIndex={-1} className="pedido-titulo">
            Tu pedido
          </h2>
          <p className="pedido-mesa">Mesa {mesa.numero}{mesa.nombre ? ` · ${mesa.nombre}` : ""}</p>
        </div>
        <button type="button" className="boton-cerrar" onClick={props.onCerrar} aria-label="Cerrar">
          <IconoCerrar className="size-5" />
        </button>
      </header>

      <div className="px-4 pb-6 sm:px-6">
        {vacio ? (
          <div className="pedido-vacio">
            <IconoBolsa className="size-10 text-oro-400" />
            <p>Tu pedido está vacío.</p>
            <button type="button" className="boton-secundario" onClick={props.onCerrar}>
              Ver la carta
            </button>
          </div>
        ) : (
          <>
            <ul className="pedido-lineas" aria-label="Productos del pedido">
              {detalle.lineas.map((item) => (
                <li key={item.linea.id} className={`linea ${item.problema ? "linea-con-problema" : ""}`}>
                  <div className="linea-foto">
                    <Foto imagen={item.producto.imagen} alt="" sizes="72px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="linea-titulo">
                        <NombreProducto nombre={item.titulo} />
                      </h3>
                      <p className="linea-subtotal">{pesos(item.subtotal)}</p>
                    </div>
                    {item.detalles.length > 0 || item.linea.nota ? (
                      <ul className="linea-detalles">
                        {item.detalles.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                        {item.linea.nota ? <li className="linea-nota">«{item.linea.nota}»</li> : null}
                      </ul>
                    ) : null}
                    {item.linea.cantidad > 1 ? <p className="linea-unitario">{pesos(item.precioUnitario)} c/u</p> : null}
                    {item.problema ? (
                      <p className="linea-problema" role="alert">
                        {item.problema} Edítalo o quítalo para poder enviar.
                      </p>
                    ) : null}
                    <div className="linea-acciones">
                      <Cantidad
                        valor={item.linea.cantidad}
                        onCambiar={(n) => props.onCantidad(item.linea.id, n)}
                        etiqueta={`Cantidad de ${item.titulo}`}
                        compacta
                      />
                      {item.producto.grupos.length > 0 || item.producto.toppings.length > 0 || item.problema ? (
                        <button type="button" className="boton-icono" onClick={() => props.onEditar(item.linea.id, item.producto.id)} aria-label={`Editar ${item.titulo}`}>
                          <IconoLapiz className="size-4" />
                          <span aria-hidden="true">Editar</span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="boton-icono"
                        aria-label={`Quitar ${item.titulo} del pedido`}
                        onClick={() => {
                          props.onQuitar(item.linea.id);
                          enfocarTitulo();
                        }}
                      >
                        <IconoPapelera className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="pedido-total">
              <span>Total</span>
              <strong>{pesos(detalle.total)}</strong>
            </div>

            <section className="pedido-datos" aria-labelledby="titulo-datos">
              <h3 id="titulo-datos" className="pedido-subtitulo">
                ¿A nombre de quién?
              </h3>
              <div className="campo">
                <label htmlFor="campo-cliente">Tu nombre</label>
                <input
                  ref={campoNombre}
                  id="campo-cliente"
                  type="text"
                  autoComplete="given-name"
                  maxLength={40}
                  value={cliente}
                  aria-invalid={faltaNombre && !cliente.trim() ? true : undefined}
                  aria-describedby={faltaNombre && !cliente.trim() ? "error-cliente" : "ayuda-cliente"}
                  onChange={(e) => props.onCliente(e.target.value)}
                />
                {faltaNombre && !cliente.trim() ? (
                  <p id="error-cliente" className="campo-error">
                    Escribe tu nombre: así sabemos de quién es cada pedido de la mesa.
                  </p>
                ) : (
                  <p id="ayuda-cliente" className="campo-ayuda">
                    Si en la mesa piden varias personas, cada una puede hacer su pedido y pagar el suyo.
                  </p>
                )}
              </div>
              <div className="campo">
                <label htmlFor="campo-nota">
                  Comentarios <span className="campo-opcional">(opcional)</span>
                </label>
                <textarea id="campo-nota" rows={2} maxLength={200} value={nota} onChange={(e) => props.onNota(e.target.value)} />
              </div>
            </section>
          </>
        )}
      </div>

      {vacio ? null : (
        <footer className="hoja-pie space-y-3">
          {error ? (
            <p className="pedido-error" role="alert">
              {error}
            </p>
          ) : null}
          {recibiendo ? (
            <button type="button" className="boton-primario w-full" onClick={enviar} disabled={enviando || !detalle.listo}>
              <span>{enviando ? "Enviando…" : "Enviar pedido"}</span>
              <span className="boton-primario-precio">{pesos(detalle.total)}</span>
            </button>
          ) : (
            <p className="pedido-pausado" role="note">
              En este momento no estamos recibiendo pedidos por el QR. Pide ayuda al personal.
            </p>
          )}
          <p className="pedido-pago">El pago se hace con el personal del restaurante.</p>
          {vaciando ? (
            <div className="pedido-confirmar" role="group" aria-label="Confirmar vaciar el pedido">
              <span>¿Vaciar todo el pedido?</span>
              <button
                type="button"
                className="boton-texto text-mostaza"
                onClick={() => {
                  props.onVaciar();
                  setVaciando(false);
                  enfocarTitulo();
                }}
              >
                Sí, vaciar
              </button>
              <button type="button" className="boton-texto" onClick={() => setVaciando(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" className="boton-texto mx-auto block" onClick={() => setVaciando(true)}>
              Vaciar pedido
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
