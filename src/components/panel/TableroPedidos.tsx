"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cambiarEstadoPedido, cambiarRecepcionPedidos, cobrarPedidos, marcarImpreso } from "@/app/admin/acciones";
import { pesos } from "@/lib/formato";
import type { EstadoPedido, PedidoDTO } from "@/lib/pedido";
import { DialogoCobro, DialogoConfirmar } from "./Dialogos";
import { useVivo } from "./PanelVivo";
import { TarjetaPedido } from "./TarjetaPedido";

export interface DatosTablero {
  pedidos: PedidoDTO[];
  metodosPago: string[];
  recibiendoPedidos: boolean;
}

const COLUMNAS: { clave: string; titulo: string; incluye: (p: PedidoDTO) => boolean; vacio: string }[] = [
  { clave: "nuevos", titulo: "Nuevos", incluye: (p) => p.estado === "NUEVO", vacio: "Sin pedidos nuevos." },
  { clave: "preparando", titulo: "En preparación", incluye: (p) => p.estado === "PREPARANDO", vacio: "Nada en preparación." },
  { clave: "listos", titulo: "Listos", incluye: (p) => p.estado === "LISTO", vacio: "Nada listo por entregar." },
  { clave: "cobrar", titulo: "Entregados por cobrar", incluye: (p) => p.estado === "ENTREGADO", vacio: "Nada pendiente por cobrar." },
];

async function traerTablero(): Promise<DatosTablero | "sin-sesion" | null> {
  try {
    const respuesta = await fetch("/api/admin/pedidos", { cache: "no-store" });
    if (respuesta.status === 401) return "sin-sesion";
    return respuesta.ok ? ((await respuesta.json()) as DatosTablero) : null;
  } catch {
    return null; // sin conexión: se reintenta con el próximo aviso o en 20 s
  }
}

