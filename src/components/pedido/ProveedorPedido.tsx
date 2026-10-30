"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { detallarCarrito, lineasParaEnviar } from "@/lib/carrito";
import type { CartaDTO, MesaDTO } from "@/lib/carta";
import { pesos, plural } from "@/lib/formato";
import { NOMBRE_ESTADO, type EstadoPedido } from "@/lib/pedido";
import { cotizar, tituloLinea } from "@/lib/precios";
import { IconoBolsa, IconoFlecha, IconoReloj } from "../Iconos";
import { crearAlmacen, useAlmacen } from "./almacen";
import { ContenidoCarrito } from "./ContenidoCarrito";
import { Hoja } from "./Hoja";
import { consultarPedido, MisPedidos } from "./MisPedidos";
import { Personalizador } from "./Personalizador";

type HojaAbierta = { tipo: "producto"; productoId: string; lineaId?: string } | { tipo: "carrito" } | { tipo: "pedidos" } | null;

interface ContextoPedido {
  abrirProducto: (productoId: string) => void;
  /** Hay mesa: se puede pedir. Sin mesa la carta es solo de consulta. */
  conMesa: boolean;
}

const Contexto = createContext<ContextoPedido | null>(null);

export function usePedido(): ContextoPedido {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("usePedido debe usarse dentro de <ProveedorPedido>");
  return contexto;
}

const CLAVE_NOMBRE = "roast:nombre";

function nombreGuardado(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CLAVE_NOMBRE) ?? "";
  } catch {
    return "";
  }
}

interface Props {
  carta: CartaDTO;
  mesa: MesaDTO | null;
  children: ReactNode;
}

