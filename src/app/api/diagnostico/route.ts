import { huellaIp } from "@/server/crypto";
import { contarIntento } from "@/server/limite";
import { ipCliente } from "@/server/solicitud";

export const dynamic = "force-dynamic";

/**
 * Reportes de los celulares de los clientes (fetch con keepalive desde la carta): quedan en el
 * registro del servidor con el navegador de quien lo vio. Limitado por IP para que nadie lo llene.
 */
export async function POST(request: Request) {
  const texto = (await request.text()).slice(0, 1500).replace(/\s+/g, " ");
  const dentroDelLimite = await contarIntento(`diagnostico:${huellaIp(await ipCliente())}`, { limite: 20, segundos: 10 * 60 });
  if (dentroDelLimite) console.warn(`[diagnóstico] ${request.headers.get("user-agent") ?? "navegador desconocido"} :: ${texto}`);
  return new Response(null, { status: 204 });
}
