import "server-only";
import { z } from "zod";

// Mensajes de validación en español cuando un esquema no trae uno propio.
z.config(z.locales.es());

/** Error de negocio con un mensaje apto para mostrarle al usuario (en español). */
export class ErrorNegocio extends Error {
  constructor(
    message: string,
    readonly estado = 400,
    readonly campos: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ErrorNegocio";
  }
}

export const noEncontrado = (que = "El registro") => new ErrorNegocio(`${que} no existe o ya no está disponible.`, 404);

/** Respuesta JSON para las rutas de API a partir de cualquier error. */
export function respuestaError(error: unknown): Response {
  if (error instanceof ErrorNegocio) {
    return Response.json({ error: error.message, campos: error.campos }, { status: error.estado });
  }
  console.error(error);
  return Response.json({ error: "Algo salió mal. Intenta de nuevo en un momento." }, { status: 500 });
}
