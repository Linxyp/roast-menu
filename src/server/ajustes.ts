import "server-only";
import { z } from "zod";
import type { DomicilioDTO } from "@/lib/carta";
import { cobroDomicilio } from "@/lib/pedido";
import { db } from "./db";
import { ErrorNegocio } from "./errores";

/** Ajustes del negocio (una sola fila; se crea con valores por defecto la primera vez). */
export async function leerAjustes() {
  const ajustes = await db.ajustes.findUnique({ where: { id: 1 } });
  if (ajustes) return ajustes;
  // INSERT … ON CONFLICT DO NOTHING: dos peticiones simultáneas no chocan al crearla.
  await db.ajustes.createMany({ data: [{ id: 1 }], skipDuplicates: true });
  return db.ajustes.findUniqueOrThrow({ where: { id: 1 } });
}

export type Ajustes = Awaited<ReturnType<typeof leerAjustes>>;

const pesosDomicilio = z.number().int().min(0, "El valor del domicilio no puede ser negativo.").max(1_000_000).nullable();

const esquemaAjustes = z
  .object({
    nombreNegocio: z.string().trim().min(1, "Escribe el nombre del negocio.").max(60),
    pieRecibo: z.string().trim().max(120),
    anchoRecibo: z.union([z.literal(58), z.literal(80)]),
    metodosPago: z
      .array(z.string().trim().min(1).max(30))
      .min(1, "Deja al menos un método de pago.")
      .max(10, "Máximo 10 métodos de pago."),
    recibiendoPedidos: z.boolean(),
    direccion: z.string().trim().max(120),
    horario: z.string().trim().max(120),
    instagram: z
      .string()
      .trim()
      .max(40)
      .transform((v) => v.replace(/^@/, "")),
    domiciliosActivos: z.boolean(),
    costoDomicilio: pesosDomicilio,
    /** Valor más alto, si el domicilio cambia según la distancia (vacío o igual = valor fijo). */
    costoDomicilioMaximo: pesosDomicilio.default(null),
    pedidoMinimoDomicilio: z.number().int().min(0, "El pedido mínimo no puede ser negativo.").max(5_000_000),
    zonaDomicilio: z.string().trim().max(160, "La zona de domicilios es muy larga."),
    telefonoNegocio: z.string().trim().max(30, "El teléfono es muy largo."),
  })
  .superRefine((a, ctx) => {
    if (a.costoDomicilioMaximo === null) return;
    if (a.costoDomicilio === null) {
      ctx.addIssue({ code: "custom", message: "Escribe desde cuánto vale el domicilio, no solo hasta cuánto." });
    } else if (a.costoDomicilioMaximo < a.costoDomicilio) {
      ctx.addIssue({ code: "custom", message: "El valor «hasta» del domicilio no puede ser menor que el valor «desde»." });
    }
  })
  // Un rango de un solo valor es un valor fijo.
  .transform((a) => (a.costoDomicilioMaximo === a.costoDomicilio ? { ...a, costoDomicilioMaximo: null } : a));

export async function guardarAjustes(entrada: unknown) {
  const resultado = esquemaAjustes.safeParse(entrada);
  if (!resultado.success) throw new ErrorNegocio(resultado.error.issues[0]?.message ?? "Revisa los datos.");
  const datos = { ...resultado.data, metodosPago: [...new Set(resultado.data.metodosPago)] };
  await leerAjustes();
  await db.ajustes.update({ where: { id: 1 }, data: datos });
}

/** Condiciones de los domicilios para la página que ve el cliente (sin datos internos). */
export async function datosDomicilio(): Promise<DomicilioDTO> {
  const ajustes = await leerAjustes();
  return {
    activo: ajustes.recibiendoPedidos && ajustes.domiciliosActivos,
    cobro: cobroDomicilio(ajustes.costoDomicilio, ajustes.costoDomicilioMaximo),
    minimo: ajustes.pedidoMinimoDomicilio,
    zona: ajustes.zonaDomicilio,
    telefono: ajustes.telefonoNegocio,
    metodosPago: ajustes.metodosPago,
  };
}

export async function cambiarRecepcion(recibiendoPedidos: boolean) {
  await leerAjustes();
  await db.ajustes.update({ where: { id: 1 }, data: { recibiendoPedidos } });
}
