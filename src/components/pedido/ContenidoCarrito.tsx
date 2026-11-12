"use client";

import { useRef, useState } from "react";
import type { DetalleCarrito } from "@/lib/carrito";
import type { DestinoPedido } from "@/lib/carta";
import { pesos } from "@/lib/formato";
import { envioMaximo, esEfectivo, normalizarTelefono, textoCobroDomicilio } from "@/lib/pedido";
import { Foto } from "../carta/Foto";
import { NombreProducto } from "../carta/NombreProducto";
import { IconoBolsa, IconoCerrar, IconoLapiz, IconoPapelera } from "../Iconos";
import { Cantidad } from "./Cantidad";

/** Datos de entrega de un domicilio tal como los escribe el cliente. */
export interface Entrega {
  telefono: string;
  direccion: string;
  barrio: string;
  referencia: string;
  pago: string;
  /** Con cuánto paga en efectivo (texto del campo), para llevarle el cambio. */
  pagaCon: string;
}

type Campo = "cliente" | "telefono" | "direccion" | "barrio" | "pago" | "pagaCon";

interface Props {
  destino: DestinoPedido;
  detalle: DetalleCarrito;
  cliente: string;
  entrega: Entrega;
  nota: string;
  onCliente: (valor: string) => void;
  onEntrega: (cambios: Partial<Entrega>) => void;
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
  const { destino, detalle, cliente, entrega, nota, enviando, error, recibiendo } = props;
  const [vaciando, setVaciando] = useState(false);
  const [revisar, setRevisar] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const vacio = detalle.lineas.length === 0;

  const domicilio = destino.tipo === "domicilio" ? destino.domicilio : null;
  const cobro = domicilio?.cobro ?? null;
  // Con un rango según la distancia, el total va del domicilio más barato al más caro.
  const totalDesde = detalle.total + (cobro?.tipo === "fijo" ? cobro.valor : cobro?.tipo === "rango" ? cobro.desde : 0);
  const totalHasta = detalle.total + (cobro ? envioMaximo(cobro) : 0);
  const textoTotal = totalHasta > totalDesde ? `${pesos(totalDesde)} a ${pesos(totalHasta)}` : pesos(totalDesde);
  const faltaParaMinimo = domicilio && domicilio.minimo > detalle.total ? domicilio.minimo - detalle.total : 0;
  const efectivo = esEfectivo(entrega.pago);
  const pagaCon = Number(entrega.pagaCon.replace(/\D/g, ""));

  // Lo que falta o está mal, en el orden del formulario.
  const errores: Partial<Record<Campo, string>> = {};
  if (!cliente.trim()) {
    errores.cliente = domicilio ? "Escribe tu nombre." : "Escribe tu nombre: así sabemos de quién es cada pedido de la mesa.";
  }
  if (domicilio) {
    if (!normalizarTelefono(entrega.telefono)) errores.telefono = "Escribe un celular de 10 dígitos, por ejemplo 300 123 4567.";
    if (entrega.direccion.trim().length < 5) errores.direccion = "Escribe la dirección completa.";
    if (entrega.barrio.trim().length < 2) errores.barrio = "Escribe el barrio.";
    if (!domicilio.metodosPago.includes(entrega.pago)) errores.pago = "Elige cómo vas a pagar.";
    if (efectivo && pagaCon > 0 && cobro?.tipo !== "confirmar" && pagaCon < totalHasta) {
      const cuanto = cobro?.tipo === "rango" ? `puede llegar a ${pesos(totalHasta)}` : `es ${pesos(totalHasta)}`;
      errores.pagaCon = `Con ${pesos(pagaCon)} no alcanza: el total ${cuanto}.`;
    }
  }
  const errorDe = (campo: Campo) => (revisar ? errores[campo] : undefined);

  const enfocarTitulo = () => requestAnimationFrame(() => titulo.current?.focus());

  function enviar() {
    const primero = (Object.keys(errores) as Campo[])[0];
    if (primero) {
      setRevisar(true);
      // Centrado: así se ve también el mensaje que aparece debajo del campo.
      const campo = document.getElementById(primero === "pago" ? "pago-0" : `campo-${primero}`);
      campo?.focus({ preventScroll: true });
      campo?.scrollIntoView({ block: "center" });
      return;
    }
    props.onEnviar();
  }

