import Link from "next/link";
import QRCode from "qrcode";
import { BotonImprimir } from "@/components/panel/BotonImprimir";
import { IconoAtras } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { listarMesas, urlMesa } from "@/server/mesas";
import "./qr.css";

export const metadata = { title: "Códigos QR de las mesas" };

/** Tarjetas imprimibles con el QR de cada mesa (todas, o una con ?mesa=<id>). */
export default async function PaginaQrMesas({ searchParams }: { searchParams: Promise<{ mesa?: string }> }) {
  await requerirPagina("ADMIN");
  const { mesa: soloUna } = await searchParams;
  const mesas = (await listarMesas()).filter((m) => (soloUna ? m.id === soloUna : m.activa));
  const tarjetas = await Promise.all(
    mesas.map(async (m) => {
      const url = urlMesa(m.codigo);
      // Nivel Q: el código se sigue leyendo aunque el impreso se manche o se arrugue un poco.
      const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "Q", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
      return { ...m, url, svg };
    }),
  );
  return (
    <>
      <div className="no-imprimir mb-5 grid gap-3">
        <Link href="/admin/mesas/configurar" className="boton-texto inline-flex items-center gap-1 px-0">
          <IconoAtras className="size-4" /> Configurar mesas
        </Link>
        <div className="panel-cabecera mb-0">
          <div>
            <h1 className="panel-titulo">Códigos QR {soloUna && tarjetas[0] ? `· Mesa ${tarjetas[0].numero}` : "de las mesas"}</h1>
            <p className="panel-texto-suave mt-1">Imprime en hoja carta u oficio (6 por hoja), recorta y pon cada uno en su mesa.</p>
          </div>
          <BotonImprimir texto="Imprimir" />
        </div>
      </div>
      <div className="qr-hoja">
        {tarjetas.map((t) => (
          <article key={t.id} className="qr-tarjeta-mesa" aria-label={`Código QR de la mesa ${t.numero}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo-roast-446.webp" alt="ROAST Hamburguesas Artesanales" width={446} height={233} className="qr-logo" />
            <p className="qr-mesa">Mesa {t.numero}</p>
            {t.nombre ? <p className="qr-nombre">{t.nombre}</p> : null}
            <div className="qr-codigo" role="img" aria-label={`QR que abre la carta de la mesa ${t.numero}: ${t.url}`} dangerouslySetInnerHTML={{ __html: t.svg }} />
            <p className="qr-instruccion">Escanea, arma tu pedido y envíalo</p>
          </article>
        ))}
      </div>
      {tarjetas.length === 0 ? <p className="tablero-vacio">No hay mesas activas.</p> : null}
    </>
  );
}