export function TableroPedidos({ inicial }: { inicial: DatosTablero }) {
  const vivo = useVivo();
  const router = useRouter();
  const [datos, setDatos] = useState(inicial);
  const [pestana, setPestana] = useState("nuevos");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState<PedidoDTO | null>(null);
  const [cancelando, setCancelando] = useState<PedidoDTO | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const aplicar = useCallback(
    (resultado: DatosTablero | "sin-sesion" | null) => {
      if (resultado === "sin-sesion") router.push("/admin/ingresar?siguiente=/admin");
      else if (resultado) setDatos(resultado);
    },
    [router],
  );

  const recargar = useCallback(async () => aplicar(await traerTablero()), [aplicar]);

  // Cada aviso en vivo (pedido nuevo o cambio de estado) vuelve a traer el tablero.
  useEffect(() => {
    let vigente = true;
    void traerTablero().then((resultado) => {
      if (vigente) aplicar(resultado);
    });
    return () => {
      vigente = false;
    };
  }, [vivo.version, aplicar]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
      void recargar();
    }, 20_000);
    return () => window.clearInterval(intervalo);
  }, [recargar]);

  async function ejecutar(id: string, tarea: () => Promise<{ ok: boolean; error?: string }>) {
    setOcupado(id);
    setError(null);
    const resultado = await tarea();
    setOcupado(null);
    if (!resultado.ok) setError(resultado.error ?? "No se pudo completar.");
    await recargar();
    return resultado.ok ? null : (resultado.error ?? "No se pudo completar.");
  }

  function imprimir(pedido: PedidoDTO) {
    vivo.imprimir(`/admin/imprimir/pedido/${pedido.id}`);
    void marcarImpreso(pedido.id).then(recargar);
  }

  const porColumna = COLUMNAS.map((columna) => ({ ...columna, pedidos: datos.pedidos.filter(columna.incluye) }));
  const porCobrar = datos.pedidos.filter((p) => !p.pagadoEn).reduce((suma, p) => suma + p.total, 0);

  return (
    <div>
      <div className="panel-cabecera">
        <div>
          <h1 className="panel-titulo">Pedidos</h1>
          <p className="panel-texto-suave mt-1">
            <span className="indicador-vivo" data-conectado={vivo.conectado}>
              {vivo.conectado ? "En vivo" : "Reconectando…"}
            </span>
            {" · "}
            {datos.pedidos.length} abiertos · por cobrar {pesos(porCobrar)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <label className="interruptor">
            <input
              type="checkbox"
              checked={datos.recibiendoPedidos}
              onChange={async (e) => {
                const activo = e.target.checked;
                setDatos((d) => ({ ...d, recibiendoPedidos: activo }));
                await cambiarRecepcionPedidos(activo);
                await recargar();
              }}
            />
            Recibir pedidos por QR
          </label>
          <label className="interruptor">
            <input type="checkbox" checked={vivo.sonido} onChange={(e) => vivo.cambiarSonido(e.target.checked)} />
            Sonido
          </label>
          <label className="interruptor">
            <input type="checkbox" checked={vivo.autoImprimir} onChange={(e) => vivo.cambiarAutoImprimir(e.target.checked)} />
            Imprimir comandas solas
          </label>
        </div>
      </div>

      {!datos.recibiendoPedidos ? (
        <p className="mensaje-error mb-4" role="status">
          Los pedidos por QR están en pausa: los clientes ven la carta pero no pueden enviar pedidos.
        </p>
      ) : null}
      {error ? (
        <p className="mensaje-error mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pestanas" role="tablist" aria-label="Columnas del tablero">
        {porColumna.map((columna) => (
          <button
            key={columna.clave}
            type="button"
            role="tab"
            aria-selected={pestana === columna.clave}
            className="pestana"
            onClick={() => setPestana(columna.clave)}
          >
            {columna.titulo}
            <span className="pestana-contador">{columna.pedidos.length}</span>
          </button>
        ))}
      </div>

      <div className="tablero">
        {porColumna.map((columna) => (
          <section
            key={columna.clave}
            className={`tablero-columna ${pestana === columna.clave ? "" : "max-[1099px]:hidden"}`}
            aria-labelledby={`columna-${columna.clave}`}
          >
            <h2 id={`columna-${columna.clave}`} className="tablero-columna-titulo">
              {columna.titulo}
              <span className="pestana-contador">{columna.pedidos.length}</span>
            </h2>
            {columna.pedidos.length === 0 ? <p className="tablero-vacio">{columna.vacio}</p> : null}
            {columna.pedidos.map((pedido) => (
              <TarjetaPedido
                key={pedido.id}
                pedido={pedido}
                ahora={ahora}
                reciente={vivo.recientes.has(pedido.id)}
                ocupado={ocupado === pedido.id}
                onEstado={(destino: EstadoPedido) => void ejecutar(pedido.id, () => cambiarEstadoPedido(pedido.id, destino))}
                onCobrar={() => setCobrando(pedido)}
                onCancelar={() => setCancelando(pedido)}
                onImprimir={() => imprimir(pedido)}
              />
            ))}
          </section>
        ))}
      </div>

      <DialogoCobro
        abierto={cobrando !== null}
        titulo={cobrando ? `Cobrar pedido #${cobrando.numero} · Mesa ${cobrando.mesaNumero}` : "Cobrar"}
        total={cobrando?.total ?? 0}
        metodos={datos.metodosPago}
        onCerrar={() => setCobrando(null)}
        onConfirmar={async (metodo) => {
          if (!cobrando) return null;
          const problema = await ejecutar(cobrando.id, () => cobrarPedidos([cobrando.id], metodo));
          if (!problema) setCobrando(null);
          return problema;
        }}
      />
      <DialogoConfirmar
        abierto={cancelando !== null}
        titulo={cancelando ? `¿Cancelar el pedido #${cancelando.numero}?` : "Cancelar pedido"}
        mensaje={
          cancelando?.pagadoEn
            ? "Este pedido ya está cobrado: cancelarlo lo saca de las ventas (devuelve el dinero al cliente)."
            : "El pedido sale del tablero y no cuenta en las ventas. Se puede reactivar desde la mesa."
        }
        textoConfirmar="Sí, cancelar pedido"
        peligroso
        onCerrar={() => setCancelando(null)}
        onConfirmar={async () => {
          if (!cancelando) return null;
          const problema = await ejecutar(cancelando.id, () => cambiarEstadoPedido(cancelando.id, "CANCELADO"));
          if (!problema) setCancelando(null);
          return problema;
        }}
      />
    </div>
  );
}
