"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { detallarCarrito, lineasParaEnviar } from "@/lib/carrito";
import type { CartaDTO, DestinoPedido } from "@/lib/carta";
import { pesos, plural } from "@/lib/formato";
import { esEfectivo, NOMBRE_ESTADO, type EstadoPedido } from "@/lib/pedido";
import { cotizar, tituloLinea } from "@/lib/precios";
import { IconoBolsa, IconoFlecha, IconoReloj } from "../Iconos";
import { crearAlmacen, useAlmacen } from "./almacen";
import { ContenidoCarrito, type Entrega } from "./ContenidoCarrito";
import { Hoja } from "./Hoja";
import { consultarPedido, MisPedidos, nombrePaso, rutaPedidos } from "./MisPedidos";
import { Personalizador } from "./Personalizador";

type HojaAbierta = { tipo: "producto"; productoId: string; lineaId?: string } | { tipo: "carrito" } | { tipo: "pedidos" } | null;

interface ContextoPedido {
  abrirProducto: (productoId: string) => void;
  /** Desde la mesa o desde la página de domicilios se pide; en la carta general solo se consulta. */
  puedePedir: boolean;
}

const Contexto = createContext<ContextoPedido | null>(null);

export function usePedido(): ContextoPedido {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("usePedido debe usarse dentro de <ProveedorPedido>");
  return contexto;
}

const CLAVE_NOMBRE = "roast:nombre";
const CLAVE_ENTREGA = "roast:entrega";
const ENTREGA_VACIA: Entrega = { telefono: "", direccion: "", barrio: "", referencia: "", pago: "", pagaCon: "" };

function nombreGuardado(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CLAVE_NOMBRE) ?? "";
  } catch {
    return "";
  }
}

/** Datos de entrega del último domicilio (el cliente no los vuelve a escribir). */
function entregaGuardada(): Entrega {
  if (typeof window === "undefined") return ENTREGA_VACIA;
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_ENTREGA) ?? "null") as Partial<Record<keyof Entrega, unknown>> | null;
    if (!guardada || typeof guardada !== "object") return ENTREGA_VACIA;
    const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");
    return {
      ...ENTREGA_VACIA,
      telefono: texto(guardada.telefono),
      direccion: texto(guardada.direccion),
      barrio: texto(guardada.barrio),
      referencia: texto(guardada.referencia),
      pago: texto(guardada.pago),
    };
  } catch {
    return ENTREGA_VACIA;
  }
}

interface Props {
  carta: CartaDTO;
  /** null = carta general, solo de consulta. */
  destino: DestinoPedido | null;
  children: ReactNode;
}

