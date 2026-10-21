// Sirve la carpeta out/ como lo haría el hosting, para revisar la compilación y correr las pruebas.
// Uso: npm start   (puerto 3521; otro con PORT=xxxx). Respeta NEXT_PUBLIC_BASE_PATH si se compiló con él.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const PUERTO = Number(process.env.PORT) || 3521;
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

if (!existsSync(RAIZ)) {
  console.error("✖ No existe out/: corra primero npm run build");
  process.exit(1);
}

createServer((pedido, respuesta) => {
  let camino = decodeURIComponent(new URL(pedido.url ?? "/", "http://localhost").pathname);
  if (BASE) {
    if (!camino.startsWith(BASE)) {
      respuesta.writeHead(302, { location: `${BASE}/` }).end();
      return;
    }
    camino = camino.slice(BASE.length) || "/";
  }
  let archivo = path.join(RAIZ, path.normalize(camino));
  if (!archivo.startsWith(RAIZ)) {
    respuesta.writeHead(403).end();
    return;
  }
  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = path.join(archivo, "index.html");
  if (!existsSync(archivo)) {
    respuesta.writeHead(404, { "content-type": TIPOS[".html"] });
    createReadStream(path.join(RAIZ, "404.html")).pipe(respuesta);
    return;
  }
  respuesta.writeHead(200, { "content-type": TIPOS[path.extname(archivo)] ?? "application/octet-stream" });
  createReadStream(archivo).pipe(respuesta);
}).listen(PUERTO, () => console.log(`Menú servido en http://localhost:${PUERTO}${BASE}/`));
