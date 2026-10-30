import { db } from "@/server/db";

async function leerFoto(id: string, archivo: string): Promise<Uint8Array | null> {
  if (archivo === "grande.webp") {
    return (await db.imagen.findUnique({ where: { id }, select: { grande: true } }))?.grande ?? null;
  }
  return (await db.imagen.findUnique({ where: { id }, select: { mini: true } }))?.mini ?? null;
}

/** Fotos de la carta guardadas en la base (WebP). Cada foto nueva tiene id nuevo: se cachean para siempre. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; archivo: string }> }) {
  const { id, archivo } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id) || (archivo !== "grande.webp" && archivo !== "mini.webp")) {
    return new Response("No encontrado", { status: 404 });
  }
  const datos = await leerFoto(id, archivo);
  if (!datos) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(datos), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
