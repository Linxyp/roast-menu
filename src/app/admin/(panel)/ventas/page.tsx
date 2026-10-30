import Link from "next/link";
import { diaColombia, hora, fechaCorta, pesos } from "@/lib/formato";
import { requerirPagina } from "@/server/auth/acceso";
import { resumenVentas } from "@/server/ventas";

export const metadata = { title: "Ventas" };

const esDia = (valor: string | undefined): valor is string => Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));

function sumarDias(dia: string, dias: number): string {
  const fecha = new Date(`${dia}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export default async function PaginaVentas({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  await requerirPagina();
  const parametros = await searchParams;
  const hoy = diaColombia();
  const hasta = esDia(parametros.hasta) ? parametros.hasta : hoy;
  const desde = esDia(parametros.desde) && parametros.desde <= hasta ? parametros.desde : hasta;
  const resumen = await resumenVentas(desde, hasta);
  const rangos = [
    { nombre: "Hoy", desde: hoy, hasta: hoy },
    { nombre: "Ayer", desde: sumarDias(hoy, -1), hasta: sumarDias(hoy, -1) },
    { nombre: "Últimos 7 días", desde: sumarDias(hoy, -6), hasta: hoy },
    { nombre: "Este mes", desde: `${hoy.slice(0, 8)}01`, hasta: hoy },
  ];
  const etiquetaRango = desde === hasta ? fechaCorta(`${desde}T12:00:00Z`) : `${fechaCorta(`${desde}T12:00:00Z`)} a ${fechaCorta(`${hasta}T12:00:00Z`)}`;

  return (
    <div className="grid gap-6">
      <div className="panel-cabecera mb-0">
        <div>
          <h1 className="panel-titulo">Ventas</h1>
          <p className="panel-texto-suave mt-1">Pedidos cobrados · {etiquetaRango}</p>
        </div>
        <a href={`/api/admin/ventas?desde=${desde}&hasta=${hasta}`} className="boton-panel" download>
          Descargar CSV (Excel)
        </a>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label="Rangos rápidos" className="flex flex-wrap gap-2">
          {rangos.map((r) => (
            <Link
              key={r.nombre}
              href={`/admin/ventas?desde=${r.desde}&hasta=${r.hasta}`}
              className="pestana"
              aria-current={r.desde === desde && r.hasta === hasta ? "page" : undefined}
            >
              {r.nombre}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2" action="/admin/ventas">
          <div className="campo">
            <label htmlFor="desde">Desde</label>
            <input id="desde" name="desde" type="date" defaultValue={desde} max={hoy} />
          </div>
          <div className="campo">
            <label htmlFor="hasta">Hasta</label>
            <input id="hasta" name="hasta" type="date" defaultValue={hasta} max={hoy} />
          </div>
          <button type="submit" className="boton-panel boton-panel-principal">
            Ver
          </button>
        </form>
      </div>

      <dl className="kpis">
        <div className="kpi">
          <dt>Total vendido</dt>
          <dd>{pesos(resumen.total)}</dd>
        </div>
        <div className="kpi">
          <dt>Pedidos cobrados</dt>
          <dd>{resumen.pedidos}</dd>
        </div>
        <div className="kpi">
          <dt>Promedio por pedido</dt>
          <dd>{pesos(resumen.promedio)}</dd>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="caja" aria-labelledby="t-metodos">
          <h2 id="t-metodos" className="panel-subtitulo mb-3">
            Por método de pago
          </h2>
          <Tabla filas={resumen.porMetodo.map((m) => [m.metodo, String(m.pedidos), pesos(m.total)])} columnas={["Método", "Pedidos", "Total"]} />
        </section>
        <section className="caja" aria-labelledby="t-productos">
          <h2 id="t-productos" className="panel-subtitulo mb-3">
            Más vendidos
          </h2>
          <Tabla filas={resumen.porProducto.slice(0, 12).map((p) => [p.nombre, String(p.unidades), pesos(p.total)])} columnas={["Producto", "Unid.", "Total"]} />
        </section>
        <section className="caja" aria-labelledby="t-mesas">
          <h2 id="t-mesas" className="panel-subtitulo mb-3">
            Por mesa
          </h2>
          <Tabla filas={resumen.porMesa.map((m) => [`Mesa ${m.mesa}`, String(m.pedidos), pesos(m.total)])} columnas={["Mesa", "Pedidos", "Total"]} />
        </section>
      </div>

      <section className="caja" aria-labelledby="t-lista">
        <h2 id="t-lista" className="panel-subtitulo mb-3">
          Pedidos cobrados
        </h2>
        {resumen.lista.length === 0 ? (
          <p className="tablero-vacio">No hay pedidos cobrados en este rango.</p>
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Cobrado</th>
                  <th scope="col">Pedido</th>
                  <th scope="col">Mesa</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Método</th>
                  <th scope="col" className="numero">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumen.lista.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {desde === hasta ? "" : `${fechaCorta(p.pagadoEn!)} `}
                      {hora(p.pagadoEn!)}
                    </td>
                    <td>
                      <a href={`/admin/imprimir/pedido/${p.id}`} target="_blank" className="underline">
                        #{p.numero}
                      </a>
                    </td>
                    <td>{p.mesaNumero}</td>
                    <td>{p.cliente}</td>
                    <td>{p.metodoPago}</td>
                    <td className="numero">{pesos(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tabla({ columnas, filas }: { columnas: string[]; filas: string[][] }) {
  if (filas.length === 0) return <p className="panel-texto-suave">Sin datos.</p>;
  return (
    <div className="tabla-envoltura">
      <table className="tabla">
        <thead>
          <tr>
            {columnas.map((c, i) => (
              <th key={c} scope="col" className={i > 0 ? "numero" : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila[0]}>
              {fila.map((celda, i) => (
                <td key={i} className={i > 0 ? "numero" : undefined}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