export function ProveedorPedido({ carta, mesa, children }: Props) {
  const productos = useMemo(() => new Map(carta.categorias.flatMap((c) => c.productos).map((p) => [p.id, p])), [carta]);
  const almacen = useMemo(() => crearAlmacen(mesa?.codigo ?? "general", productos), [mesa, productos]);
  const { lineas, pedidos } = useAlmacen(almacen);
  const detalle = useMemo(() => detallarCarrito(lineas, productos), [lineas, productos]);

  const [hoja, setHoja] = useState<HojaAbierta>(null);
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);
  // El formulario solo se pinta con la hoja abierta: leer aquí el nombre guardado no cambia el HTML inicial.
  const [cliente, setCliente] = useState(nombreGuardado);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoEstado, setUltimoEstado] = useState<EstadoPedido | null>(null);
  const origenFoco = useRef<HTMLElement | null>(null);
  const hojaActual = useRef<HojaAbierta>(null);

  useEffect(() => {
    if (mesa) almacen.cargar();
  }, [almacen, mesa]);

  useEffect(() => {
    hojaActual.current = hoja;
  }, [hoja]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 3200);
    return () => window.clearTimeout(t);
  }, [aviso]);

  // Estado del último pedido enviado, para mostrarlo en la barra inferior.
  const ultimo = pedidos[0];
  useEffect(() => {
    if (!mesa || !ultimo) return;
    let vigente = true;
    const actualizar = async () => {
      const pedido = await consultarPedido(mesa.codigo, ultimo.id);
      if (vigente) setUltimoEstado(pedido ? pedido.estado : null);
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 15000);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, [mesa, ultimo]);

  const abrir = useCallback((nueva: Exclude<HojaAbierta, null>) => {
    if (!hojaActual.current && document.activeElement instanceof HTMLElement) origenFoco.current = document.activeElement;
    setHoja(nueva);
  }, []);

  const cerrar = useCallback(() => {
    setHoja(null);
    const destino = origenFoco.current;
    origenFoco.current = null;
    if (destino?.isConnected) requestAnimationFrame(() => destino.focus());
  }, []);

  const avisar = useCallback((texto: string) => {
    // Espera a que la hoja se cierre: lo que queda detrás de un <dialog> abierto no se anuncia.
    window.setTimeout(() => setAviso({ texto, id: Date.now() }), 80);
  }, []);

  const contexto = useMemo<ContextoPedido>(
    () => ({ abrirProducto: (productoId) => abrir({ tipo: "producto", productoId }), conMesa: mesa !== null }),
    [abrir, mesa],
  );

  function cambiarCliente(valor: string) {
    setCliente(valor);
    try {
      localStorage.setItem(CLAVE_NOMBRE, valor.trim());
    } catch {
      // sin almacenamiento
    }
  }

  async function enviar() {
    if (!mesa || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/m/${mesa.codigo}/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente: cliente.trim(), nota: nota.trim() || undefined, items: lineasParaEnviar(lineas) }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { id?: string; numero?: number; total?: number; error?: string };
      if (!respuesta.ok || !datos.id || datos.numero == null || datos.total == null) {
        setError(datos.error ?? "No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.");
        return;
      }
      almacen.registrarPedido({ id: datos.id, numero: datos.numero, total: datos.total });
      almacen.vaciar();
      setNota("");
      setUltimoEstado("NUEVO");
      setHoja({ tipo: "pedidos" });
    } catch {
      setError("No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const producto = hoja?.tipo === "producto" ? productos.get(hoja.productoId) : undefined;
  const lineaEditada = hoja?.tipo === "producto" && hoja.lineaId ? lineas.find((l) => l.id === hoja.lineaId) : undefined;
  const volverAlCarrito = () => setHoja({ tipo: "carrito" });

  return (
    <Contexto.Provider value={contexto}>
      {children}

      {mesa ? (
        <div className="barra-pedido">
          {detalle.unidades > 0 ? (
            <button
              type="button"
              className="barra-pedido-boton"
              onClick={() => abrir({ tipo: "carrito" })}
              aria-haspopup="dialog"
              aria-label={`Ver pedido: ${detalle.unidades} ${plural(detalle.unidades, "producto", "productos")}, total ${pesos(detalle.total)}`}
            >
              <span className="barra-pedido-icono" aria-hidden="true">
                <IconoBolsa className="size-6" />
                <span className="barra-pedido-contador">{detalle.unidades}</span>
              </span>
              <span className="barra-pedido-texto" aria-hidden="true">
                Ver pedido
              </span>
              <span className="barra-pedido-total" aria-hidden="true">
                {pesos(detalle.total)}
                <IconoFlecha className="size-5" />
              </span>
            </button>
          ) : ultimo ? (
            <button type="button" className="barra-seguimiento" onClick={() => abrir({ tipo: "pedidos" })} aria-haspopup="dialog">
              <IconoReloj className="size-5" />
              <span>
                Pedido #{ultimo.numero}
                {ultimoEstado ? ` · ${NOMBRE_ESTADO[ultimoEstado]}` : ""}
              </span>
              <span className="barra-seguimiento-ver">Ver</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <Hoja
        abierta={producto !== undefined}
        onCerrar={lineaEditada ? volverAlCarrito : cerrar}
        etiquetaId="titulo-producto"
      >
        {producto ? (
          <Personalizador
            key={lineaEditada?.id ?? producto.id}
            producto={producto}
            modo={!mesa ? "ver" : lineaEditada ? "editar" : "agregar"}
            inicial={lineaEditada ? { seleccion: lineaEditada.seleccion, cantidad: lineaEditada.cantidad, nota: lineaEditada.nota } : undefined}
            tituloId="titulo-producto"
            onCerrar={lineaEditada ? volverAlCarrito : cerrar}
            onConfirmar={(seleccion, cantidad, notaLinea) => {
              if (lineaEditada) {
                almacen.reemplazar(lineaEditada.id, seleccion, cantidad, notaLinea);
                volverAlCarrito();
                return;
              }
              almacen.agregar(producto.id, seleccion, cantidad, notaLinea);
              cerrar();
              const cotizacion = cotizar(producto, seleccion);
              const nombre = cotizacion ? tituloLinea(producto, cotizacion) : producto.nombre;
              avisar(`Agregado al pedido: ${cantidad > 1 ? `${cantidad} × ` : ""}${nombre}`);
            }}
          />
        ) : null}
      </Hoja>

      {mesa ? (
        <>
          <Hoja abierta={hoja?.tipo === "carrito"} onCerrar={cerrar} etiquetaId="titulo-carrito">
            <ContenidoCarrito
              mesa={mesa}
              detalle={detalle}
              cliente={cliente}
              nota={nota}
              onCliente={cambiarCliente}
              onNota={setNota}
              onCantidad={almacen.cambiarCantidad}
              onQuitar={almacen.quitar}
              onEditar={(lineaId, productoId) => setHoja({ tipo: "producto", productoId, lineaId })}
              onVaciar={almacen.vaciar}
              onEnviar={enviar}
              onCerrar={cerrar}
              enviando={enviando}
              error={error}
              recibiendo={carta.negocio.recibiendoPedidos}
            />
          </Hoja>
          <Hoja abierta={hoja?.tipo === "pedidos"} onCerrar={cerrar} etiquetaId="titulo-mis-pedidos">
            <MisPedidos mesa={mesa} pedidos={pedidos} onCerrar={cerrar} onPedirMas={cerrar} />
          </Hoja>
        </>
      ) : null}

      <div className="aviso-zona" role="status" aria-live="polite">
        {aviso ? (
          <p key={aviso.id} className="aviso">
            {aviso.texto}
          </p>
        ) : null}
      </div>
    </Contexto.Provider>
  );
}
