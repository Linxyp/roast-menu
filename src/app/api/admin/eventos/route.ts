import { requerirApi } from "@/server/auth/acceso";
import { respuestaError } from "@/server/errores";
import { escucharPedidos } from "@/server/eventos";

export const dynamic = "force-dynamic";

/** Avisos en vivo para el panel (Server-Sent Events): pedidos nuevos y cambios de estado. */
export async function GET(request: Request) {
  try {
    await requerirApi();
  } catch (error) {
    return respuestaError(error);
  }
  const codificador = new TextEncoder();
  let terminar = () => {};
  const flujo = new ReadableStream<Uint8Array>({
    start(controlador) {
      let abierto = true;
      const enviar = (texto: string) => {
        if (!abierto) return;
        try {
          controlador.enqueue(codificador.encode(texto));
        } catch {
          terminar();
        }
      };
      enviar("retry: 3000\n\n");
      enviar("event: hola\ndata: {}\n\n");
      const dejarDeEscuchar = escucharPedidos((evento) => enviar(`data: ${JSON.stringify(evento)}\n\n`));
      // Comentario cada 25 s: mantiene viva la conexión a través de proxies.
      const latido = setInterval(() => enviar(": latido\n\n"), 25_000);
      terminar = () => {
        if (!abierto) return;
        abierto = false;
        dejarDeEscuchar();
        clearInterval(latido);
        try {
          controlador.close();
        } catch {
          // ya cerrado
        }
      };
      request.signal.addEventListener("abort", terminar);
    },
    cancel() {
      terminar();
    },
  });
  return new Response(flujo, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
