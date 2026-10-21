import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { BotonImprimir } from "@/components/BotonImprimir";
import { Foto } from "@/components/Foto";
import { ListaConPuntos } from "@/components/ListaConPuntos";
import { CATEGORIAS } from "@/data/menu";
import { NEGOCIO } from "@/data/negocio";
import { ruta } from "@/lib/ruta";
import { normalizarUrlPublica } from "@/lib/url";

export const metadata: Metadata = {
  title: "Código QR del menú · ROAST",
  robots: { index: false, follow: false },
};

/** Lee el QR que dejó scripts/generar-qr.mjs (al compilar con la URL pública). */
function leerQR(): { url: string; svg: string } | null {
  try {
    const carpeta = path.join(process.cwd(), "public", "qr");
    const info = JSON.parse(readFileSync(path.join(carpeta, "qr.json"), "utf8")) as { url?: string };
    const svg = readFileSync(path.join(carpeta, "roast-menu-qr.svg"), "utf8");
    return info.url ? { url: info.url, svg } : null;
  } catch {
    return null;
  }
}

export default function PaginaQR() {
  const urlPublica = normalizarUrlPublica(NEGOCIO.urlPublica);
  const qr = leerQR();
  // Solo se muestra un QR que apunte exactamente a la URL con que se publicó este sitio.
  const vigente = qr !== null && urlPublica !== "" && qr.url === urlPublica;
  const urlVisible = urlPublica.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <main className="qr-pagina">
      {vigente ? (
        <div className="grid justify-items-center gap-6">
          <article className="qr-tarjeta" aria-labelledby="titulo-qr">
            <Foto id="logo-roast" alt="ROAST Hamburguesas Artesanales" sizes="220px" prioridad className="h-auto w-52" />
            <h1 id="titulo-qr" className="font-display text-xl font-semibold tracking-[0.18em] text-oro-300 uppercase">
              Escanea y mira la carta
            </h1>
            <div
              className="qr-codigo"
              role="img"
              aria-label={`Código QR que abre la carta: ${qr.url}`}
              dangerouslySetInnerHTML={{ __html: qr.svg }}
            />
            <p className="font-display text-sm tracking-[0.14em] text-balance text-crema/80 uppercase">
              <ListaConPuntos items={CATEGORIAS.map((categoria) => categoria.nombre)} />
            </p>
            <p className="text-sm break-all text-crema/80">{urlVisible}</p>
          </article>
          <div className="no-imprimir flex flex-wrap justify-center gap-3">
            <BotonImprimir />
            <a className="boton-secundario" href={ruta("/qr/roast-menu-qr.svg")} download>
              Descargar SVG
            </a>
            <a className="boton-secundario" href={ruta("/qr/roast-menu-qr.png")} download>
              Descargar PNG
            </a>
          </div>
        </div>
      ) : (
        <div className="grid max-w-md justify-items-center gap-4 text-center">
          <Foto id="logo-roast" alt="ROAST Hamburguesas Artesanales" sizes="220px" className="h-auto w-52" />
          <h1 className="font-display text-2xl font-semibold uppercase">El QR aún no está generado</h1>
          <p className="text-crema/80">
            El código QR se crea al publicar la carta en su dirección definitiva, para que apunte siempre a la URL
            real. Vea «Publicar» en el README del proyecto.
          </p>
        </div>
      )}
    </main>
  );
}
