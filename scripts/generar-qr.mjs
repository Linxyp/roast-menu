// Genera el código QR del menú para su URL pública real y comprueba que se lea bien.
//
//   npm run qr -- https://mi-dominio.com/                       QR para esa URL
//   npm run qr -- https://mi-dominio.com/ --verificar-en-linea  además confirma que la URL ya muestra el menú
//
// Sin argumento usa NEXT_PUBLIC_SITE_URL (así lo hace la publicación automática). Deja en public/qr/:
// roast-menu-qr.svg (para imprenta), roast-menu-qr.png (1200 px) y qr.json (la URL que contiene).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import QRCode from "qrcode";
import { normalizarUrlPublica } from "../src/lib/url.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA = path.join(RAIZ, "public", "qr");
// Nivel Q: el código se sigue leyendo aunque el impreso se manche o se arrugue un poco.
const OPCIONES = { errorCorrectionLevel: "Q", margin: 2, color: { dark: "#0b0a08", light: "#ffffff" } };
const leer = jsQR.default ?? jsQR;

/** Lee el contenido de un QR en PNG. */
export function leerQR(png) {
  const imagen = PNG.sync.read(png);
  const pixeles = new Uint8ClampedArray(imagen.data.buffer, imagen.data.byteOffset, imagen.data.length);
  return leer(pixeles, imagen.width, imagen.height)?.data ?? null;
}

export async function generarQR(url, carpeta = CARPETA) {
  const svg = await QRCode.toString(url, { ...OPCIONES, type: "svg" });
  const png = await QRCode.toBuffer(url, { ...OPCIONES, type: "png", width: 1200 });
  const leido = leerQR(png);
  if (leido !== url) throw new Error(`El QR generado no se lee igual: «${leido}» en vez de «${url}»`);

  mkdirSync(carpeta, { recursive: true });
  writeFileSync(path.join(carpeta, "roast-menu-qr.svg"), svg);
  writeFileSync(path.join(carpeta, "roast-menu-qr.png"), png);
  writeFileSync(path.join(carpeta, "qr.json"), `${JSON.stringify({ url, generado: new Date().toISOString() }, null, 2)}\n`);
  return { svg, png };
}

async function verificarEnLinea(url) {
  const respuesta = await fetch(url, { redirect: "follow" });
  if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}: publique primero el sitio.`);
  if (!(await respuesta.text()).includes("ROAST")) throw new Error(`${url} responde, pero no muestra el menú de ROAST.`);
}

const comoComando = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (comoComando) {
  const argumento = process.argv.slice(2).find((valor) => !valor.startsWith("--"));
  const url = normalizarUrlPublica(argumento ?? process.env.NEXT_PUBLIC_SITE_URL);
  if (!url) {
    if (argumento) {
      console.error(`✖ URL no válida: ${argumento}`);
      process.exit(1);
    }
    // Al compilar sin URL se borra cualquier QR anterior: nunca se publica uno que apunte a otra dirección.
    if (process.argv.includes("--al-compilar")) rmSync(CARPETA, { recursive: true, force: true });
    console.log("ℹ Sin URL pública (NEXT_PUBLIC_SITE_URL): no se genera el QR.");
    process.exit(0);
  }
  try {
    if (process.argv.includes("--verificar-en-linea")) await verificarEnLinea(url);
    await generarQR(url);
    console.log(`✔ QR generado y leído de vuelta: ${url} → public/qr/`);
  } catch (error) {
    console.error(`✖ ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
