import { AjustesNegocio } from "@/components/panel/ajustes/AjustesNegocio";
import { CambiarMiClave } from "@/components/panel/ajustes/CambiarMiClave";
import { Usuarios } from "@/components/panel/ajustes/Usuarios";
import { leerAjustes } from "@/server/ajustes";
import { requerirPagina } from "@/server/auth/acceso";
import { listarUsuarios } from "@/server/usuarios";

export const metadata = { title: "Ajustes" };

export default async function PaginaAjustes() {
  const yo = await requerirPagina();
  const esAdmin = yo.rol === "ADMIN";
  const [ajustes, usuarios] = await Promise.all([leerAjustes(), esAdmin ? listarUsuarios() : Promise.resolve([])]);
  return (
    <div className="grid gap-6">
      <div className="panel-cabecera mb-0">
        <h1 className="panel-titulo">Ajustes</h1>
      </div>
      {esAdmin ? (
        <AjustesNegocio
          inicial={{
            nombreNegocio: ajustes.nombreNegocio,
            pieRecibo: ajustes.pieRecibo,
            anchoRecibo: ajustes.anchoRecibo === 58 ? 58 : 80,
            metodosPago: ajustes.metodosPago,
            recibiendoPedidos: ajustes.recibiendoPedidos,
            direccion: ajustes.direccion,
            horario: ajustes.horario,
            instagram: ajustes.instagram,
          }}
        />
      ) : null}
      <section className="caja grid gap-3" aria-labelledby="t-impresora">
        <h2 id="t-impresora" className="panel-subtitulo">
          Impresora de recibos
        </h2>
        <ol className="panel-texto-suave grid list-decimal gap-1.5 pl-5">
          <li>Instala la impresora térmica en el computador del restaurante y déjala como impresora predeterminada.</li>
          <li>Abre este panel en Google Chrome. Al imprimir la primera vez, elige la impresora, márgenes «Ninguno» y desactiva encabezados.</li>
          <li>
            Para que las comandas salgan solas sin preguntar, abre Chrome con la opción <code>--kiosk-printing</code> (en el acceso directo:
            Propiedades → Destino) y activa «Imprimir comandas solas» en Pedidos. Hazlo en un solo equipo para no imprimir doble.
          </li>
        </ol>
      </section>
      {esAdmin ? <Usuarios usuarios={usuarios.map((u) => ({ ...u, creadoEn: u.creadoEn.toISOString() }))} yoId={yo.id} /> : null}
      <CambiarMiClave />
    </div>
  );
}