export function ProveedorPedido({ carta, destino, children }: Props) {
  const productos = useMemo(() => new Map(carta.categorias.flatMap((c) => c.productos).map((p) => [p.id, p])), [carta]);
  // Cada mesa tiene su carrito; los domicilios, el suyo.
  const clave = destino?.tipo === "mesa" ? destino.mesa.codigo : (destino?.tipo ?? "general");
  const almacen = useMemo(() => crearAlmacen(clave, productos), [clave, productos]);
  const { lineas, pedidos } = useAlmacen(almacen);
  const detalle = useMemo(() => detallarCarrito(lineas, productos), [lineas, productos]);
  const ruta = destino ? rutaPedidos(destino) : null;

  const [hoja, setHoja] = useState<HojaAbierta>(null);
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);
  // Los formularios solo se pintan con la hoja abierta: leer aquí lo guardado no cambia el HTML inicial.
  const [cliente, setCliente] = useState(nombreGuardado);
  const [entrega, setEntrega] = useState(entregaGuardada);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoEstado, setUltimoEstado] = useState<EstadoPedido | null>(null);
  const origenFoco = useRef<HTMLElement | null>(null);
  const hojaActual = useRef<HojaAbierta>(null);

  useEffect(() => {
    if (ruta) almacen.cargar();
  }, [almacen, ruta]);

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
    if (!ruta || !ultimo) return;
    let vigente = true;
    const actualizar = async () => {
      const pedido = await consultarPedido(ruta, ultimo.id);
      if (vigente) setUltimoEstado(pedido ? pedido.estado : null);
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 15000);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
    };
  }, [ruta, ultimo]);

  const abrir = useCallback((nueva: Exclude<HojaAbierta, null>) => {
    if (!hojaActual.current && document.activeElement instanceof HTMLElement) origenFoco.current = document.activeElement;
    setHoja(nueva);
  }, []);

  const cerrar = useCallback(() => {
    setHoja(null);
    const destinoFoco = origenFoco.current;
    origenFoco.current = null;
    if (destinoFoco?.isConnected) requestAnimationFrame(() => destinoFoco.focus());
  }, []);

  // Ya cargó: si alguien tocó un producto antes (ver ToquesTempranos), se abre ahora.
  useEffect(() => {
    const ventana = window as typeof window & { __roastListo?: boolean; __roastPendiente?: string };
    ventana.__roastListo = true;
    const pendiente = ventana.__roastPendiente;
    delete ventana.__roastPendiente;
    document.querySelectorAll("[data-producto][aria-busy]").forEach((boton) => boton.removeAttribute("aria-busy"));
    if (pendiente) requestAnimationFrame(() => abrir({ tipo: "producto", productoId: pendiente }));
  }, [abrir]);

  const avisar = useCallback((texto: string) => {
    // Espera a que la hoja se cierre: lo que queda detrás de un <dialog> abierto no se anuncia.
    window.setTimeout(() => setAviso({ texto, id: Date.now() }), 80);
  }, []);

  const contexto = useMemo<ContextoPedido>(
    () => ({ abrirProducto: (productoId) => abrir({ tipo: "producto", productoId }), puedePedir: ruta !== null }),
    [abrir, ruta],
  );

  function cambiarCliente(valor: string) {
    setCliente(valor);
    try {
      localStorage.setItem(CLAVE_NOMBRE, valor.trim());
    } catch {
      // sin almacenamiento
    }
  }

  function cambiarEntrega(cambios: Partial<Entrega>) {
    setEntrega((actual) => {
      const nueva = { ...actual, ...cambios };
      try {
        // Con cuánto paga cambia en cada pedido: no se guarda.
        localStorage.setItem(CLAVE_ENTREGA, JSON.stringify({ ...nueva, pagaCon: "" }));
      } catch {
        // sin almacenamiento
      }
      return nueva;
    });
  }

  async function enviar() {
    if (!destino || !ruta || enviando) return;
    setEnviando(true);
    setError(null);
    const base = { cliente: cliente.trim(), nota: nota.trim() || undefined, items: lineasParaEnviar(lineas) };
    const pagaCon = Number(entrega.pagaCon.replace(/\D/g, ""));
    const cuerpo =
      destino.tipo === "mesa"
        ? base
        : {
            ...base,
            telefono: entrega.telefono,
            direccion: entrega.direccion.trim(),
            barrio: entrega.barrio.trim(),
            referencia: entrega.referencia.trim() || undefined,
            pago: entrega.pago,
            pagaCon: esEfectivo(entrega.pago) && pagaCon > 0 ? pagaCon : undefined,
          };
    try {
      const respuesta = await fetch(ruta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { id?: string; numero?: number; total?: number; error?: string };
      if (!respuesta.ok || !datos.id || datos.numero == null || datos.total == null) {
        setError(datos.error ?? "No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.");
        return;
      }
      almacen.registrarPedido({ id: datos.id, numero: datos.numero, total: datos.total });
      almacen.vaciar();
      setNota("");
      if (destino.tipo === "domicilio") cambiarEntrega({ pagaCon: "" });
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
  const recibiendo = destino?.tipo === "domicilio" ? destino.domicilio.activo : carta.negocio.recibiendoPedidos;

  return (
    <Contexto.Provider value={contexto}>
      {children}

      {destino ? (
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
                {ultimoEstado ? ` · ${destino.tipo === "domicilio" ? nombrePaso(ultimoEstado, true) : NOMBRE_ESTADO[ultimoEstado]}` : ""}
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
            modo={!destino ? "ver" : lineaEditada ? "editar" : "agregar"}
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

      {destino ? (
        <>
          <Hoja abierta={hoja?.tipo === "carrito"} onCerrar={cerrar} etiquetaId="titulo-carrito">
            <ContenidoCarrito
              destino={destino}
              detalle={detalle}
              cliente={cliente}
              entrega={entrega}
              nota={nota}
              onCliente={cambiarCliente}
              onEntrega={cambiarEntrega}
              onNota={setNota}
              onCantidad={almacen.cambiarCantidad}
              onQuitar={almacen.quitar}
              onEditar={(lineaId, productoId) => setHoja({ tipo: "producto", productoId, lineaId })}
              onVaciar={almacen.vaciar}
              onEnviar={enviar}
              onCerrar={cerrar}
              enviando={enviando}
              error={error}
              recibiendo={recibiendo}
            />
          </Hoja>
          <Hoja abierta={hoja?.tipo === "pedidos"} onCerrar={cerrar} etiquetaId="titulo-mis-pedidos">
            <MisPedidos destino={destino} pedidos={pedidos} onCerrar={cerrar} onPedirMas={cerrar} />
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
