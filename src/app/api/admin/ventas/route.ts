import { diaColombia, fechaCorta, hora } from "@/lib/formato";
import { requerirApi } from "@/server/auth/acceso";
import { respuestaError } from "@/server/errores";
import { resumenVentas } from "@/server/ventas";

export const dynamic = "force-dynamic";

const esDia = (valor: string | null): valor is string => Boolean(valor && /^\d{4}-\d{2}-\d{2}$/.test(valor));

/** Ventas cobradas en CSV (se abre en Excel con tildes: separador «;» y BOM UTF-8). */
export async function GET(request: Request) {
  try {
    await requerirApi();
    const url = new URL(request.url);
    const hasta = esDia(url.searchParams.get("hasta")) ? url.searchParams.get("hasta")! : diaColombia();
    const desdeParam = url.searchParams.get("desde");
    const desde = esDia(desdeParam) && desdeParam <= hasta ? desdeParam : hasta;
    const resumen = await resumenVentas(desde, hasta);
    const celda = (valor: string | number) => {
      const texto = String(valor);
      return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const filas = [
      ["Fecha", "Hora", "Pedido", "Mesa", "Cliente", "Productos", "Método de pago", "Total"],
      ...resumen.lista.map((p) => [
        fechaCorta(p.pagadoEn!),
        hora(p.pagadoEn!),
        p.numero,
        p.mesaNumero,
        p.cliente,
        p.items.map((i) => `${i.cantidad} x ${i.nombre}`).join(" | "),
        p.metodoPago ?? "",
        p.total,
      ]),
    ];
    const csv = "﻿" + filas.map((fila) => fila.map(celda).join(";")).join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ventas-roast-${desde}${desde === hasta ? "" : `-a-${hasta}`}.csv"`,
      },
    });
  } catch (error) {
    return respuestaError(error);
  }
}
