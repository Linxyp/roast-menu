import { respuestaError } from "@/server/errores";
import { pedidoDeMesa } from "@/server/pedidos";

/** Estado de un pedido para el cliente que lo hizo (solo si es de esa mesa). */
export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string; id: string }> }) {
  try {
    const { codigo, id } = await params;
    return Response.json(await pedidoDeMesa(codigo, id));
  } catch (error) {
    return respuestaError(error);
  }
}
