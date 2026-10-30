import { huellaIp } from "@/server/crypto";
import { respuestaError } from "@/server/errores";
import { exigirLimite, LIMITES } from "@/server/limite";
import { crearPedido } from "@/server/pedidos";
import { ipCliente } from "@/server/solicitud";

/** Pedido enviado desde el QR de una mesa. Los precios los calcula el servidor. */
export async function POST(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  try {
    const { codigo } = await params;
    const aviso = "Se enviaron muchos pedidos seguidos desde aquí. Espera unos minutos o pide ayuda al personal.";
    await exigirLimite(`pedido:mesa:${codigo}`, LIMITES.pedidoPorMesa, aviso);
    await exigirLimite(`pedido:ip:${huellaIp(await ipCliente())}`, LIMITES.pedidoPorIp, aviso);
    const entrada = await request.json().catch(() => null);
    const pedido = await crearPedido(codigo, entrada);
    return Response.json(pedido, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}
