"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { guardarAjustesNegocio } from "@/app/admin/acciones";

interface Datos {
  nombreNegocio: string;
  pieRecibo: string;
  anchoRecibo: 58 | 80;
  metodosPago: string[];
  recibiendoPedidos: boolean;
  direccion: string;
  horario: string;
  instagram: string;
  domiciliosActivos: boolean;
  costoDomicilio: number | null;
  costoDomicilioMaximo: number | null;
  pedidoMinimoDomicilio: number;
  zonaDomicilio: string;
  telefonoNegocio: string;
}

/** «4.000», «4000» o «$ 4.000» → 4000; vacío → null. */
function aPesos(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? Number(digitos) : null;
}

export function AjustesNegocio({ inicial }: { inicial: Datos }) {
  const router = useRouter();
  const [datos, setDatos] = useState(inicial);
  const [metodos, setMetodos] = useState(inicial.metodosPago.join("\n"));
  const [costo, setCosto] = useState(inicial.costoDomicilio === null ? "" : String(inicial.costoDomicilio));
  const [costoMaximo, setCostoMaximo] = useState(inicial.costoDomicilioMaximo === null ? "" : String(inicial.costoDomicilioMaximo));
  const [minimo, setMinimo] = useState(inicial.pedidoMinimoDomicilio ? String(inicial.pedidoMinimoDomicilio) : "");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const fijar = (cambios: Partial<Datos>) => setDatos((d) => ({ ...d, ...cambios }));

  return (
    <form
      className="caja formulario"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        const r = await guardarAjustesNegocio({
          ...datos,
          costoDomicilio: aPesos(costo),
          costoDomicilioMaximo: aPesos(costoMaximo),
          pedidoMinimoDomicilio: aPesos(minimo) ?? 0,
          metodosPago: metodos
            .split("\n")
            .map((m) => m.trim())
            .filter(Boolean),
        });
        setGuardando(false);
        setMensaje(r.ok ? { ok: true, texto: r.mensaje ?? "Guardado." } : { ok: false, texto: r.error });
        router.refresh();
      }}
    >
      <h2 className="panel-subtitulo">Negocio y pedidos</h2>
      <label className="interruptor">
        <input type="checkbox" checked={datos.recibiendoPedidos} onChange={(e) => fijar({ recibiendoPedidos: e.target.checked })} />
        Recibir pedidos desde el QR de las mesas (apágalo al cerrar: la carta se sigue viendo)
      </label>
      <div className="fila-campos">
        <div className="campo">
          <label htmlFor="a-nombre">Nombre del negocio (sale en los recibos)</label>
          <input id="a-nombre" type="text" maxLength={60} value={datos.nombreNegocio} onChange={(e) => fijar({ nombreNegocio: e.target.value })} required />
        </div>
        <div className="campo">
          <label htmlFor="a-instagram">
            Instagram <span className="campo-opcional">(sin @)</span>
          </label>
          <input id="a-instagram" type="text" maxLength={40} value={datos.instagram} onChange={(e) => fijar({ instagram: e.target.value })} />
        </div>
      </div>
      <div className="fila-campos">
        <div className="campo">
          <label htmlFor="a-direccion">
            Dirección <span className="campo-opcional">(sale al pie de la carta)</span>
          </label>
          <input id="a-direccion" type="text" maxLength={120} value={datos.direccion} onChange={(e) => fijar({ direccion: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="a-horario">
            Horario <span className="campo-opcional">(sale al pie de la carta)</span>
          </label>
          <input id="a-horario" type="text" maxLength={120} value={datos.horario} onChange={(e) => fijar({ horario: e.target.value })} />
        </div>
      </div>
      <div className="fila-campos">
        <fieldset className="campo">
          <legend>Papel de la impresora de recibos</legend>
          <div className="segmentos">
            {[80, 58].map((ancho) => (
              <label key={ancho}>
                <input type="radio" name="ancho" checked={datos.anchoRecibo === ancho} onChange={() => fijar({ anchoRecibo: ancho as 58 | 80 })} />
                {ancho} mm
              </label>
            ))}
          </div>
        </fieldset>
        <div className="campo">
          <label htmlFor="a-pie">Mensaje al final del recibo</label>
          <input id="a-pie" type="text" maxLength={120} value={datos.pieRecibo} onChange={(e) => fijar({ pieRecibo: e.target.value })} />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="a-metodos">
          Métodos de pago <span className="campo-opcional">(uno por línea)</span>
        </label>
        <textarea id="a-metodos" rows={4} value={metodos} onChange={(e) => setMetodos(e.target.value)} />
      </div>
      <fieldset className="grid gap-4 rounded-xl border border-oro-500/25 p-3">
        <legend className="px-1 font-semibold">Domicilios</legend>
        <label className="interruptor">
          <input type="checkbox" checked={datos.domiciliosActivos} onChange={(e) => fijar({ domiciliosActivos: e.target.checked })} />
          Recibir pedidos a domicilio desde su QR
        </label>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="a-costo-domicilio">
              Valor del domicilio <span className="campo-opcional">(vacío: se confirma en cada pedido; 0: gratis)</span>
            </label>
            <input id="a-costo-domicilio" type="text" inputMode="numeric" placeholder="Ej.: 8000" value={costo} onChange={(e) => setCosto(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="a-costo-domicilio-maximo">
              Hasta <span className="campo-opcional">(solo si cambia según la distancia: el valor se elige en cada pedido)</span>
            </label>
            <input
              id="a-costo-domicilio-maximo"
              type="text"
              inputMode="numeric"
              placeholder="Ej.: 10000"
              value={costoMaximo}
              onChange={(e) => setCostoMaximo(e.target.value)}
            />
          </div>
        </div>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="a-minimo-domicilio">
              Pedido mínimo <span className="campo-opcional">(vacío: sin mínimo; sin contar el domicilio)</span>
            </label>
            <input id="a-minimo-domicilio" type="text" inputMode="numeric" placeholder="Ej.: 25000" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="a-zona-domicilio">
              Hasta dónde llevan <span className="campo-opcional">(lo ve el cliente)</span>
            </label>
            <input
              id="a-zona-domicilio"
              type="text"
              maxLength={160}
              placeholder="Ej.: hasta 2 km del local"
              value={datos.zonaDomicilio}
              onChange={(e) => fijar({ zonaDomicilio: e.target.value })}
            />
          </div>
        </div>
        <div className="fila-campos">
          <div className="campo">
            <label htmlFor="a-telefono-negocio">
              Celular o WhatsApp del restaurante <span className="campo-opcional">(para dudas del cliente)</span>
            </label>
            <input
              id="a-telefono-negocio"
              type="tel"
              maxLength={30}
              value={datos.telefonoNegocio}
              onChange={(e) => fijar({ telefonoNegocio: e.target.value })}
            />
          </div>
        </div>
        <Link href="/admin/mesas/qr?domicilio=1" className="boton-texto justify-self-start px-0">
          Ver e imprimir el QR de domicilios
        </Link>
      </fieldset>
      {mensaje ? (
        <p className={mensaje.ok ? "mensaje-exito" : "mensaje-error"} role={mensaje.ok ? "status" : "alert"}>
          {mensaje.texto}
        </p>
      ) : null}
      <button type="submit" className="boton-panel boton-panel-principal justify-self-start" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar ajustes"}
      </button>
    </form>
  );
}
