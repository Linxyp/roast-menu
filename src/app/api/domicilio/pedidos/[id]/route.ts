import { respuestaError } from "@/server/errores";
import { pedidoDomicilio } from "@/server/pedidos";

/** Estado de un domicilio para el cliente que lo pidió (sin su teléfono ni su dirección). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return Response.json(await pedidoDomicilio(id));
  } catch (error) {
    return respuestaError(error);
  }
}