  /** Atributos de accesibilidad de un campo con su ayuda o su error. */
  const describir = (campo: Campo, ayuda?: string) => ({
    "aria-invalid": errorDe(campo) ? true : undefined,
    "aria-describedby": errorDe(campo) ? `error-${campo}` : ayuda,
  });

  return (
    <div>
      <header className="pedido-cabecera">
        <div>
          <h2 id="titulo-carrito" ref={titulo} tabIndex={-1} className="pedido-titulo">
            Tu pedido
          </h2>
          <p className="pedido-mesa">
            {destino.tipo === "mesa" ? `Mesa ${destino.mesa.numero}${destino.mesa.nombre ? ` · ${destino.mesa.nombre}` : ""}` : "A domicilio"}
          </p>
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

            {domicilio ? (
              <dl className="pedido-cuentas">
                <div>
                  <dt>Productos</dt>
                  <dd>{pesos(detalle.total)}</dd>
                </div>
                <div>
                  <dt>Domicilio</dt>
                  <dd>{cobro ? textoCobroDomicilio(cobro) : null}</dd>
                </div>
              </dl>
            ) : null}
            <div className="pedido-total">
              <span>Total</span>
              <strong>{textoTotal}</strong>
            </div>
            {cobro?.tipo === "confirmar" ? (
              <p className="pedido-pago text-left">El valor del domicilio te lo confirmamos al llamarte; se suma al total.</p>
            ) : cobro?.tipo === "rango" ? (
              <p className="pedido-pago text-left">El domicilio depende de la distancia: te confirmamos el valor exacto al llamarte.</p>
            ) : null}

            {domicilio ? (
              <section className="pedido-datos" aria-labelledby="titulo-datos">
                <h3 id="titulo-datos" className="pedido-subtitulo">
                  ¿A dónde te lo llevamos?
                </h3>
                {domicilio.zona ? <p className="campo-ayuda">Zona de entrega: {domicilio.zona}</p> : null}
                <div className="campo">
                  <label htmlFor="campo-cliente">Tu nombre</label>
                  <input
                    id="campo-cliente"
                    type="text"
                    autoComplete="name"
                    maxLength={40}
                    value={cliente}
                    onChange={(e) => props.onCliente(e.target.value)}
                    {...describir("cliente")}
                  />
                  <Error campo="cliente" mensaje={errorDe("cliente")} />
                </div>
                <div className="campo">
                  <label htmlFor="campo-telefono">Celular</label>
                  <input
                    id="campo-telefono"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    maxLength={20}
                    placeholder="300 123 4567"
                    value={entrega.telefono}
                    onChange={(e) => props.onEntrega({ telefono: e.target.value })}
                    {...describir("telefono", "ayuda-telefono")}
                  />
                  {errorDe("telefono") ? (
                    <Error campo="telefono" mensaje={errorDe("telefono")} />
                  ) : (
                    <p id="ayuda-telefono" className="campo-ayuda">
                      Te llamamos si necesitamos algo para la entrega.
                    </p>
                  )}
                </div>
                <div className="campo">
                  <label htmlFor="campo-direccion">Dirección</label>
                  <input
                    id="campo-direccion"
                    type="text"
                    autoComplete="street-address"
                    maxLength={120}
                    placeholder="Calle 10 # 5-20, casa 3"
                    value={entrega.direccion}
                    onChange={(e) => props.onEntrega({ direccion: e.target.value })}
                    {...describir("direccion")}
                  />
                  <Error campo="direccion" mensaje={errorDe("direccion")} />
                </div>
                <div className="campo">
                  <label htmlFor="campo-barrio">Barrio</label>
                  <input
                    id="campo-barrio"
                    type="text"
                    maxLength={60}
                    value={entrega.barrio}
                    onChange={(e) => props.onEntrega({ barrio: e.target.value })}
                    {...describir("barrio")}
                  />
                  <Error campo="barrio" mensaje={errorDe("barrio")} />
                </div>
                <div className="campo">
                  <label htmlFor="campo-referencia">
                    Indicaciones para llegar <span className="campo-opcional">(opcional)</span>
                  </label>
                  <input
                    id="campo-referencia"
                    type="text"
                    maxLength={160}
                    placeholder="Portón negro, al lado de la tienda"
                    value={entrega.referencia}
                    onChange={(e) => props.onEntrega({ referencia: e.target.value })}
                  />
                </div>
                <fieldset className="campo" aria-describedby={errorDe("pago") ? "error-pago" : undefined}>
                  <legend>¿Cómo vas a pagar?</legend>
                  <div className="pago-opciones">
                    {domicilio.metodosPago.map((metodo, i) => (
                      <label key={metodo} className="pago-opcion">
                        <input id={`pago-${i}`} type="radio" name="pago" checked={entrega.pago === metodo} onChange={() => props.onEntrega({ pago: metodo })} />
                        {metodo}
                      </label>
                    ))}
                  </div>
                  <Error campo="pago" mensaje={errorDe("pago")} />
                </fieldset>
                {efectivo ? (
                  <div className="campo">
                    <label htmlFor="campo-pagaCon">
                      ¿Con cuánto pagas? <span className="campo-opcional">(opcional)</span>
                    </label>
                    <input
                      id="campo-pagaCon"
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Ej.: 50000"
                      value={entrega.pagaCon}
                      onChange={(e) => props.onEntrega({ pagaCon: e.target.value })}
                      {...describir("pagaCon", "ayuda-pagaCon")}
                    />
                    {errorDe("pagaCon") ? (
                      <Error campo="pagaCon" mensaje={errorDe("pagaCon")} />
                    ) : (
                      <p id="ayuda-pagaCon" className="campo-ayuda">
                        Así te llevamos el cambio exacto.
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="campo">
                  <label htmlFor="campo-nota">
                    Comentarios <span className="campo-opcional">(opcional)</span>
                  </label>
                  <textarea id="campo-nota" rows={2} maxLength={200} value={nota} onChange={(e) => props.onNota(e.target.value)} />
                </div>
              </section>
            ) : (
              <section className="pedido-datos" aria-labelledby="titulo-datos">
                <h3 id="titulo-datos" className="pedido-subtitulo">
                  ¿A nombre de quién?
                </h3>
                <div className="campo">
                  <label htmlFor="campo-cliente">Tu nombre</label>
                  <input
                    id="campo-cliente"
                    type="text"
                    autoComplete="given-name"
                    maxLength={40}
                    value={cliente}
                    onChange={(e) => props.onCliente(e.target.value)}
                    {...describir("cliente", "ayuda-cliente")}
                  />
                  {errorDe("cliente") ? (
                    <Error campo="cliente" mensaje={errorDe("cliente")} />
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
            )}
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
          {faltaParaMinimo > 0 ? (
            <p className="pedido-pausado" role="note">
              El pedido mínimo para domicilio es {pesos(domicilio?.minimo ?? 0)}: te faltan {pesos(faltaParaMinimo)}.
            </p>
          ) : null}
          {recibiendo ? (
            <button type="button" className="boton-primario w-full" onClick={enviar} disabled={enviando || !detalle.listo || faltaParaMinimo > 0}>
              <span>{enviando ? "Enviando…" : "Enviar pedido"}</span>
              <span className="boton-primario-precio">{textoTotal}</span>
            </button>
          ) : (
            <p className="pedido-pausado" role="note">
              {domicilio
                ? "En este momento no estamos tomando domicilios. Intenta de nuevo más tarde."
                : "En este momento no estamos recibiendo pedidos por el QR. Pide ayuda al personal."}
            </p>
          )}
          <p className="pedido-pago">{domicilio ? "Pagas cuando recibes tu pedido." : "El pago se hace con el personal del restaurante."}</p>
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

function Error({ campo, mensaje }: { campo: Campo; mensaje?: string }) {
  return mensaje ? (
    <p id={`error-${campo}`} className="campo-error">
      {mensaje}
    </p>
  ) : null;
}
