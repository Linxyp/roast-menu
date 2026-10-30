import "server-only";
import { z } from "zod";
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

const esquemaAjustes = z.object({
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
});

export async function guardarAjustes(entrada: unknown) {
  const resultado = esquemaAjustes.safeParse(entrada);
  if (!resultado.success) throw new ErrorNegocio(resultado.error.issues[0]?.message ?? "Revisa los datos.");
  const datos = { ...resultado.data, metodosPago: [...new Set(resultado.data.metodosPago)] };
  await leerAjustes();
  await db.ajustes.update({ where: { id: 1 }, data: datos });
}

export async function cambiarRecepcion(recibiendoPedidos: boolean) {
  await leerAjustes();
  await db.ajustes.update({ where: { id: 1 }, data: { recibiendoPedidos } });
}
