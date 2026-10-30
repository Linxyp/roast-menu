import { db } from "@/server/db";

/** Estado para el monitoreo y el healthcheck de Docker. No expone datos. */
export async function GET() {
  const inicio = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ estado: "ok", base: "ok", ms: Date.now() - inicio, hora: new Date().toISOString() });
  } catch {
    return Response.json({ estado: "error", base: "no disponible" }, { status: 503 });
  }
}
