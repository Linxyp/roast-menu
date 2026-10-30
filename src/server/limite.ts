import "server-only";
import { db } from "./db";
import { ErrorNegocio } from "./errores";

/**
 * Límite de intentos por ventana fija guardado en PostgreSQL: el incremento es una
 * sola sentencia INSERT … ON CONFLICT … RETURNING (atómica).
 */
export const LIMITES = {
  ingresoPorIp: { limite: 20, segundos: 15 * 60 },
  ingresoPorUsuario: { limite: 8, segundos: 15 * 60 },
  // Una mesa grande puede enviar varios pedidos (uno por persona); esto solo frena abusos.
  pedidoPorMesa: { limite: 30, segundos: 10 * 60 },
  // Holgado: con el wifi del restaurante, todos los celulares salen con la misma IP.
  pedidoPorIp: { limite: 60, segundos: 10 * 60 },
} as const;

export async function contarIntento(clave: string, regla: { limite: number; segundos: number }): Promise<boolean> {
  const filas = await db.$queryRaw<{ conteo: number }[]>`
    INSERT INTO "LimiteTasa" ("clave", "conteo", "expiraEn")
    VALUES (${clave}, 1, now() + make_interval(secs => ${regla.segundos}))
    ON CONFLICT ("clave") DO UPDATE SET
      "conteo" = CASE WHEN "LimiteTasa"."expiraEn" < now() THEN 1 ELSE "LimiteTasa"."conteo" + 1 END,
      "expiraEn" = CASE WHEN "LimiteTasa"."expiraEn" < now() THEN EXCLUDED."expiraEn" ELSE "LimiteTasa"."expiraEn" END
    RETURNING "conteo"`;
  return (filas[0]?.conteo ?? 1) <= regla.limite;
}

export async function exigirLimite(clave: string, regla: { limite: number; segundos: number }, mensaje: string) {
  if (!(await contarIntento(clave, regla))) throw new ErrorNegocio(mensaje, 429);
}

export async function reiniciarLimite(clave: string) {
  await db.limiteTasa.deleteMany({ where: { clave } });
}
