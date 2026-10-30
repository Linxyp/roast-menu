"use client";

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
}

export function AjustesNegocio({ inicial }: { inicial: Datos }) {
  const router = useRouter();
  const [datos, setDatos] = useState(inicial);
  const [metodos, setMetodos] = useState(inicial.metodosPago.join("\n"));
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
