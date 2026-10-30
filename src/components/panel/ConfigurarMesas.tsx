"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { actualizarMesa, agregarMesas, cambiarCodigoMesa, eliminarMesa } from "@/app/admin/acciones";
import type { MesaResumen } from "@/server/mesas";
import { IconoQR } from "../Iconos";
import { DialogoConfirmar } from "./Dialogos";
import { InterruptorServidor } from "./InterruptorServidor";

type MesaConUrl = MesaResumen & { url: string };

export function ConfigurarMesas({ mesas }: { mesas: MesaConUrl[] }) {
  const router = useRouter();
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cambiandoCodigo, setCambiandoCodigo] = useState<MesaConUrl | null>(null);
  const [eliminando, setEliminando] = useState<MesaConUrl | null>(null);

  async function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string; mensaje?: string }>, exito?: string) {
    const r = await tarea();
    router.refresh();
    setMensaje(r.ok ? (exito || r.mensaje ? { ok: true, texto: exito ?? r.mensaje ?? "" } : null) : { ok: false, texto: r.error ?? "No se pudo." });
    return r.ok ? null : (r.error ?? "No se pudo.");
  }

  return (
    <div className="grid gap-6">
      <div className="panel-cabecera mb-0">
        <div>
          <h1 className="panel-titulo">Configurar mesas</h1>
          <p className="panel-texto-suave mt-1">
            {mesas.filter((m) => m.activa).length} activas. Cada mesa tiene su propio código QR: el pedido llega marcado con su número.
          </p>
        </div>
        <Link href="/admin/mesas/qr" className="boton-panel boton-panel-principal">
          <IconoQR className="size-4" /> Imprimir todos los QR
        </Link>
      </div>

      <form
        className="caja flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await ejecutar(() => agregarMesas(cantidad), `${cantidad === 1 ? "Se agregó 1 mesa" : `Se agregaron ${cantidad} mesas`}. Imprime su QR.`);
        }}
      >
        <div className="campo w-32">
          <label htmlFor="cantidad-mesas">Agregar mesas</label>
          <input id="cantidad-mesas" type="number" min={1} max={50} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
        </div>
        <button type="submit" className="boton-panel boton-panel-principal">
          Agregar
        </button>
      </form>

      {mensaje ? (
        <p className={mensaje.ok ? "mensaje-exito" : "mensaje-error"} role={mensaje.ok ? "status" : "alert"}>
          {mensaje.texto}
        </p>
      ) : null}

      <div className="lista-filas">
        {mesas.map((mesa) => (
          <FilaMesa
            key={`${mesa.id}-${mesa.numero}-${mesa.nombre}-${mesa.activa}`}
            mesa={mesa}
            onGuardar={(cambios) => ejecutar(() => actualizarMesa(mesa.id, cambios), "Mesa actualizada.")}
            onCambiarCodigo={() => setCambiandoCodigo(mesa)}
            onEliminar={() => setEliminando(mesa)}
          />
        ))}
      </div>

      <DialogoConfirmar
        abierto={cambiandoCodigo !== null}
        titulo={`¿Código nuevo para la mesa ${cambiandoCodigo?.numero ?? ""}?`}
        mensaje="El QR impreso que tiene ahora esa mesa dejará de funcionar y tendrás que imprimir el nuevo. Úsalo si el QR se dañó o se copió."
        textoConfirmar="Cambiar código"
        onCerrar={() => setCambiandoCodigo(null)}
        onConfirmar={async () => {
          if (!cambiandoCodigo) return null;
          const problema = await ejecutar(() => cambiarCodigoMesa(cambiandoCodigo.id));
          if (!problema) setCambiandoCodigo(null);
          return problema;
        }}
      />
      <DialogoConfirmar
        abierto={eliminando !== null}
        titulo={`¿Quitar la mesa ${eliminando?.numero ?? ""}?`}
        mensaje="Si la mesa ya tiene pedidos en el historial, solo se desactiva (sus ventas se conservan) y su QR deja de recibir pedidos."
        textoConfirmar="Quitar mesa"
        peligroso
        onCerrar={() => setEliminando(null)}
        onConfirmar={async () => {
          if (!eliminando) return null;
          const problema = await ejecutar(() => eliminarMesa(eliminando.id));
          if (!problema) setEliminando(null);
          return problema;
        }}
      />
    </div>
  );
}

function FilaMesa({
  mesa,
  onGuardar,
  onCambiarCodigo,
  onEliminar,
}: {
  mesa: MesaConUrl;
  onGuardar: (cambios: { numero?: number; nombre?: string | null; activa?: boolean }) => Promise<string | null>;
  onCambiarCodigo: () => void;
  onEliminar: () => void;
}) {
  const [numero, setNumero] = useState(mesa.numero);
  const [nombre, setNombre] = useState(mesa.nombre ?? "");
  const cambio = numero !== mesa.numero || nombre !== (mesa.nombre ?? "");
  return (
    <div className="fila" data-inactiva={!mesa.activa || undefined}>
      <div className="campo w-24">
        <label htmlFor={`numero-${mesa.id}`}>Número</label>
        <input id={`numero-${mesa.id}`} type="number" min={1} max={999} value={numero} onChange={(e) => setNumero(Number(e.target.value))} />
      </div>
      <div className="campo fila-principal">
        <label htmlFor={`nombre-${mesa.id}`}>
          Nombre <span className="campo-opcional">(opcional, p. ej. «Terraza»)</span>
        </label>
        <input id={`nombre-${mesa.id}`} type="text" maxLength={30} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2 self-end">
        {cambio ? (
          <button type="button" className="boton-panel boton-panel-principal" onClick={() => void onGuardar({ numero, nombre })}>
            Guardar
          </button>
        ) : null}
        <InterruptorServidor activo={mesa.activa} onCambiar={(activa) => onGuardar({ activa })}>
          Activa
        </InterruptorServidor>
        <Link href={`/admin/mesas/qr?mesa=${mesa.id}`} className="boton-panel">
          <IconoQR className="size-4" /> QR
        </Link>
        <button type="button" className="boton-panel" onClick={onCambiarCodigo}>
          Cambiar código
        </button>
        <button type="button" className="boton-panel boton-panel-peligro" onClick={onEliminar} aria-label={`Quitar mesa ${mesa.numero}`}>
          Quitar
        </button>
      </div>
      <p className="w-full truncate text-xs text-crema/55" title={mesa.url}>
        {mesa.url}
      </p>
    </div>
  );
}
