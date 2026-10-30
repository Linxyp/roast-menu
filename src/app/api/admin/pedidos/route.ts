import { leerAjustes } from "@/server/ajustes";
import { requerirApi } from "@/server/auth/acceso";
import { respuestaError } from "@/server/errores";
import { pedidosAbiertos } from "@/server/pedidos";

export const dynamic = "force-dynamic";

/** Pedidos abiertos para el tablero (sin entregar o sin cobrar). */
export async function GET() {
  try {
    await requerirApi();
    const [pedidos, ajustes] = await Promise.all([pedidosAbiertos(), leerAjustes()]);
    return Response.json({ pedidos, metodosPago: ajustes.metodosPago, recibiendoPedidos: ajustes.recibiendoPedidos });
  } catch (error) {
    return respuestaError(error);
  }
}
