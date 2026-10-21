// Revisa la configuración antes de compilar (npm run build lo corre solo).
// En la publicación automática (CI=true) o con --estricto, si falta la URL pública se detiene todo:
// sin ella no hay QR, y un QR jamás debe apuntar a una dirección equivocada.

import { NEGOCIO } from "../src/data/negocio.ts";
import { normalizarUrlPublica } from "../src/lib/url.ts";

const estricto = process.argv.includes("--estricto") || process.env.CI === "true";
const url = normalizarUrlPublica(NEGOCIO.urlPublica);
let error = "";

if (NEGOCIO.urlPublica && !url) {
  error = `NEXT_PUBLIC_SITE_URL no es una URL válida: «${NEGOCIO.urlPublica}».`;
} else if (estricto && !url) {
  error = "Falta NEXT_PUBLIC_SITE_URL (la URL pública de la carta): sin ella no se genera el QR.";
} else if (estricto && !url.startsWith("https://")) {
  error = `La URL pública debe usar https:// («${url}»).`;
}

if (error) {
  console.error(`✖ ${error}`);
  process.exit(1);
}
if (!url) console.warn("⚠ Sin NEXT_PUBLIC_SITE_URL: compilación de prueba, sin QR ni vista previa al compartir.");
else console.log(`✔ URL pública: ${url}`);
