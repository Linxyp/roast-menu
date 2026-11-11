import { normalizarTelefono } from "@/lib/pedido";
import { huellaIp } from "@/server/crypto";
import { respuestaError } from "@/server/errores";
import { exigirLimite, LIMITES } from "@/server/limite";
import { crearDomicilio } from "@/server/pedidos";
import { ipCliente } from "@/server/solicitud";

/** Pedido a domicilio desde el QR de domicilios. Los precios los calcula el servidor. */
export async function POST(request: Request) {
  try {
    const aviso = "Se enviaron muchos pedidos seguidos. Espera unos minutos o llámanos.";
    await exigirLimite(`domicilio:ip:${huellaIp(await ipCliente())}`, LIMITES.domicilioPorIp, aviso);
    const entrada = (await request.json().catch(() => null)) as { telefono?: unknown } | null;
    const telefono = typeof entrada?.telefono === "string" ? normalizarTelefono(entrada.telefono) : null;
    if (telefono) await exigirLimite(`domicilio:tel:${telefono}`, LIMITES.domicilioPorTelefono, aviso);
    const pedido = await crearDomicilio(entrada);
    return Response.json(pedido, { status: 201 });
  } catch (error) {
    return respuestaError(error);
  }
}
