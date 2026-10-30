"use client";

import { useId, useState, type FormEvent } from "react";
import type { ProductoDTO } from "@/lib/carta";
import { pesos, plural } from "@/lib/formato";
import { ayudaToppings, cotizar, normalizarSeleccion, siguienteSuma, tituloLinea, validarSeleccion, type Seleccion } from "@/lib/precios";
import { Foto } from "../carta/Foto";
import { NombreProducto } from "../carta/NombreProducto";
import { TablaPrecios } from "../carta/TablaPrecios";
import { IconoCerrar } from "../Iconos";
import { Cantidad } from "./Cantidad";
import { OpcionFoto } from "./OpcionFoto";

interface Props {
  producto: ProductoDTO;
  /** «ver»: carta sin mesa (se pueden explorar opciones y precios, pero no pedir). */
  modo: "agregar" | "editar" | "ver";
  inicial?: { seleccion: Seleccion; cantidad: number; nota: string };
  tituloId: string;
  onConfirmar?: (seleccion: Seleccion, cantidad: number, nota: string) => void;
  onCerrar: () => void;
}

export function Personalizador({ producto, modo, inicial, tituloId, onConfirmar, onCerrar }: Props) {
  const [opciones, setOpciones] = useState<Record<string, string>>(inicial?.seleccion.opciones ?? {});
  // En el orden en que el cliente los toca: los primeros son los incluidos.
  const [toppings, setToppings] = useState<string[]>(inicial?.seleccion.toppings ?? []);
  const [cantidad, setCantidad] = useState(inicial?.cantidad ?? 1);
  const [nota, setNota] = useState(inicial?.nota ?? "");
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const id = useId();
  const idGrupo = (campo: string) => `${id}-grupo-${campo}`;

  const seleccion: Seleccion = { opciones, toppings };
  const cotizacion = cotizar(producto, seleccion);
  const errores = validarSeleccion(producto, seleccion);
  const errorDe = (campo: string) => (mostrarErrores ? errores.find((e) => e.campo === campo)?.mensaje : undefined);

  const { maxToppings, precioToppingAdicional } = producto;
  const incluidos = cotizacion?.nivel.toppingsIncluidos ?? 0;
  const proximo = siguienteSuma(producto, toppings.length);
  const minimoIncluido = Math.min(...producto.niveles.map((n) => n.toppingsIncluidos));
  const chipToppings = maxToppings != null ? `Hasta ${maxToppings}` : minimoIncluido === 0 ? "Opcional" : `${minimoIncluido} incluidos`;
  const editando = modo === "editar";
  let paso = 0;

  function alternarTopping(idTopping: string) {
    setToppings((actuales) => (actuales.includes(idTopping) ? actuales.filter((t) => t !== idTopping) : [...actuales, idTopping]));
  }

  function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (modo === "ver" || !onConfirmar) return;
    if (errores.length > 0) {
      setMostrarErrores(true);
      const grupo = document.getElementById(idGrupo(errores[0].campo));
      grupo?.scrollIntoView({ block: "center", behavior: "smooth" });
      grupo?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus({ preventScroll: true });
      return;
    }
    onConfirmar(normalizarSeleccion(producto, seleccion), cantidad, nota);
  }

  const resumen = cotizacion
    ? [
        `${tituloLinea(producto, cotizacion)} ${pesos(cotizacion.nivel.precio)}`,
        cotizacion.adicionales > 0
          ? `${cotizacion.adicionales} ${plural(cotizacion.adicionales, "adicional", "adicionales")} × ${pesos(cotizacion.precioAdicional)}`
          : "",
        cotizacion.extras > 0 ? `recargos ${pesos(cotizacion.extras)}` : "",
      ]
        .filter(Boolean)
        .join(" + ")
    : "";

  return (
    <form onSubmit={confirmar} noValidate>
      <div>
        {/* Foto de fondo con el título encima; un recorte sin fondo (bebidas) va completo con el título
            debajo, y sin foto la cabecera es solo el título. */}
        <header className={`armar-cabecera ${!producto.imagen ? "armar-cabecera-sin-foto" : producto.imagen.transparente ? "armar-cabecera-recorte" : ""}`}>
          {producto.imagen ? <Foto imagen={producto.imagen} alt="" sizes="(min-width: 640px) 560px, 100vw" className="armar-cabecera-foto" /> : null}
          <button type="button" className="boton-cerrar armar-cerrar" onClick={onCerrar} aria-label={editando ? "Cerrar y volver al pedido" : "Cerrar"}>
            <IconoCerrar className="size-5" />
          </button>
          <h2 id={tituloId} className="armar-titulo">
            {editando ? "Editar: " : null}
            <NombreProducto nombre={producto.nombre} />
          </h2>
        </header>

        <div className="space-y-7 px-4 pb-8 sm:px-6">
          {producto.descripcion ? <p className="armar-descripcion">{producto.descripcion}</p> : null}
          <TablaPrecios producto={producto} compacta />

          {producto.grupos.map((grupo) => {
            const numero = ++paso;
            return (
              <fieldset key={grupo.id} id={idGrupo(grupo.id)} className="paso" aria-describedby={errorDe(grupo.id) ? `${id}-${grupo.id}` : undefined}>
                <legend className="paso-leyenda">
                  <span className="paso-numero" aria-hidden="true">
                    {numero}
                  </span>
                  <span className="paso-titulo">{grupo.titulo}</span>
                  <span className="paso-chip">Obligatorio</span>
                </legend>
                <div className={grupo.opciones.some((o) => o.imagen) ? "grid grid-cols-2 gap-3" : "flex flex-wrap gap-2"}>
                  {grupo.opciones.map((opcion) => (
                    <OpcionFoto
                      key={opcion.id}
                      tipo="radio"
                      nombreGrupo={`${id}-${grupo.id}`}
                      valor={opcion.id}
                      nombre={opcion.nombre}
                      imagen={opcion.imagen}
                      marcada={opciones[grupo.id] === opcion.id}
                      bloqueada={!opcion.disponible}
                      etiqueta={!opcion.disponible ? "Agotado" : opcion.precioExtra ? `+${pesos(opcion.precioExtra)}` : undefined}
                      onCambiar={() => setOpciones((actuales) => ({ ...actuales, [grupo.id]: opcion.id }))}
                    />
                  ))}
                </div>
                {errorDe(grupo.id) ? (
                  <p id={`${id}-${grupo.id}`} className="paso-error">
                    {errorDe(grupo.id)}
                  </p>
                ) : null}
              </fieldset>
            );
          })}

          {producto.toppings.length > 0 ? (
            <fieldset id={idGrupo("toppings")} className="paso" aria-describedby={`${id}-ayuda`}>
              <legend className="paso-leyenda">
                <span className="paso-numero" aria-hidden="true">
                  {++paso}
                </span>
                <span className="paso-titulo">Elige tus toppings</span>
                <span className="paso-chip">{chipToppings}</span>
              </legend>
              <p id={`${id}-ayuda`} className="paso-ayuda" aria-live="polite">
                {ayudaToppings(producto, toppings.length)}
              </p>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {producto.toppings.map((topping) => {
                  const orden = toppings.indexOf(topping.id);
                  const marcada = orden >= 0;
                  const lleno = maxToppings != null && toppings.length >= maxToppings;
                  let etiqueta: string | undefined;
                  if (!topping.disponible && !marcada) etiqueta = "Agotado";
                  else if (marcada) etiqueta = orden < incluidos ? "Incluido" : `+${pesos(precioToppingAdicional ?? 0)}`;
                  else if (!lleno && proximo) etiqueta = `+${pesos(proximo)}`;
                  return (
                    <OpcionFoto
                      key={topping.id}
                      tipo="checkbox"
                      nombreGrupo={`${id}-toppings`}
                      valor={topping.id}
                      nombre={topping.nombre}
                      imagen={topping.imagen}
                      marcada={marcada}
                      bloqueada={!marcada && (lleno || !topping.disponible)}
                      etiqueta={etiqueta}
                      etiquetaDestacada={marcada && orden < incluidos}
                      onCambiar={() => alternarTopping(topping.id)}
                    />
                  );
                })}
              </div>
              {errorDe("toppings") ? <p className="paso-error">{errorDe("toppings")}</p> : null}
            </fieldset>
          ) : null}

          {modo !== "ver" ? (
            <div className="campo">
              <label htmlFor={`${id}-nota`}>
                Indicaciones para la cocina <span className="campo-opcional">(opcional)</span>
              </label>
              <textarea
                id={`${id}-nota`}
                rows={2}
                maxLength={120}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej.: sin cebolla, bien asada"
              />
            </div>
          ) : null}
          {producto.nota ? <p className="nota-legal">{producto.nota}</p> : null}
        </div>
      </div>

      <footer className="hoja-pie">
        <p className="armar-resumen">{resumen}</p>
        {mostrarErrores && errores.length > 0 ? (
          <p className="armar-falta" role="alert">
            {errores.map((e) => e.mensaje).join(" ")}
          </p>
        ) : null}
        {modo === "ver" ? (
          <p className="armar-solo-ver">
            <strong>{pesos(cotizacion?.precio ?? 0)}</strong>
            <span>Para pedir, escanea el código QR de tu mesa.</span>
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <Cantidad valor={cantidad} onCambiar={setCantidad} etiqueta={`Cantidad de ${producto.nombre}`} />
            <button type="submit" className="boton-primario flex-1" disabled={producto.agotado}>
              {producto.agotado ? (
                <span>Agotado por hoy</span>
              ) : (
                <>
                  <span>
                    {editando ? "Guardar" : cantidad > 1 ? `Agregar ${cantidad}` : "Agregar"}
                    <span className="sr-only">{editando ? " cambios" : " al pedido"}</span>
                  </span>
                  <span className="boton-primario-precio">{pesos((cotizacion?.precio ?? 0) * cantidad)}</span>
                </>
              )}
            </button>
          </div>
        )}
      </footer>
    </form>
  );
}
