import Link from "next/link";
import QRCode from "qrcode";
import { BotonImprimir } from "@/components/panel/BotonImprimir";
import { IconoAtras } from "@/components/Iconos";
import { requerirPagina } from "@/server/auth/acceso";
import { listarMesas, urlDomicilio, urlMesa } from "@/server/mesas";
import "./qr.css";

export const metadata = { title: "Códigos QR de las mesas" };

// Nivel Q: el código se sigue leyendo aunque el impreso se manche o se arrugue un poco.
const OPCIONES_QR = { type: "svg", errorCorrectionLevel: "Q", margin: 1, color: { dark: "#000000", light: "#ffffff" } } as const;

/** Tarjetas imprimibles con el QR de cada mesa (todas, o una con ?mesa=<id>) o el de domicilios (?domicilio=1). */
export default async function PaginaQrMesas({ searchParams }: { searchParams: Promise<{ mesa?: string; domicilio?: string }> }) {
  await requerirPagina("ADMIN");
  const { mesa: soloUna, domicilio } = await searchParams;
  if (domicilio) return <QrDomicilio />;
  const mesas = (await listarMesas()).filter((m) => (soloUna ? m.id === soloUna : m.activa));
  const tarjetas = await Promise.all(
    mesas.map(async (m) => {
      const url = urlMesa(m.codigo);
      const svg = await QRCode.toString(url, OPCIONES_QR);
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
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/mesas/qr?domicilio=1" className="boton-panel">
              QR de domicilios
            </Link>
            <BotonImprimir texto="Imprimir" />
          </div>
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

/** El QR de domicilios: para volantes, empaques y la vitrina. En redes va la dirección (en el celular se toca, no se escanea). */
async function QrDomicilio() {
  const url = urlDomicilio();
  const svg = await QRCode.toString(url, OPCIONES_QR);
  return (
    <>
      <div className="no-imprimir mb-5 grid gap-3">
        <Link href="/admin/mesas/qr" className="boton-texto inline-flex items-center gap-1 px-0">
          <IconoAtras className="size-4" /> QR de las mesas
        </Link>
        <div className="panel-cabecera mb-0">
          <div>
            <h1 className="panel-titulo">Código QR de domicilios</h1>
            <p className="panel-texto-suave mt-1">
              Abre la carta para pedir a domicilio. Imprímelo en volantes, empaques o la vitrina. En redes sociales y WhatsApp
              comparte mejor la dirección de abajo: en el celular se toca, no se escanea.
            </p>
          </div>
          <BotonImprimir texto="Imprimir" />
        </div>
      </div>
      <div className="qr-hoja">
        <article className="qr-tarjeta-mesa qr-tarjeta-domicilio" aria-label="Código QR de domicilios">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-roast-446.webp" alt="ROAST Hamburguesas Artesanales" width={446} height={233} className="qr-logo" />
          <p className="qr-mesa">A domicilio</p>
          <div className="qr-codigo" role="img" aria-label={`QR que abre la carta para pedir a domicilio: ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="qr-instruccion">
            Escanea, arma tu pedido <span className="whitespace-nowrap">y te lo llevamos</span>
          </p>
        </article>
      </div>
      <p className="panel-texto-suave no-imprimir mt-4">
        Dirección para redes sociales y WhatsApp:{" "}
        <a className="underline" href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      </p>
    </>
  );
}
